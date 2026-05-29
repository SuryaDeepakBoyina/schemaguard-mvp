"""Tests for patient record validation models."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.routers.validation import PatientRecord


def test_valid_patient_record() -> None:
    """A complete record within expected bounds should validate."""

    record = PatientRecord(
        id="pat-001",
        name="Asha Devi",
        age=42,
        gender="female",
        vitals={"bp": "120/80"},
        diagnoses=["hypertension"],
    )

    assert record.age == 42
    assert record.gender == "female"


def test_invalid_patient_record_missing_required_fields() -> None:
    """Missing required fields should raise a validation error."""

    with pytest.raises(ValidationError):
        PatientRecord(name="Asha Devi", age=42, gender="female")


def test_patient_record_edge_age_limit() -> None:
    """The upper supported age bound should still be accepted."""

    record = PatientRecord(
        id="pat-002",
        name="Elder Patient",
        age=150,
        gender="male",
        vitals={},
        diagnoses=[],
    )

    assert record.age == 150