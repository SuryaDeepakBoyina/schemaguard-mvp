"""LLM service abstractions for AI suggestions.

The application can run without an LLM API key. In that mode the service
returns a deterministic fallback response so the validation workflow remains
usable in low-resource environments.
"""

from __future__ import annotations

import abc
import asyncio
import json
from dataclasses import dataclass
from typing import Any, Protocol

import httpx


class LLMService(Protocol):
    """Interface for suggestion generation backends."""

    async def suggest_fixes(self, record: dict[str, Any], issues: list[str]) -> dict[str, Any]:
        """Generate structured fix suggestions for a patient record."""


@dataclass(slots=True)
class SuggestionResult:
    """Structured output from an LLM backend."""

    suggestions: list[dict[str, Any]]


class BaseLLMService(abc.ABC):
    """Shared helpers for concrete LLM service implementations."""

    def _fallback(self, record: dict[str, Any], issues: list[str]) -> dict[str, Any]:
        """Return a deterministic suggestion payload when no model is available."""

        suggestions: list[dict[str, Any]] = []
        for issue in issues:
            suggestions.append(
                {
                    "field": "unknown",
                    "original": record.get("unknown"),
                    "suggested": None,
                    "reason": issue,
                    "confidence": 0.0,
                    "needs_review": True,
                }
            )
        return {"suggestions": suggestions}


class GroqLLMService(BaseLLMService):
    """Groq-backed LLM service for suggestion generation."""

    def __init__(self, api_key: str | None, model: str = "llama-3.3-70b-versatile") -> None:
        self.api_key = api_key
        self.model = model

    async def suggest_fixes(self, record: dict[str, Any], issues: list[str]) -> dict[str, Any]:
        """Generate suggestions using Groq or fall back if the API key is absent."""

        if not self.api_key:
            return self._fallback(record, issues)

        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": "Return only valid JSON with a suggestions array for healthcare data fixes.",
                },
                {
                    "role": "user",
                    "content": json.dumps({"record": record, "issues": issues}, indent=2),
                },
            ],
            "temperature": 0.2,
        }

        response: httpx.Response | None = None
        for attempt in range(3):
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={"Authorization": f"Bearer {self.api_key}"},
                        json=payload,
                    )
                    response.raise_for_status()
                    break
            except Exception:
                if attempt == 2:
                    return self._fallback(record, issues)
                await asyncio.sleep(2**attempt * 0.2)

        assert response is not None
        content = response.json()["choices"][0]["message"]["content"]
        try:
            parsed = json.loads(content)
        except json.JSONDecodeError:
            return self._fallback(record, issues)

        return parsed if isinstance(parsed, dict) else {"suggestions": []}