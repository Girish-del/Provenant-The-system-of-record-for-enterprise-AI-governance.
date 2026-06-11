"""Cost controls for the AI service: per-org daily token budgets, response
caching, and a circuit breaker. This is how AI-SaaS margins survive — bound the
spend per tenant, never pay twice for the same request, and fail fast when the
upstream provider is down instead of queueing doomed (billable) retries."""

from __future__ import annotations

import hashlib
import json
import os
import time
from collections import OrderedDict
from dataclasses import dataclass, field
from datetime import datetime, timezone


def estimate_tokens(text: str) -> int:
    """Cheap, provider-agnostic estimate (~4 chars/token) plus prompt overhead."""
    return len(text) // 4 + 50


class BudgetExceeded(Exception):
    def __init__(self, org_id: str, used: int, budget: int) -> None:
        self.org_id = org_id
        self.used = used
        self.budget = budget
        super().__init__(f"org {org_id} exceeded daily AI token budget ({used}/{budget})")


@dataclass
class TokenBudget:
    """Per-org, per-UTC-day token budget. 0 = unlimited (dev default)."""

    daily_limit: int = 0
    _used: dict[tuple[str, str], int] = field(default_factory=dict)

    @staticmethod
    def _today() -> str:
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")

    def used(self, org_id: str) -> int:
        return self._used.get((org_id, self._today()), 0)

    def check(self, org_id: str) -> None:
        if self.daily_limit <= 0:
            return
        used = self.used(org_id)
        if used >= self.daily_limit:
            raise BudgetExceeded(org_id, used, self.daily_limit)

    def consume(self, org_id: str, tokens: int) -> None:
        if self.daily_limit <= 0:
            return
        key = (org_id, self._today())
        self._used[key] = self._used.get(key, 0) + tokens


@dataclass
class ResponseCache:
    """TTL + LRU cache keyed by (org, endpoint, canonical request). Identical
    requests within the TTL are served without a provider call or budget spend."""

    ttl_seconds: int = 3600
    max_entries: int = 256
    _store: OrderedDict[str, tuple[float, object]] = field(default_factory=OrderedDict)

    @staticmethod
    def key(org_id: str, endpoint: str, payload: dict) -> str:
        canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(f"{org_id}|{endpoint}|{canonical}".encode()).hexdigest()

    def get(self, key: str) -> object | None:
        if self.ttl_seconds <= 0:
            return None
        entry = self._store.get(key)
        if entry is None:
            return None
        stored_at, value = entry
        if time.monotonic() - stored_at > self.ttl_seconds:
            del self._store[key]
            return None
        self._store.move_to_end(key)
        return value

    def put(self, key: str, value: object) -> None:
        if self.ttl_seconds <= 0:
            return
        self._store[key] = (time.monotonic(), value)
        self._store.move_to_end(key)
        while len(self._store) > self.max_entries:
            self._store.popitem(last=False)


class CircuitOpen(Exception):
    def __init__(self, retry_after: float) -> None:
        self.retry_after = retry_after
        super().__init__(f"AI provider circuit open; retry in {retry_after:.0f}s")


@dataclass
class CircuitBreaker:
    """Opens after N consecutive provider failures; fast-fails during the
    cooldown so callers are not billed for doomed retries; closes on success."""

    threshold: int = 5
    cooldown_seconds: float = 60.0
    _consecutive_failures: int = 0
    _opened_at: float | None = None

    def allow(self) -> None:
        if self._opened_at is None:
            return
        elapsed = time.monotonic() - self._opened_at
        if elapsed < self.cooldown_seconds:
            raise CircuitOpen(self.cooldown_seconds - elapsed)
        # Half-open: let the next call probe the provider.
        self._opened_at = None
        self._consecutive_failures = 0

    def record_success(self) -> None:
        self._consecutive_failures = 0
        self._opened_at = None

    def record_failure(self) -> None:
        self._consecutive_failures += 1
        if self._consecutive_failures >= self.threshold:
            self._opened_at = time.monotonic()

    @property
    def state(self) -> str:
        return "open" if self._opened_at is not None else "closed"


@dataclass
class CostControls:
    budget: TokenBudget
    cache: ResponseCache
    breaker: CircuitBreaker


def controls_from_env() -> CostControls:
    return CostControls(
        budget=TokenBudget(daily_limit=int(os.environ.get("AI_DAILY_TOKEN_BUDGET", "0"))),
        cache=ResponseCache(ttl_seconds=int(os.environ.get("AI_CACHE_TTL_SECONDS", "3600"))),
        breaker=CircuitBreaker(
            threshold=int(os.environ.get("AI_BREAKER_THRESHOLD", "5")),
            cooldown_seconds=float(os.environ.get("AI_BREAKER_COOLDOWN_SECONDS", "60")),
        ),
    )
