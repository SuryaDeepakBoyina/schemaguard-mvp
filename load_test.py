"""Locust load test for SchemaGuard record validation."""

from __future__ import annotations

from locust import HttpUser, between, task


class SchemaGuardUser(HttpUser):
    """Simulate healthcare staff validating patient records."""

    wait_time = between(1, 2)

    @task(4)
    def validate_record(self) -> None:
        """Send a typical record validation request."""

        self.client.post(
            "/validate-record",
            json={
                "id": "pat-001",
                "name": "Asha Devi",
                "age": 42,
                "gender": "female",
                "vitals": {"bp": "120/80"},
                "diagnoses": ["hypertension"],
            },
        )

    @task(1)
    def fhir_check(self) -> None:
        """Send a FHIR compatibility request."""

        self.client.post(
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
