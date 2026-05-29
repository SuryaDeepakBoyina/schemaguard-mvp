"""Structured JSON logging utilities."""

from __future__ import annotations

from observability.logging_config import configure_json_logging


def configure_logging(log_level: str) -> None:
    """Configure application logging for JSON output."""

    configure_json_logging(log_level)
