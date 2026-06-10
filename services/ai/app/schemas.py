"""Pydantic request/response models for the Aegis AI service."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

DraftKind = Literal["risk_summary", "fria", "dpia"]


class UseCaseInput(BaseModel):
    name: str
    purpose: str | None = None
    description: str | None = None
    risk_tier: str = "UNASSIGNED"


class Provenance(BaseModel):
    """Attached to every AI output: who produced it, when, and that it is advisory."""

    provider: str
    model: str
    generated_at: datetime
    advisory: bool = True
    label: str
    sources: list[str] = Field(default_factory=list)


class DraftRequest(BaseModel):
    kind: DraftKind
    use_case: UseCaseInput


class DraftResponse(BaseModel):
    content: str
    provenance: Provenance


class ControlSuggestion(BaseModel):
    code: str
    title: str
    rationale: str


class SuggestControlsRequest(BaseModel):
    use_case: UseCaseInput
    framework: str = "EU_AI_ACT"


class SuggestControlsResponse(BaseModel):
    suggestions: list[ControlSuggestion]
    provenance: Provenance


class HealthResponse(BaseModel):
    status: str
    provider: str
    model: str
