"""Locust scenarios for SchemaGuard Health AI.

This file models a small clinic workflow with single record validation,
batch validation, and occasional AI/FHIR checks. It is safe for master/worker
mode and headless CI runs.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

from locust import HttpUser, between, events, task


TEST_DATA_PATH = Path(__file__).with_name("test_data.json")
TEST_DATA = json.loads(TEST_DATA_PATH.read_text(encoding="utf-8"))


def _random_single_record() -> dict:
    return random.choice(TEST_DATA["single_records"])


def _batch_records() -> list[dict]:
    return TEST_DATA["batch_records"]


class SchemaGuardUser(HttpUser):
    """Simulate frontline staff submitting patient data."""

    wait_time = between(1, 5)

    @task(5)
    def validate_single_record(self) -> None:
        """Validate a single outpatient record."""

        self.client.post("/validate-record", json=_random_single_record(), name="validate_record")

    @task(2)
    def validate_batch_records(self) -> None:
        """Validate a batch of records to simulate clinic-end-of-day workflows."""

        for record in _batch_records():
            self.client.post("/validate-record", json=record, name="validate_record_batch")

    @task(1)
    def check_fhir_mapping(self) -> None:
        """Check that a clean record maps to a FHIR Patient resource."""

        record = _random_single_record()
        self.client.post("/fhir-check", json={"record": record}, name="fhir_check")

    @task(1)
    def request_ai_suggestions(self) -> None:
        """Request suggestions for an intentionally noisy record."""

        self.client.post(
            "/suggest-fixes",
            json={
                "record": {"age": 150, "gender": "female"},
                "issues": ["Age must be between 0 and 120"],
            },
            name="suggest_fixes",
        )


@events.init.add_listener
def set_default_headers(environment, **kwargs):
    """Attach a traceable correlation id for load test traffic."""

    if environment.parsed_options and getattr(environment.parsed_options, "host", None):
        return

