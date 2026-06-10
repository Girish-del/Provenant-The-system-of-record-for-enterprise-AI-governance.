from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health() -> None:
    res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["provider"] == "mock"


def test_draft_returns_content_and_advisory_provenance() -> None:
    res = client.post(
        "/draft",
        json={
            "kind": "risk_summary",
            "use_case": {"name": "Fraud Model", "risk_tier": "HIGH", "purpose": "detect fraud"},
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert "Fraud Model" in body["content"]
    assert body["provenance"]["advisory"] is True
    assert body["provenance"]["provider"] == "mock"
    assert body["provenance"]["sources"]


def test_suggest_controls_endpoint() -> None:
    res = client.post(
        "/suggest-controls",
        json={"use_case": {"name": "x", "risk_tier": "HIGH"}},
    )
    assert res.status_code == 200
    assert len(res.json()["suggestions"]) == 7


def test_internal_token_enforced_when_configured(monkeypatch) -> None:
    monkeypatch.setenv("INTERNAL_API_TOKEN", "s3cret")
    # missing/incorrect header -> 401
    res = client.post("/draft", json={"kind": "dpia", "use_case": {"name": "x", "risk_tier": "LOW"}})
    assert res.status_code == 401
    # correct header -> 200
    res_ok = client.post(
        "/draft",
        headers={"x-internal-token": "s3cret"},
        json={"kind": "dpia", "use_case": {"name": "x", "risk_tier": "LIMITED"}},
    )
    assert res_ok.status_code == 200


def test_internal_token_required_in_production(monkeypatch) -> None:
    # Fail closed: production with no token refuses all calls.
    monkeypatch.delenv("INTERNAL_API_TOKEN", raising=False)
    monkeypatch.setenv("APP_ENV", "production")
    res = client.post("/draft", json={"kind": "dpia", "use_case": {"name": "x"}})
    assert res.status_code == 503
