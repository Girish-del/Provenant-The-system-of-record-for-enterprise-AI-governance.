# aegis-ai (Python FastAPI)

Internal AI service: drafts governance documents (risk summary, FRIA, DPIA) and
suggests controls for AI use cases. Every response carries **provenance** (provider,
model, timestamp, `advisory: true`, label, sources) and each call is provenance-logged.
Output is advisory, labeled, sourced, and never auto-applied
(see `docs/05-SECURITY-AND-THREAT-MODEL.md`). Internal-only; never internet-reachable
in production.

## Providers
- **mock** (default, no credentials) — deterministic templated output for dev/CI.
- **claude** — Anthropic Messages API, selected when `ANTHROPIC_API_KEY` is set
  (`ANTHROPIC_MODEL`, default `claude-sonnet-4-0`). Same interface as the mock.

## Endpoints
- `GET /health` → `{status, provider, model}`
- `POST /draft` → `{content, provenance}` — body `{kind: risk_summary|fria|dpia, use_case}`
- `POST /suggest-controls` → `{suggestions[], provenance}` — body `{use_case, framework}`

If `INTERNAL_API_TOKEN` is set, requests must send `X-Internal-Token` (so only the core
API can call it).

## Develop (uv)
```bash
cd services/ai
uv sync                       # create .venv + install deps
uv run pytest                 # tests (mock provider, no key needed)
uv run uvicorn app.main:app --port 8000   # run locally
```
