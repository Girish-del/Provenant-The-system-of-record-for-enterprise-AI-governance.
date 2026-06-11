"""Aegis AI service (FastAPI). Internal-only: drafts documents and suggests controls
for AI use cases, with provenance on every response. Output is advisory, never
auto-applied. Not internet-reachable in production (see docs/05 security model).

Cost controls (M16): per-org daily token budgets (429 when exhausted), response
caching (identical requests within the TTL cost nothing), and a circuit breaker
(fast 503 while the upstream provider is failing). Tune via AI_DAILY_TOKEN_BUDGET,
AI_CACHE_TTL_SECONDS, AI_BREAKER_THRESHOLD, AI_BREAKER_COOLDOWN_SECONDS."""

from __future__ import annotations

import logging
import os

from fastapi import Depends, FastAPI, Header, HTTPException, Response

from .costcontrol import BudgetExceeded, CircuitOpen, controls_from_env, estimate_tokens
from .providers import get_provider, make_provenance
from .provenance import log_provenance
from .schemas import (
    DraftRequest,
    DraftResponse,
    HealthResponse,
    SuggestControlsRequest,
    SuggestControlsResponse,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("aegis.ai")

app = FastAPI(title="Aegis AI Service", version="0.2.0")
_provider = get_provider()
_controls = controls_from_env()


def require_internal(x_internal_token: str | None = Header(default=None)) -> None:
    """Gate the internal API to the core service. If a token is configured, require a
    matching header. In production a token is mandatory: if it is missing, refuse all
    calls (fail closed) rather than running open."""
    token = os.environ.get("INTERNAL_API_TOKEN")
    if not token:
        if os.environ.get("APP_ENV", "development").lower() == "production":
            raise HTTPException(status_code=503, detail="internal token not configured")
        return
    if x_internal_token != token:
        raise HTTPException(status_code=401, detail="internal token required")


def _guarded_call(org_id: str, endpoint: str, payload: dict, produce):
    """Shared cost-control flow: breaker -> cache -> budget -> provider call.
    Cache hits cost nothing; provider failures trip the breaker."""
    try:
        _controls.breaker.allow()
    except CircuitOpen as exc:
        raise HTTPException(
            status_code=503,
            detail="AI provider temporarily unavailable",
            headers={"Retry-After": str(int(exc.retry_after) + 1)},
        ) from exc

    cache_key = _controls.cache.key(org_id, endpoint, payload)
    cached = _controls.cache.get(cache_key)
    if cached is not None:
        return cached, True

    try:
        _controls.budget.check(org_id)
    except BudgetExceeded as exc:
        raise HTTPException(
            status_code=429,
            detail=f"daily AI token budget exhausted ({exc.used}/{exc.budget})",
            headers={"Retry-After": "3600"},
        ) from exc

    try:
        result, spent_text = produce()
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001 - any provider failure feeds the breaker
        _controls.breaker.record_failure()
        logger.error("provider call failed (%s): %s", endpoint, exc)
        raise HTTPException(status_code=502, detail="AI provider error") from exc

    _controls.breaker.record_success()
    _controls.budget.consume(org_id, estimate_tokens(spent_text))
    _controls.cache.put(cache_key, result)
    return result, False


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", provider=_provider.name, model=_provider.model)


@app.post("/draft", response_model=DraftResponse, dependencies=[Depends(require_internal)])
def draft(
    req: DraftRequest,
    response: Response,
    x_org_id: str = Header(default="anon"),
) -> DraftResponse:
    def produce() -> tuple[DraftResponse, str]:
        content = _provider.draft(req.kind, req.use_case)
        prov = make_provenance(_provider, sources=["EU AI Act (Regulation (EU) 2024/1689)"])
        log_provenance("draft", req.use_case.name, prov)
        return DraftResponse(content=content, provenance=prov), content

    result, cached = _guarded_call(x_org_id, "draft", req.model_dump(), produce)
    response.headers["X-Cache"] = "hit" if cached else "miss"
    return result


@app.post(
    "/suggest-controls",
    response_model=SuggestControlsResponse,
    dependencies=[Depends(require_internal)],
)
def suggest_controls(
    req: SuggestControlsRequest,
    response: Response,
    x_org_id: str = Header(default="anon"),
) -> SuggestControlsResponse:
    def produce() -> tuple[SuggestControlsResponse, str]:
        suggestions = _provider.suggest_controls(req.use_case, req.framework)
        prov = make_provenance(
            _provider, sources=["EU AI Act high-risk obligations (Arts 9-15, 50)"]
        )
        log_provenance("suggest_controls", req.use_case.name, prov)
        result = SuggestControlsResponse(suggestions=suggestions, provenance=prov)
        return result, " ".join(s.rationale for s in suggestions) or "none"

    result, cached = _guarded_call(x_org_id, "suggest-controls", req.model_dump(), produce)
    response.headers["X-Cache"] = "hit" if cached else "miss"
    return result
