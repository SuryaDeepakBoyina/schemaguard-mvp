"""Tests for FHIR compatibility checks."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_fhir_check_valid_payload() -> None:
    """A minimally complete record should map cleanly to FHIR."""

    response = client.post(
        "/fhir-check",
        json={
            "record": {
                "id": "pat-001",
                "name": "Asha Devi",
                "age": 42,
                "gender": "female",
            }
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["is_valid"] is True
    assert payload["missing_required"] == []


def test_fhir_check_invalid_payload_missing_fields() -> None:
    """Missing required fields should be reported back to the caller."""

    response = client.post("/fhir-check", json={"record": {"name": "Asha Devi"}})

    assert response.status_code == 200
    payload = response.json()
    assert payload["is_valid"] is False
    assert "id" in payload["missing_required"]


def test_validate_fhir_returns_detailed_resources() -> None:
    """The FHIR-native endpoint should return structured patient, observation, and bundle data."""

    response = client.post(
        "/validate-fhir",
        json={
            "profile": "Base FHIR R4 Patient",
            "patient": {
                "resourceType": "Patient",
                "id": "pat-001",
                "identifier": [
                    {
                        "use": "official",
                        "system": "http://hospital.example.org/mrn",
                        "value": "12345",
                        "type": {
                            "coding": [
                                {
                                    "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
                                    "code": "MR",
                                    "display": "Medical record number",
                                }
                            ],
                            "text": "Medical record number",
                        },
                    }
                ],
                "name": [
                    {
                        "use": "official",
                        "family": "Devi",
                        "given": ["Asha"],
                    }
                ],
                "telecom": [
                    {"system": "phone", "value": "+91-9876543210", "use": "mobile"}
                ],
                "gender": "female",
                "birthDate": "2020-01-15",
            },
            "observations": [
                {
                    "resourceType": "Observation",
                    "id": "obs-001",
                    "status": "final",
                    "category": [
                        {
                            "coding": [
                                {
                                    "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                                    "code": "vital-signs",
                                    "display": "Vital Signs",
                                }
                            ],
                            "text": "Vital Signs",
                        }
                    ],
                    "code": {
                        "coding": [
                            {
                                "system": "http://loinc.org",
                                "code": "85354-9",
                                "display": "Blood pressure panel",
                            }
                        ],
                        "text": "Blood pressure panel",
                    },
                    "subject": {"reference": "Patient/pat-001", "type": "Patient"},
                    "effectiveDateTime": "2026-05-30T10:30:00Z",
                    "component": [
                        {
                            "code": {
                                "coding": [
                                    {
                                        "system": "http://loinc.org",
                                        "code": "8480-6",
                                        "display": "Systolic blood pressure",
                                    }
                                ],
                                "text": "Systolic blood pressure",
                            },
                            "valueQuantity": {
                                "value": 120,
                                "unit": "mmHg",
                                "system": "http://unitsofmeasure.org",
                                "code": "mm[Hg]",
                            },
                        },
                        {
                            "code": {
                                "coding": [
                                    {
                                        "system": "http://loinc.org",
                                        "code": "8462-4",
                                        "display": "Diastolic blood pressure",
                                    }
                                ],
                                "text": "Diastolic blood pressure",
                            },
                            "valueQuantity": {
                                "value": 80,
                                "unit": "mmHg",
                                "system": "http://unitsofmeasure.org",
                                "code": "mm[Hg]",
                            },
                        },
                    ],
                }
            ],
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["fhir_compliant"] is True
    assert payload["patient"]["resourceType"] == "Patient"
    assert payload["observations"][0]["resourceType"] == "Observation"
    assert payload["bundle"]["resourceType"] == "Bundle"
    assert payload["openmrs_mapping"]["uuid"] == "pat-001"
