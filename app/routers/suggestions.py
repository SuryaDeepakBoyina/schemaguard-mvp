"""AI suggestion endpoints for SchemaGuard Health AI."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.core.settings import get_settings
from app.services.metrics_service import MetricsService
from app.services.suggestion_service import SuggestionService


router = APIRouter(prefix="", tags=["suggestions"])
suggestion_service = SuggestionService(api_key=get_settings().llm_api_key)


class SuggestionRequest(BaseModel):
    """Payload containing the raw record or FHIR resources and validation issues."""

    record: dict[str, object] = Field(default_factory=dict)
    issues: list[object] = Field(default_factory=list)


class SuggestionResponse(BaseModel):
    suggestions: list[dict[str, object]]


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
    return SuggestionResponse(suggestions=suggestions)
