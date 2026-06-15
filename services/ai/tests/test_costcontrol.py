import time

import pytest
from fastapi.testclient import TestClient

import app.main as main
from app.costcontrol import (
    BudgetExceeded,
    CircuitBreaker,
    CircuitOpen,
    CostControls,
    ResponseCache,
    TokenBudget,
)
from app.providers import resolve_models

client = TestClient(main.app)

DRAFT_BODY = {"kind": "risk_summary", "use_case": {"name": "Budget Test", "risk_tier": "HIGH"}}


def fresh_controls(**kwargs) -> CostControls:
    return CostControls(
        budget=kwargs.get("budget", TokenBudget(daily_limit=0)),
        cache=kwargs.get("cache", ResponseCache(ttl_seconds=3600)),
        breaker=kwargs.get("breaker", CircuitBreaker(threshold=5, cooldown_seconds=60)),
    )


# --- unit: TokenBudget ---


def test_budget_unlimited_by_default() -> None:
    budget = TokenBudget(daily_limit=0)
    budget.check("org1")  # never raises
    budget.consume("org1", 10_000_000)
    budget.check("org1")


def test_budget_enforces_daily_limit_per_org() -> None:
    budget = TokenBudget(daily_limit=100)
    budget.consume("org1", 100)
    with pytest.raises(BudgetExceeded):
        budget.check("org1")
    budget.check("org2")  # other tenants unaffected


# --- unit: CircuitBreaker ---


def test_breaker_opens_after_threshold_and_recovers() -> None:
    breaker = CircuitBreaker(threshold=3, cooldown_seconds=0.05)
    for _ in range(3):
        breaker.allow()
        breaker.record_failure()
    with pytest.raises(CircuitOpen):
        breaker.allow()
    assert breaker.state == "open"
    time.sleep(0.06)
    breaker.allow()  # half-open probe permitted after cooldown
    breaker.record_success()
    assert breaker.state == "closed"


# --- unit: ResponseCache ---


def test_cache_round_trip_and_ttl() -> None:
    cache = ResponseCache(ttl_seconds=3600)
    key = cache.key("org1", "draft", {"a": 1})
    assert cache.get(key) is None
    cache.put(key, "value")
    assert cache.get(key) == "value"
    # different org -> different key
    assert cache.key("org2", "draft", {"a": 1}) != key
    # ttl 0 disables caching entirely
    disabled = ResponseCache(ttl_seconds=0)
    disabled.put(key, "value")
    assert disabled.get(key) is None


# --- unit: model routing ---


def test_model_routing_defaults_and_overrides(monkeypatch) -> None:
    monkeypatch.delenv("ANTHROPIC_MODEL", raising=False)
    monkeypatch.delenv("ANTHROPIC_MODEL_DRAFT", raising=False)
    monkeypatch.delenv("ANTHROPIC_MODEL_SUGGEST", raising=False)
    models = resolve_models()
    assert models["draft"] == "claude-sonnet-4-0"
    assert models["suggest"] == "claude-haiku-4-5"

    monkeypatch.setenv("ANTHROPIC_MODEL_DRAFT", "claude-opus-4-8")
    monkeypatch.setenv("ANTHROPIC_MODEL_SUGGEST", "claude-sonnet-4-6")
    models = resolve_models()
    assert models["draft"] == "claude-opus-4-8"
    assert models["suggest"] == "claude-sonnet-4-6"


# --- unit: empty-string env tolerance (dev .env keyless placeholders) ---


def test_empty_string_env_vars_fall_back_to_defaults(monkeypatch) -> None:
    """The dev .env ships keyless placeholders like `AI_CACHE_TTL_SECONDS=`. A
    present-but-empty value must fall back to the default, not crash on int('')."""
    from app.costcontrol import controls_from_env

    for name in (
        "ANTHROPIC_MODEL",
        "ANTHROPIC_MODEL_DRAFT",
        "ANTHROPIC_MODEL_SUGGEST",
        "AI_DAILY_TOKEN_BUDGET",
        "AI_CACHE_TTL_SECONDS",
        "AI_BREAKER_THRESHOLD",
        "AI_BREAKER_COOLDOWN_SECONDS",
        "AI_BUDGET_REDIS_URL",
    ):
        monkeypatch.setenv(name, "")
    monkeypatch.delenv("REDIS_URL", raising=False)

    controls = controls_from_env()  # must not raise on int("") / float("")
    assert controls.cache.ttl_seconds == 3600
    assert controls.breaker.threshold == 5
    assert controls.breaker.cooldown_seconds == 60.0
    assert controls.budget.daily_limit == 0

    models = resolve_models()
    assert models["draft"] == "claude-sonnet-4-0"
    assert models["suggest"] == "claude-haiku-4-5"


# --- API: cache ---


def test_identical_requests_are_served_from_cache(monkeypatch) -> None:
    monkeypatch.setattr(main, "_controls", fresh_controls())
    first = client.post("/draft", json=DRAFT_BODY, headers={"x-org-id": "org-cache"})
    second = client.post("/draft", json=DRAFT_BODY, headers={"x-org-id": "org-cache"})
    assert first.status_code == 200 and second.status_code == 200
    assert first.headers["x-cache"] == "miss"
    assert second.headers["x-cache"] == "hit"
    # the cached response is byte-identical (same generated_at)
    assert first.json() == second.json()


# --- API: budget ---


def test_budget_exhaustion_returns_429(monkeypatch) -> None:
    monkeypatch.setattr(
        main,
        "_controls",
        fresh_controls(budget=TokenBudget(daily_limit=10), cache=ResponseCache(ttl_seconds=0)),
    )
    first = client.post("/draft", json=DRAFT_BODY, headers={"x-org-id": "org-budget"})
    assert first.status_code == 200  # consumes well over 10 tokens
    second = client.post("/draft", json=DRAFT_BODY, headers={"x-org-id": "org-budget"})
    assert second.status_code == 429
    assert "Retry-After" in second.headers
    # another org is unaffected
    other = client.post("/draft", json=DRAFT_BODY, headers={"x-org-id": "org-other"})
    assert other.status_code == 200


# --- API: circuit breaker ---


class FailingProvider:
    name = "failing"
    model = "failing-v1"

    def draft(self, kind, use_case):  # noqa: ANN001
        raise RuntimeError("provider down")

    def suggest_controls(self, use_case, framework):  # noqa: ANN001
        raise RuntimeError("provider down")


def test_breaker_opens_and_fast_fails(monkeypatch) -> None:
    monkeypatch.setattr(main, "_provider", FailingProvider())
    monkeypatch.setattr(
        main,
        "_controls",
        fresh_controls(
            breaker=CircuitBreaker(threshold=2, cooldown_seconds=60),
            cache=ResponseCache(ttl_seconds=0),
        ),
    )
    assert client.post("/draft", json=DRAFT_BODY).status_code == 502
    assert client.post("/draft", json=DRAFT_BODY).status_code == 502
    # breaker now open: fast 503 with Retry-After, provider not called again
    third = client.post("/draft", json=DRAFT_BODY)
    assert third.status_code == 503
    assert "Retry-After" in third.headers


# --- unit: Redis-backed budget (B10) ---


def test_redis_budget_enforces_limit_across_instances(monkeypatch) -> None:
    import fakeredis

    from app.costcontrol import RedisTokenBudget

    fake = fakeredis.FakeRedis(decode_responses=True)
    monkeypatch.setattr("redis.Redis.from_url", staticmethod(lambda url, **kw: fake))

    a = RedisTokenBudget(daily_limit=100, redis_url="redis://fake")
    b = RedisTokenBudget(daily_limit=100, redis_url="redis://fake")  # second "replica"
    a.consume("org1", 60)
    b.consume("org1", 50)  # shared counter crosses the limit
    with pytest.raises(BudgetExceeded):
        a.check("org1")
    b.check("org2")  # other orgs unaffected
