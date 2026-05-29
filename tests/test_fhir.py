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
