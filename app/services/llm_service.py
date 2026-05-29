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
            # Try to guess the field from common patterns
            field = "unknown"
            issue_lower = issue.lower()
            if "age" in issue_lower:
                field = "age"
            elif "gender" in issue_lower:
                field = "gender"
            elif "name" in issue_lower:
                field = "name"
            elif "id" in issue_lower or "identifier" in issue_lower:
                field = "id"
            elif "vital" in issue_lower:
                field = "vitals"

            suggestions.append(
                {
                    "field": field,
                    "original": record.get(field),
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

        system_prompt = (
            "You are a healthcare data quality assistant. "
            "Analyze the provided patient record and the list of validation issues. "
            "Return a JSON object with a 'suggestions' list. "
            "Each suggestion MUST include: 'field' (the specific key in the record), "
            "'original' (the current value), 'suggested' (the corrected value), "
            "'reason' (why you made the change), and 'confidence' (0.0 to 1.0). "
            "If an issue is 'Age must be between 0 and 120', the field is 'age'."
        )

        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": json.dumps({"record": record, "issues": issues}, indent=2),
                },
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1,
        }

        response: httpx.Response | None = None
        for attempt in range(3):
            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
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
                await asyncio.sleep(2**attempt * 0.5)

        assert response is not None
        try:
            content = response.json()["choices"][0]["message"]["content"]
            parsed = json.loads(content)
        except (KeyError, json.JSONDecodeError, IndexError):
            return self._fallback(record, issues)

        return parsed if isinstance(parsed, dict) else {"suggestions": []}