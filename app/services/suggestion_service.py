"""Suggestion generation service for patient record fixes."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from app.services.llm_service import GroqLLMService


class SuggestionService:
    """Generate structured fix suggestions from validation issues."""

    _cache: dict[str, dict[str, Any]] = {}

    def __init__(self, api_key: str | None) -> None:
        self.llm_service = GroqLLMService(api_key=api_key)
        self.prompt_path = Path(__file__).resolve().parent.parent / "prompts" / "suggest_fixes.txt"

    def prompt_text(self) -> str:
        """Load the editable prompt text from disk."""

        return self.prompt_path.read_text(encoding="utf-8")

    async def suggest_fixes(self, record: dict[str, Any], issues: list[Any]) -> dict[str, Any]:
        """Return structured suggestion data for the provided record."""

        cache_key = hashlib.sha256(json.dumps({"record": record, "issues": issues}, sort_keys=True).encode()).hexdigest()
        if cache_key in self._cache:
            return self._cache[cache_key]

        result = await self.llm_service.suggest_fixes(record, issues)
        for suggestion in result.get("suggestions", []):
            suggestion["needs_review"] = suggestion.get("confidence", 0.0) < 0.7
        self._cache[cache_key] = result
        return result
