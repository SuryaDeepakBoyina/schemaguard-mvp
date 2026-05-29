"""FHIR compatibility endpoints for SchemaGuard Health AI."""

from __future__ import annotations

from fastapi import APIRouter

from app.services.metrics_service import MetricsService
from app.services.fhir_service import FHIRValidationService
from app.schemas.fhir import FHIRCheckRequest


router = APIRouter(prefix="", tags=["fhir"])
fhir_service = FHIRValidationService()


@router.post(
    "/fhir-check",
    response_model=dict,
    summary="Check FHIR compatibility",
)
async def fhir_check(payload: FHIRCheckRequest) -> dict:
    """Check whether the input record can be mapped to a FHIR Patient."""

    result = fhir_service.check(payload.model_dump())
    MetricsService.record_validation(
        quality_score=100 if result["is_valid"] else 0,
        fhir_compliant=result["is_valid"],
        has_errors=not result["is_valid"],
    )
    return result
