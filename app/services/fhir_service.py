"""FHIR compatibility checks for SchemaGuard Health AI.

The service keeps schema conversion and validation logic isolated so the API
layer only needs to translate results into HTTP responses.
"""

from __future__ import annotations

from typing import Any

from app.services.fhir_mapper import FHIRMapper
from app.services.validation_service import ValidationService


class FHIRValidationService:
    """Validate application records against the FHIR Patient resource model."""

    def __init__(self) -> None:
        self.validation_service = ValidationService()

    def check(self, record: dict[str, Any]) -> dict[str, Any]:
        """Validate a record after mapping it to a FHIR Patient resource.

        Args:
            record: Raw application patient payload.

        Returns:
            A dictionary containing validity state, missing fields, and notes.
        """

        legacy_record = record.get("record") if isinstance(record.get("record"), dict) else record
        detailed = self.validation_service.validate_fhir_payload(FHIRMapper.coerce_request(record))
        missing_required = [field for field in FHIRMapper.required_fields() if not legacy_record.get(field)]

        return {
            "is_valid": detailed.fhir_compliant and not missing_required,
            "missing_required": missing_required,
            "mapping_notes": "Mapped OpenMRS-style patient data to FHIR Patient resource.",
            "issues": [issue.model_dump() for issue in detailed.issues],
            "profile": detailed.profile,
            "patient": detailed.patient.model_dump() if detailed.patient else None,
            "observations": [observation.model_dump() for observation in detailed.observations],
            "bundle": detailed.bundle.model_dump() if detailed.bundle else None,
        }
