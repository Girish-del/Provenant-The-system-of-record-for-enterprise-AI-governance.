from app.providers import MockProvider
from app.schemas import UseCaseInput


def test_mock_draft_includes_name_tier_and_review_notice() -> None:
    provider = MockProvider()
    out = provider.draft(
        "risk_summary",
        UseCaseInput(name="Resume Screener", risk_tier="HIGH", purpose="rank applicants"),
    )
    assert "Resume Screener" in out
    assert "HIGH" in out
    assert "reviewed" in out.lower()


def test_suggest_controls_high_risk_returns_obligations() -> None:
    provider = MockProvider()
    suggestions = provider.suggest_controls(UseCaseInput(name="x", risk_tier="HIGH"), "EU_AI_ACT")
    codes = [s.code for s in suggestions]
    assert "Art14" in codes  # human oversight
    assert len(suggestions) == 7


def test_suggest_controls_limited_returns_transparency() -> None:
    provider = MockProvider()
    suggestions = provider.suggest_controls(
        UseCaseInput(name="x", risk_tier="LIMITED"), "EU_AI_ACT"
    )
    assert [s.code for s in suggestions] == ["Art50"]


def test_suggest_controls_minimal_is_empty() -> None:
    provider = MockProvider()
    assert provider.suggest_controls(UseCaseInput(name="x", risk_tier="MINIMAL"), "EU_AI_ACT") == []
