"""Rule-based validation for patient records.

This keeps the first MVP endpoint deterministic and lightweight so it can run
without external services in low-resource deployments.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


ALLOWED_GENDERS = {"male", "female", "other", "unknown"}


@dataclass(slots=True)
class ValidationResult:
    """Structured validation outcome for a patient record."""

    quality_score: int
    issues: list[str]
    fhir_compliant: bool


class ValidationService:
    """Validate patient records using lightweight local rules."""

    required_fields = ("id", "name", "age", "gender")

    def validate(self, record: dict[str, Any]) -> ValidationResult:
        """Validate a patient record and calculate a quality score.

        Args:
            record: Raw patient record payload.

        Returns:
            A validation result containing a normalized score and issues.
        """

        issues: list[str] = []
        score = 100

        for field in self.required_fields:
            if record.get(field) in (None, ""):
                issues.append(f"Missing required field: {field}")
                score -= 20

        age = record.get("age")
        if isinstance(age, int):
            if age < 0 or age > 120:
                issues.append("Age must be between 0 and 120")
                score -= 30
        else:
            issues.append("Age must be an integer")
            score -= 20

        gender = str(record.get("gender", "")).strip().lower()
        if gender and gender not in ALLOWED_GENDERS:
            issues.append("Gender must be one of male, female, other, unknown")
            score -= 15

        if record.get("pregnant") is True and gender == "male":
            issues.append("Pregnancy status is inconsistent with gender")
            score -= 25

        vitals = record.get("vitals") or {}
        if not isinstance(vitals, dict):
            issues.append("Vitals must be an object")
            score -= 10

        diagnoses = record.get("diagnoses") or []
        if not isinstance(diagnoses, list):
            issues.append("Diagnoses must be an array")
            score -= 10

        score = max(0, min(100, score))
        return ValidationResult(
            quality_score=score,
            issues=issues,
            fhir_compliant=not issues,
        )
