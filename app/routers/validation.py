"""Validation endpoints for patient record quality checks.

This router provides the initial MVP endpoint shape for record validation.
The endpoint is intentionally small so it can be extended by the service layer
without changing the public API contract.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.validation_service import ValidationService
from app.services.metrics_service import MetricsService


router = APIRouter(prefix="", tags=["validation"])
validation_service = ValidationService()


class PatientRecord(BaseModel):
    """Incoming patient record payload."""

    id: str = Field(..., examples=["pat-001"])
    name: str = Field(..., examples=["Asha Devi"])
    age: int = Field(..., ge=0, le=150, examples=[42])
    gender: str = Field(..., examples=["female"])
    vitals: dict[str, Any] = Field(default_factory=dict)
    diagnoses: list[str] = Field(default_factory=list)


class ValidationResponse(BaseModel):
    """Validation summary returned to the client."""

    quality_score: int = Field(..., ge=0, le=100)
    issues: list[str]
    fhir_compliant: bool


@router.post(
    "/validate-record",
    response_model=ValidationResponse,
    summary="Validate a patient record",
    description="Performs lightweight schema and consistency checks on a patient record.",
)
async def validate_record(record: PatientRecord) -> ValidationResponse:
    """Validate a patient record and return an MVP quality summary.

    The first implementation only checks whether required fields are present
    and returns a neutral score. The service layer will later provide the
    actual quality scoring and issue generation.
    """

    result = validation_service.validate(record.model_dump())
    MetricsService.record_validation(
        quality_score=result.quality_score,
        fhir_compliant=result.fhir_compliant,
        has_errors=bool(result.issues),
    )
    return ValidationResponse(**result.__dict__)