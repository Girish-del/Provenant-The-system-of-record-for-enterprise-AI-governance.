"""Aegis AI service (FastAPI). Internal-only: drafts documents and suggests controls
for AI use cases, with provenance on every response. Output is advisory, never
auto-applied. Not internet-reachable in production (see docs/05 security model)."""

from __future__ import annotations

import logging
import os

from fastapi import Depends, FastAPI, Header, HTTPException

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

app = FastAPI(title="Aegis AI Service", version="0.1.0")
_provider = get_provider()


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


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", provider=_provider.name, model=_provider.model)


@app.post("/draft", response_model=DraftResponse, dependencies=[Depends(require_internal)])
def draft(req: DraftRequest) -> DraftResponse:
    content = _provider.draft(req.kind, req.use_case)
    prov = make_provenance(_provider, sources=["EU AI Act (Regulation (EU) 2024/1689)"])
    log_provenance("draft", req.use_case.name, prov)
    return DraftResponse(content=content, provenance=prov)


@app.post(
    "/suggest-controls",
    response_model=SuggestControlsResponse,
    dependencies=[Depends(require_internal)],
)
def suggest_controls(req: SuggestControlsRequest) -> SuggestControlsResponse:
    suggestions = _provider.suggest_controls(req.use_case, req.framework)
    prov = make_provenance(_provider, sources=["EU AI Act high-risk obligations (Arts 9-15, 50)"])
    log_provenance("suggest_controls", req.use_case.name, prov)
    return SuggestControlsResponse(suggestions=suggestions, provenance=prov)
