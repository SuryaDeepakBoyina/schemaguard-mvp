"""Tests for AI suggestion formatting."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_suggest_fixes_formats_mocked_llm_response(monkeypatch) -> None:
    """The endpoint should normalize a mock LLM response into the response model."""

    async def fake_suggest_fixes(record, issues):
        return {
            "suggestions": [
                {
                    "field": "age",
                    "original": 150,
                    "suggested": 120,
                    "reason": "Age is above the supported limit.",
                    "confidence": 0.92,
                    "needs_review": False,
                }
            ]
        }

    monkeypatch.setattr(
        "app.routers.suggestions.suggestion_service.llm_service.suggest_fixes",
        fake_suggest_fixes,
    )

    response = client.post(
        "/suggest-fixes",
        json={"record": {"age": 150}, "issues": ["Age must be between 0 and 120"]},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["suggestions"][0]["field"] == "age"
    assert payload["suggestions"][0]["confidence"] == 0.92
