"""FHIR compatibility checks for SchemaGuard Health AI.

The service keeps schema conversion and validation logic isolated so the API
layer only needs to translate results into HTTP responses.
"""

from __future__ import annotations

from typing import Any

from fhir.resources.patient import Patient

from app.services.fhir_mapper import FHIRMapper


class FHIRValidationService:
    """Validate application records against the FHIR Patient resource model."""

    def check(self, record: dict[str, Any]) -> dict[str, Any]:
        """Validate a record after mapping it to a FHIR Patient resource.

        Args:
            record: Raw application patient payload.

        Returns:
            A dictionary containing validity state, missing fields, and notes.
        """

        missing_required = [field for field in FHIRMapper.required_fields() if not record.get(field)]
        mapped = FHIRMapper.map_patient(record)
        mapping_notes = "Mapped OpenMRS-style patient data to FHIR Patient resource."

        if missing_required:
            return {
                "is_valid": False,
                "missing_required": missing_required,
                "mapping_notes": mapping_notes,
            }

        try:
            Patient(**mapped)
        except Exception as exc:  # pragma: no cover - library-specific validation failures
            return {
                "is_valid": False,
                "missing_required": [],
                "mapping_notes": f"FHIR Patient validation failed: {exc}",
            }

        return {
            "is_valid": True,
            "missing_required": [],
            "mapping_notes": mapping_notes,
        }
