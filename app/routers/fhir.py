"""FHIR compatibility endpoints for SchemaGuard Health AI."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.metrics_service import MetricsService
from app.services.fhir_service import FHIRValidationService


router = APIRouter(prefix="", tags=["fhir"])
fhir_service = FHIRValidationService()


class FHIRCheckRequest(BaseModel):
    """Raw patient payload for FHIR compatibility checks."""

    record: dict[str, Any] = Field(default_factory=dict)


class FHIRCheckResponse(BaseModel):
    """FHIR compatibility result returned to the caller."""

    is_valid: bool
    missing_required: list[str]
    mapping_notes: str


@router.post(
    "/fhir-check",
    response_model=FHIRCheckResponse,
    summary="Check FHIR compatibility",
)
async def fhir_check(payload: FHIRCheckRequest) -> FHIRCheckResponse:
    """Check whether the input record can be mapped to a FHIR Patient."""

    result = fhir_service.check(payload.record)
    MetricsService.record_validation(
        quality_score=100 if result["is_valid"] else 0,
        fhir_compliant=result["is_valid"],
        has_errors=not result["is_valid"],
    )
    return FHIRCheckResponse(**result)
