"""Environment helpers that treat an empty-string value the same as unset.

The dev `.env` ships keyless placeholders (e.g. `AI_CACHE_TTL_SECONDS=`). A bare
`os.environ.get(name, default)` returns `""` for those — the key exists — so the
default never applies and `int("")` / `float("")` raise at import time, taking the
whole service down. These helpers fall back to the default when the value is
missing, blank, or unparseable, matching the empty-string-tolerant env handling on
the Node side (see `packages/config/src/env.ts`)."""

from __future__ import annotations

import os


def env_str(name: str, default: str) -> str:
    """Return the env var, or `default` when it is unset or blank."""
    value = os.environ.get(name)
    return value if value else default


def env_int(name: str, default: int) -> int:
    """Return the env var as an int, or `default` when unset/blank/unparseable."""
    value = os.environ.get(name)
    if value is None or value.strip() == "":
        return default
    try:
        return int(value)
    except ValueError:
        return default


def env_float(name: str, default: float) -> float:
    """Return the env var as a float, or `default` when unset/blank/unparseable."""
    value = os.environ.get(name)
    if value is None or value.strip() == "":
        return default
    try:
        return float(value)
    except ValueError:
        return default
