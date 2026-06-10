"""Provenance logging. Every AI call is recorded (labeled, sourced, advisory) so
the platform can demonstrate that AI output was never treated as authoritative."""

from __future__ import annotations

import json
import logging

from .schemas import Provenance

logger = logging.getLogger("aegis.ai.provenance")


def log_provenance(action: str, subject: str, prov: Provenance) -> None:
    logger.info(
        json.dumps(
            {
                "event": "ai_provenance",
                "action": action,
                "subject": subject,
                "provider": prov.provider,
                "model": prov.model,
                "generated_at": prov.generated_at.isoformat(),
                "advisory": prov.advisory,
            }
        )
    )
