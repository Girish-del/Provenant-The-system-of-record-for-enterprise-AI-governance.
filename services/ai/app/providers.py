"""AI providers behind one interface. The mock provider is deterministic and needs
no credentials (used in dev/CI); the Claude provider calls the Anthropic Messages
API when ANTHROPIC_API_KEY is set. All output is advisory and human-reviewed."""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Protocol

from .env import env_str
from .schemas import ControlSuggestion, Provenance, UseCaseInput

logger = logging.getLogger("aegis.ai")

EU_AI_ACT_HIGH_RISK_CONTROLS: list[tuple[str, str]] = [
    ("Art9", "Risk management system"),
    ("Art10", "Data and data governance"),
    ("Art11", "Technical documentation"),
    ("Art12", "Record-keeping (logging)"),
    ("Art13", "Transparency and information to deployers"),
    ("Art14", "Human oversight"),
    ("Art15", "Accuracy, robustness and cybersecurity"),
]

_ADVISORY_LABEL = "AI-generated draft — advisory only, must be reviewed by a qualified person"


class AIProvider(Protocol):
    name: str
    model: str

    def draft(self, kind: str, use_case: UseCaseInput) -> str: ...

    def suggest_controls(
        self, use_case: UseCaseInput, framework: str
    ) -> list[ControlSuggestion]: ...


def _suggest_controls_for_tier(use_case: UseCaseInput) -> list[ControlSuggestion]:
    """Deterministic mapping of risk tier -> required EU AI Act controls. Shared by
    both providers so structured output stays stable and auditable."""
    if use_case.risk_tier in ("HIGH", "PROHIBITED"):
        return [
            ControlSuggestion(
                code=code,
                title=title,
                rationale=f"Required for {use_case.risk_tier}-risk systems under the EU AI Act.",
            )
            for code, title in EU_AI_ACT_HIGH_RISK_CONTROLS
        ]
    if use_case.risk_tier == "LIMITED":
        return [
            ControlSuggestion(
                code="Art50",
                title="Transparency obligations for certain AI systems",
                rationale="Limited-risk systems must meet Article 50 transparency obligations.",
            )
        ]
    return []


class MockProvider:
    name = "mock"
    model = "mock-deterministic-v1"

    def draft(self, kind: str, use_case: UseCaseInput) -> str:
        titles = {
            "risk_summary": "AI Use-Case Risk Summary",
            "fria": "Fundamental Rights Impact Assessment (FRIA)",
            "dpia": "Data Protection Impact Assessment (DPIA)",
        }
        title = titles.get(kind, "AI Governance Document")
        return (
            f"# {title}: {use_case.name}\n\n"
            f"**Risk tier:** {use_case.risk_tier}\n"
            f"**Purpose:** {use_case.purpose or 'Not specified'}\n\n"
            f"## Summary\n"
            f"The system '{use_case.name}' is assessed as {use_case.risk_tier} risk. "
            f"This draft outlines the obligations and considerations that apply.\n\n"
            f"## Key considerations\n"
            f"- Human oversight and the ability to intervene\n"
            f"- Data governance and bias examination of training data\n"
            f"- Transparency and instructions for deployers\n"
            f"- Accuracy, robustness, and cybersecurity\n\n"
            f"_This is an AI-generated draft and must be reviewed by a qualified person "
            f"before it is relied upon._"
        )

    def suggest_controls(
        self, use_case: UseCaseInput, framework: str
    ) -> list[ControlSuggestion]:
        return _suggest_controls_for_tier(use_case)


def resolve_models() -> dict[str, str]:
    """Model routing: route each task to the cheapest model that does the job.
    Long-form drafting gets the strong default; structured suggestion gets the
    fast/cheap tier. Both are env-overridable per task."""
    base = env_str("ANTHROPIC_MODEL", "claude-sonnet-4-0")
    return {
        "draft": env_str("ANTHROPIC_MODEL_DRAFT", base),
        "suggest": env_str("ANTHROPIC_MODEL_SUGGEST", "claude-haiku-4-5"),
    }


class ClaudeProvider:
    name = "claude"

    def __init__(self) -> None:
        import anthropic  # lazy: only required when a key is configured

        self.models = resolve_models()
        self.model = self.models["draft"]
        self._client = anthropic.Anthropic()

    def _complete(self, system: str, user: str, model: str | None = None) -> str:
        message = self._client.messages.create(
            model=model or self.model,
            max_tokens=1500,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        return "".join(
            block.text for block in message.content if getattr(block, "type", None) == "text"
        )

    def draft(self, kind: str, use_case: UseCaseInput) -> str:
        system = (
            "You are an EU AI Act compliance assistant. Draft clear, accurate, "
            "regulator-facing documents. Your output is advisory and must be reviewed by "
            "a qualified person. Do not fabricate legal citations or facts."
        )
        user = (
            f"Draft a {kind.replace('_', ' ')} for this AI use case.\n"
            f"Name: {use_case.name}\n"
            f"Purpose: {use_case.purpose or 'not specified'}\n"
            f"Risk tier: {use_case.risk_tier}\n"
            f"Description: {use_case.description or 'not specified'}"
        )
        return self._complete(system, user, model=self.models["draft"])

    def suggest_controls(
        self, use_case: UseCaseInput, framework: str
    ) -> list[ControlSuggestion]:
        # Structured control mapping is deterministic by design (auditable); the
        # free-form draft endpoint is where the model adds value.
        return _suggest_controls_for_tier(use_case)


def make_provenance(provider: AIProvider, sources: list[str] | None = None) -> Provenance:
    return Provenance(
        provider=provider.name,
        model=provider.model,
        generated_at=datetime.now(timezone.utc),
        advisory=True,
        label=_ADVISORY_LABEL,
        sources=sources or [],
    )


def get_provider() -> AIProvider:
    if os.environ.get("ANTHROPIC_API_KEY"):
        try:
            provider = ClaudeProvider()
            logger.info("AI provider: claude (%s)", provider.model)
            return provider
        except Exception as exc:  # noqa: BLE001 - fall back rather than crash on init
            logger.warning("Claude provider init failed, using mock: %s", exc)
    logger.info("AI provider: mock (no ANTHROPIC_API_KEY set)")
    return MockProvider()
