"""Tests for Prometheus metrics exposure."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_metrics_endpoint_returns_prometheus_text() -> None:
    """The metrics endpoint should emit Prometheus exposition text."""

    response = client.get("/metrics")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/plain")
    assert "# HELP schema_guard_total_validations" in response.text
