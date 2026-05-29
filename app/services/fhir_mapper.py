"""FHIR mapping helpers for SchemaGuard Health AI.

The mapper keeps the transformation logic isolated from the API layer so it can
be reused by both the compatibility checker and future OpenMRS integration.
"""

from __future__ import annotations

from typing import Any

from app.schemas.fhir import (
    BundleResource,
    CodeableConcept,
    Coding,
    ContactPoint,
    FHIRCheckRequest,
    FHIRValidationRequest,
    Identifier,
    LegacyPatientRecord,
    ObservationComponent,
    ObservationResource,
    OpenMRSMapping,
    PatientResource,
)


FHIR_SYSTEMS = {
    "identifier_type": "http://terminology.hl7.org/CodeSystem/v2-0203",
    "observation_category": "http://terminology.hl7.org/CodeSystem/observation-category",
    "loinc": "http://loinc.org",
    "snomed": "http://snomed.info/sct",
    "ucum": "http://unitsofmeasure.org",
    "abha_identifier": "http://abdm.gov.in/fhir/NamingSystem/abha",
    "hospital_identifier": "http://hospital.example.org/mrn",
}


class FHIRMapper:
    """Convert common OpenMRS-style patient payloads into FHIR Patient data."""

    @staticmethod
    def make_coding(system: str, code: str, display: str | None = None) -> dict[str, Any]:
        return {"system": system, "code": code, "display": display}

    @staticmethod
    def make_codeable_concept(coding: list[dict[str, Any]], text: str | None = None) -> dict[str, Any]:
        return {"coding": coding, "text": text}

    @staticmethod
    def legacy_record_to_patient(record: dict[str, Any]) -> dict[str, Any]:
        gender = str(record.get("gender", "")).strip().lower()
        patient: dict[str, Any] = {
            "resourceType": "Patient",
            "id": str(record.get("id") or "legacy-patient"),
            "identifier": [
                {
                    "use": "official",
                    "type": FHIRMapper.make_codeable_concept(
                        [FHIRMapper.make_coding(FHIR_SYSTEMS["identifier_type"], "MR", "Medical record number")],
                        "Medical record number",
                    ),
                    "system": FHIR_SYSTEMS["hospital_identifier"],
                    "value": str(record.get("id") or "legacy-patient"),
                }
            ],
            "name": [{"use": "official", "text": record.get("name"), "family": str(record.get("name", "")).split(" ")[-1]}],
            "telecom": [],
            "gender": gender if gender in {"male", "female", "other", "unknown"} else "unknown",
            "address": [],
            "contact": [],
            "communication": [],
        }

        if record.get("phone"):
            patient["telecom"] = [{"system": "phone", "value": str(record["phone"]), "use": "mobile"}]

        if record.get("birthDate"):
            patient["birthDate"] = record["birthDate"]

        if record.get("age") is not None:
            patient["extension"] = [
                {
                    "url": "http://hl7.org/fhir/StructureDefinition/patient-age",
                    "valueInteger": int(record["age"]),
                }
            ]

        return patient

    @staticmethod
    def legacy_record_to_observations(record: dict[str, Any]) -> list[dict[str, Any]]:
        vitals = record.get("vitals") or {}
        observations: list[dict[str, Any]] = []
        bp = vitals.get("bp")
        if isinstance(bp, str) and "/" in bp:
            systolic_raw, diastolic_raw = bp.split("/", 1)
            try:
                systolic = float(systolic_raw)
                diastolic = float(diastolic_raw)
            except ValueError:
                systolic = diastolic = 0.0
            observations.append(
                {
                    "resourceType": "Observation",
                    "id": f"obs-{record.get('id', 'legacy')}",
                    "status": "final",
                    "category": [
                        {
                            "coding": [FHIRMapper.make_coding(FHIR_SYSTEMS["observation_category"], "vital-signs", "Vital Signs")],
                            "text": "Vital Signs",
                        }
                    ],
                    "code": FHIRMapper.make_codeable_concept(
                        [FHIRMapper.make_coding(FHIR_SYSTEMS["loinc"], "85354-9", "Blood pressure panel")],
                        "Blood pressure panel",
                    ),
                    "subject": {"reference": f"Patient/{record.get('id', 'legacy-patient')}", "type": "Patient"},
                    "effectiveDateTime": record.get("effectiveDateTime") or "2026-05-30T10:30:00Z",
                    "component": [
                        {
                            "code": FHIRMapper.make_codeable_concept(
                                [FHIRMapper.make_coding(FHIR_SYSTEMS["loinc"], "8480-6", "Systolic blood pressure")],
                                "Systolic blood pressure",
                            ),
                            "valueQuantity": {
                                "value": systolic,
                                "unit": "mmHg",
                                "system": FHIR_SYSTEMS["ucum"],
                                "code": "mm[Hg]",
                            },
                        },
                        {
                            "code": FHIRMapper.make_codeable_concept(
                                [FHIRMapper.make_coding(FHIR_SYSTEMS["loinc"], "8462-4", "Diastolic blood pressure")],
                                "Diastolic blood pressure",
                            ),
                            "valueQuantity": {
                                "value": diastolic,
                                "unit": "mmHg",
                                "system": FHIR_SYSTEMS["ucum"],
                                "code": "mm[Hg]",
                            },
                        },
                    ],
                }
            )
        return observations

    @staticmethod
    def legacy_record_to_bundle(record: dict[str, Any]) -> dict[str, Any]:
        patient = FHIRMapper.legacy_record_to_patient(record)
        observations = FHIRMapper.legacy_record_to_observations(record)
        return {
            "resourceType": "Bundle",
            "id": f"bundle-{record.get('id', 'legacy')}",
            "type": "collection",
            "entry": [
                {"fullUrl": f"urn:uuid:{patient['id']}", "resource": patient},
                *(
                    {"fullUrl": f"urn:uuid:{observation['id']}", "resource": observation}
                    for observation in observations
                ),
            ],
            "total": 1 + len(observations),
        }

    @staticmethod
    def openmrs_mapping(patient: dict[str, Any]) -> dict[str, Any]:
        return {
            "uuid": patient.get("id", "unknown"),
            "identifiers": [
                {
                    "system": identifier.get("system"),
                    "value": identifier.get("value"),
                    "type": identifier.get("type", {}).get("text") if isinstance(identifier.get("type"), dict) else None,
                }
                for identifier in patient.get("identifier", [])
            ],
            "names": [
                {
                    "given": name.get("given", []),
                    "family": name.get("family"),
                    "use": name.get("use"),
                }
                for name in patient.get("name", [])
            ],
            "gender": patient.get("gender", "unknown"),
            "birthdate": patient.get("birthDate"),
            "address": patient.get("address", [{}])[0].get("line", [None])[0] if patient.get("address") else None,
        }

    @staticmethod
    def coerce_request(record: dict[str, Any]) -> dict[str, Any]:
        if record.get("record") and not record.get("patient"):
            record = dict(record["record"])
        if record.get("patient"):
            return record
        patient = FHIRMapper.legacy_record_to_patient(record)
        observations = FHIRMapper.legacy_record_to_observations(record)
        return {
            "patient": patient,
            "observations": observations,
            "bundle": FHIRMapper.legacy_record_to_bundle(record),
            "profile": "Base FHIR R4 Patient",
        }

    @staticmethod
    def map_patient(record: dict[str, Any]) -> dict[str, Any]:
        """Map the application patient payload into a FHIR Patient dictionary.

        Args:
            record: Raw patient record from the API request.

        Returns:
            A FHIR Patient-shaped dictionary that can be validated by the
            `fhir.resources` library or a downstream FHIR server.
        """

        return FHIRMapper.legacy_record_to_patient(record)

    @staticmethod
    def required_fields() -> list[str]:
        """Return the application fields required for FHIR mapping."""

        return ["id", "name", "age", "gender"]
