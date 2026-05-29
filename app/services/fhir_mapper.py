"""FHIR mapping helpers for SchemaGuard Health AI.

The mapper keeps the transformation logic isolated from the API layer so it can
be reused by both the compatibility checker and future OpenMRS integration.
"""

from __future__ import annotations

from typing import Any


class FHIRMapper:
    """Convert common OpenMRS-style patient payloads into FHIR Patient data."""

    @staticmethod
    def map_patient(record: dict[str, Any]) -> dict[str, Any]:
        """Map the application patient payload into a FHIR Patient dictionary.

        Args:
            record: Raw patient record from the API request.

        Returns:
            A FHIR Patient-shaped dictionary that can be validated by the
            `fhir.resources` library or a downstream FHIR server.
        """

        gender = str(record.get("gender", "")).strip().lower()
        telecom: list[dict[str, Any]] = []
        if record.get("phone"):
            telecom.append({"system": "phone", "value": record["phone"]})

        resource: dict[str, Any] = {
            "resourceType": "Patient",
            "identifier": [{"value": record.get("id")}],
            "name": [{"text": record.get("name")}],
            "gender": gender if gender in {"male", "female", "other", "unknown"} else "unknown",
        }

        if record.get("age") is not None:
            resource["extension"] = [
                {
                    "url": "http://hl7.org/fhir/StructureDefinition/patient-age",
                    "valueInteger": record["age"],
                }
            ]

        if telecom:
            resource["telecom"] = telecom

        return resource

    @staticmethod
    def required_fields() -> list[str]:
        """Return the application fields required for FHIR mapping."""

        return ["id", "name", "age", "gender"]
