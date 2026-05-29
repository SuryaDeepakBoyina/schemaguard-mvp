"""Validation endpoints for patient and FHIR resource quality checks."""

from __future__ import annotations

from dataclasses import asdict

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.schemas.fhir import FHIRValidationRequest, LegacyPatientRecord, ValidationResponse as FHIRValidationResponse
from app.services.validation_service import ValidationService
from app.services.metrics_service import MetricsService


router = APIRouter(prefix="", tags=["validation"])
validation_service = ValidationService()


class LegacyValidationRequest(BaseModel):
    """Incoming legacy patient record payload."""

    id: str = Field(..., examples=["pat-001"])
    name: str = Field(..., examples=["Asha Devi"])
    age: int = Field(..., ge=0, le=150, examples=[42])
    gender: str = Field(..., examples=["female"])
    vitals: dict[str, object] = Field(default_factory=dict)
    diagnoses: list[str] = Field(default_factory=list)


class LegacyValidationResponse(BaseModel):
    quality_score: int = Field(..., ge=0, le=100)
    issues: list[dict[str, object]]
    fhir_compliant: bool
    profile: str | None = None
    patient: dict[str, object] | None = None
    observations: list[dict[str, object]] = Field(default_factory=list)
    bundle: dict[str, object] | None = None
    openmrs_mapping: dict[str, object] | None = None
    suggestions: list[dict[str, object]] = Field(default_factory=list)


PatientRecord = LegacyValidationRequest
ValidationResponse = LegacyValidationResponse


@router.post(
    "/validate-record",
    response_model=LegacyValidationResponse,
    summary="Validate a patient record",
    description="Performs lightweight schema and consistency checks on a patient record.",
)
async def validate_record(record: LegacyValidationRequest) -> LegacyValidationResponse:
    """Validate a legacy record and return a FHIR-aware quality summary."""

    result = validation_service.validate(record.model_dump())
    MetricsService.record_validation(
        quality_score=result.quality_score,
        fhir_compliant=result.fhir_compliant,
        has_errors=any(issue.severity == "error" for issue in result.issues),
    )
    return LegacyValidationResponse(**asdict(result))


@router.post(
    "/validate-fhir",
    response_model=FHIRValidationResponse,
    summary="Validate a FHIR Patient payload",
    description="Validate a full FHIR Patient, Observation list, and optional Bundle payload.",
)
async def validate_fhir(payload: FHIRValidationRequest) -> FHIRValidationResponse:
    """Validate a FHIR-native patient payload."""

    result = validation_service.validate_fhir_payload(payload.model_dump())
    MetricsService.record_validation(
        quality_score=result.quality_score,
        fhir_compliant=result.fhir_compliant,
        has_errors=any(issue.severity == "error" for issue in result.issues),
    )
    return result