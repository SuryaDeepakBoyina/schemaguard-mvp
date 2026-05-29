import pytest, os
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)
SAMPLE_SPEC = {"openapi": "3.0.3", "info": {"title": "Test", "version": "1.0.0"}, "paths": {"/health": {}}}

def test_valid_schema():
    resp = client.post("/validate", json={"schema_json": SAMPLE_SPEC})
    assert resp.status_code == 200
    assert resp.json()["valid"] is True

def test_invalid_schema():
    resp = client.post("/validate", json={"schema_json": {"foo": "bar"}})
    assert resp.status_code == 200
    assert resp.json()["valid"] is False