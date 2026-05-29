"""AI suggestion endpoints for SchemaGuard Health AI."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.core.settings import get_settings
from app.services.metrics_service import MetricsService
from app.services.suggestion_service import SuggestionService


router = APIRouter(prefix="", tags=["suggestions"])
suggestion_service = SuggestionService(api_key=get_settings().llm_api_key)


class SuggestionRequest(BaseModel):
    """Payload containing the raw record and validation issues."""

    record: dict[str, Any] = Field(default_factory=dict)
    issues: list[str] = Field(default_factory=list)


class SuggestionItem(BaseModel):
    """A single fix suggestion."""

    field: str
    original: Any | None = None
    suggested: Any | None = None
    reason: str
    confidence: float = Field(ge=0.0, le=1.0)
    needs_review: bool = False


class SuggestionResponse(BaseModel):
    """Structured suggestion response."""

    suggestions: list[SuggestionItem]


@router.post(
    "/suggest-fixes",
    response_model=SuggestionResponse,
    summary="Suggest fixes for validation issues",
)
async def suggest_fixes(payload: SuggestionRequest) -> SuggestionResponse:
    """Return AI-generated suggestions for a patient record."""

    result = await suggestion_service.suggest_fixes(payload.record, payload.issues)
    MetricsService.record_suggestion(accepted=False)
    suggestions = result.get("suggestions", [])
    return SuggestionResponse(suggestions=[SuggestionItem(**item) for item in suggestions])
