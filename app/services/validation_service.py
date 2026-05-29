"""Rule-based validation for patient records.

This keeps the first MVP endpoint deterministic and lightweight so it can run
without external services in low-resource deployments.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from fhir.resources.bundle import Bundle
from fhir.resources.observation import Observation
from fhir.resources.patient import Patient

from app.schemas.fhir import (
    BundleResource,
    FHIRValidationRequest,
    LegacyPatientRecord,
    ObservationResource,
    OpenMRSMapping,
    PatientResource,
    SuggestionAction,
    SuggestionItem,
    ValidationIssue,
    ValidationResponse,
)
from app.services.fhir_mapper import FHIRMapper, FHIR_SYSTEMS


ALLOWED_GENDERS = {"male", "female", "other", "unknown"}


@dataclass(slots=True)
class ValidationResult:
    """Structured validation outcome for a patient record."""

    quality_score: int
    issues: list[ValidationIssue]
    fhir_compliant: bool


def _issue(severity: str, location: str, message: str, element: str | None = None, fhir_uri: str | None = None) -> ValidationIssue:
    return ValidationIssue(severity=severity, location=location, message=message, element=element, fhirUri=fhir_uri)


class ValidationService:
    """Validate patient records using lightweight local rules."""

    required_fields = ("id", "name", "age", "gender")

    def _validate_fhir_patient(self, patient: dict[str, Any]) -> tuple[list[ValidationIssue], int]:
        issues: list[ValidationIssue] = []
        score = 100

        try:
            Patient(**patient)
        except Exception as exc:
            issues.append(_issue("error", "Patient", f"FHIR Patient validation failed: {exc}", "Patient", "https://hl7.org/fhir/R4/patient.html"))
            score -= 30

        if not patient.get("identifier"):
            issues.append(_issue("warning", "Patient.identifier", "At least one identifier is recommended for patient matching.", "Identifier", "https://hl7.org/fhir/R4/patient.html#Patient.identifier"))
            score -= 10

        if not patient.get("name"):
            issues.append(_issue("error", "Patient.name", "Patient.name is required for a usable FHIR patient.", "HumanName", "https://hl7.org/fhir/R4/datatypes.html#HumanName"))
            score -= 20

        birth_date = patient.get("birthDate")
        if birth_date and not isinstance(birth_date, str):
            issues.append(_issue("error", "Patient.birthDate", "birthDate must be a FHIR date string.", "date", "https://hl7.org/fhir/R4/datatypes.html#date"))
            score -= 10

        if patient.get("gender") not in ALLOWED_GENDERS:
            issues.append(_issue("error", "Patient.gender", "gender must be one of male, female, other, unknown.", "code", "https://hl7.org/fhir/R4/patient.html#Patient.gender"))
            score -= 15

        has_abha = any(identifier.get("system") == FHIR_SYSTEMS["abha_identifier"] for identifier in patient.get("identifier", []))
        patient_meta = patient.get("meta") or {}
        profiles = patient_meta.get("profile", []) if isinstance(patient_meta, dict) else []
        if not has_abha and any(profile for profile in profiles if "abdm" in profile.lower()):
            issues.append(_issue("warning", "Patient.identifier", "ABDM-style profiles should include an ABHA identifier.", "Identifier.system", "http://abdm.gov.in/fhir/NamingSystem/abha"))
            score -= 10

        return issues, max(0, min(100, score))

    def _validate_observations(self, observations: list[dict[str, Any]], patient_id: str) -> tuple[list[ValidationIssue], int]:
        issues: list[ValidationIssue] = []
        score = 0

        for index, observation in enumerate(observations):
            try:
                Observation(**observation)
            except Exception as exc:
                issues.append(_issue("error", f"Observation[{index}]", f"Observation validation failed: {exc}", "Observation", "https://hl7.org/fhir/R4/observation.html"))
                score -= 15
                continue

            score += 10
            if observation.get("subject", {}).get("reference") != f"Patient/{patient_id}":
                issues.append(_issue("warning", f"Observation[{index}].subject", "Observation.subject should reference the active Patient resource.", "Reference", "https://hl7.org/fhir/R4/references.html"))
                score -= 5

            code = observation.get("code", {}).get("coding", [{}])[0]
            if code.get("system") not in {FHIR_SYSTEMS["loinc"], FHIR_SYSTEMS["snomed"]}:
                issues.append(_issue("information", f"Observation[{index}].code", "Prefer LOINC or SNOMED-CT codes for clinical observations.", "CodeableConcept", "https://hl7.org/fhir/R4/datatypes.html#CodeableConcept"))

        return issues, max(0, min(100, score))

    def _build_suggestions(self, patient: dict[str, Any], issues: list[ValidationIssue]) -> list[SuggestionItem]:
        suggestions: list[SuggestionItem] = []
        for issue in issues:
            if issue.location == "Patient.identifier":
                suggestions.append(
                    SuggestionItem(
                        field="identifier",
                        suggestion="Add an official medical record number or ABHA identifier for interoperability.",
                        confidence=0.95,
                        code_example={"system": FHIR_SYSTEMS["abha_identifier"], "value": "12-3456-7890-1234"},
                        action=SuggestionAction(
                            type="add-identifier",
                            identifier={
                                "use": "official",
                                "type": {"coding": [{"system": FHIR_SYSTEMS["identifier_type"], "code": "MR", "display": "Medical record number"}], "text": "Medical record number"},
                                "system": FHIR_SYSTEMS["abha_identifier"],
                                "value": "12-3456-7890-1234",
                            },
                        ),
                    )
                )
            elif issue.location == "Patient.telecom":
                suggestions.append(
                    SuggestionItem(
                        field="telecom",
                        suggestion="Add a mobile or email contact point for follow-up.",
                        confidence=0.8,
                        code_example={"system": "phone", "value": "+91-9876543210", "use": "mobile"},
                    )
                )
            elif issue.location.startswith("Observation"):
                suggestions.append(
                    SuggestionItem(
                        field="observations",
                        suggestion="Use a FHIR Observation with coded terminology and UCUM units.",
                        confidence=0.9,
                        code_example={"code": {"system": FHIR_SYSTEMS["loinc"], "code": "85354-9", "display": "Blood pressure panel"}},
                    )
                )
        return suggestions

    def validate_fhir_payload(self, payload: dict[str, Any]) -> ValidationResponse:
        coerced = FHIRMapper.coerce_request(payload)
        patient = coerced["patient"]
        observations = coerced.get("observations", [])
        bundle = coerced.get("bundle")
        profile = coerced.get("profile", "Base FHIR R4 Patient")

        patient_issues, patient_score = self._validate_fhir_patient(patient)
        observation_issues, observation_score = self._validate_observations(observations, patient.get("id", "legacy-patient"))
        if not bundle:
            bundle = {
                "resourceType": "Bundle",
                "id": f"bundle-{patient.get('id', 'legacy-patient')}",
                "type": "collection",
                "total": 1 + len(observations),
                "entry": [
                    {"fullUrl": f"urn:uuid:{patient.get('id', 'legacy-patient')}", "resource": patient},
                    *(
                        {"fullUrl": f"urn:uuid:{observation.get('id', 'obs')}", "resource": observation}
                        for observation in observations
                    ),
                ],
            }

        bundle_issues: list[ValidationIssue] = []

        try:
            Bundle(**bundle)
        except Exception as exc:
            bundle_issues.append(_issue("error", "Bundle", f"Bundle validation failed: {exc}", "Bundle", "https://hl7.org/fhir/R4/bundle.html"))
            patient_score -= 10

        issues = [*patient_issues, *observation_issues, *bundle_issues]
        score = max(0, min(100, int((patient_score + observation_score) / 2) - len([issue for issue in issues if issue.severity == "warning"]) * 2))
        fhir_compliant = not any(issue.severity == "error" for issue in issues)
        openmrs_mapping = FHIRMapper.openmrs_mapping(patient)
        suggestions = self._build_suggestions(patient, issues)

        return ValidationResponse(
            quality_score=score,
            issues=issues,
            fhir_compliant=fhir_compliant,
            profile=profile,
            patient=PatientResource(**patient),
            observations=[ObservationResource(**observation) for observation in observations],
            bundle=BundleResource(**bundle) if bundle else None,
            openmrs_mapping=OpenMRSMapping(**openmrs_mapping),
            suggestions=suggestions,
        )

    def validate(self, record: dict[str, Any]) -> ValidationResult:
        """Validate a patient record and calculate a quality score.

        Args:
            record: Raw patient record payload.

        Returns:
            A validation result containing a normalized score and issues.
        """

        if record.get("patient"):
            detailed = self.validate_fhir_payload(record)
            return ValidationResult(
                quality_score=detailed.quality_score,
                issues=detailed.issues,
                fhir_compliant=detailed.fhir_compliant,
            )

        issues: list[ValidationIssue] = []
        score = 100

        for field in self.required_fields:
            value = record.get(field)
            if value in (None, ""):
                issues.append(_issue("error", field, f"Missing required field: {field}", field))
                score -= 20
            elif field == "id" and len(str(value)) < 3:
                issues.append(_issue("error", "id", "Identifier is too short (minimum 3 characters)", "id"))
                score -= 10
            elif field == "name" and len(str(value)) < 2:
                issues.append(_issue("error", "name", "Name is too short (minimum 2 characters)", "name"))
                score -= 10

        age = record.get("age")
        if isinstance(age, int):
            if age < 0 or age > 120:
                issues.append(_issue("error", "age", "Age must be between 0 and 120", "age"))
                score -= 30
        else:
            issues.append(_issue("error", "age", "Age must be an integer", "age"))
            score -= 20

        gender = str(record.get("gender", "")).strip().lower()
        if gender and gender not in ALLOWED_GENDERS:
            issues.append(_issue("error", "gender", "Gender must be one of male, female, other, unknown", "gender"))
            score -= 15

        if record.get("pregnant") is True and gender == "male":
            issues.append(_issue("warning", "pregnant", "Pregnancy status is inconsistent with gender", "pregnant"))
            score -= 25

        vitals = record.get("vitals") or {}
        if not isinstance(vitals, dict):
            issues.append(_issue("error", "vitals", "Vitals must be an object", "vitals"))
            score -= 10

        diagnoses = record.get("diagnoses") or []
        if not isinstance(diagnoses, list):
            issues.append(_issue("error", "diagnoses", "Diagnoses must be an array", "diagnoses"))
            score -= 10

        score = max(0, min(100, score))
        return ValidationResult(
            quality_score=score,
            issues=issues,
            fhir_compliant=not any(issue.severity == "error" for issue in issues),
        )
