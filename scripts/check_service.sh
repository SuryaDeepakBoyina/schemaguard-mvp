#!/usr/bin/env bash
set -eu

# Simple service check script for SchemaGuard Health AI
# Usage: ./scripts/check_service.sh [BASE_URL]

BASE_URL=${1:-http://localhost:8000}

echo "Checking SchemaGuard service at ${BASE_URL}"

check() {
  name=$1
  shift
  cmd="$@"
  echo -n "- $name: "
  if output=$(eval "$cmd" 2>&1); then
    echo "OK"
    echo "$output" | sed -n '1,6p'
  else
    echo "FAILED"
    echo "$output"
  fi
  echo
}

echo "Health"
check "health" "curl -s ${BASE_URL}/health | jq ."

echo "Metrics (Prometheus text)"
check "metrics" "curl -s ${BASE_URL}/metrics | sed -n '1,12p'"

echo "Validate-record (good)"
check "validate-record-good" "curl -s -X POST ${BASE_URL}/validate-record -H 'Content-Type: application/json' -d '{\"id\":\"pat-001\",\"name\":\"Asha Devi\",\"age\":42,\"gender\":\"female\",\"vitals\":{},\"diagnoses\":[]}' | jq ."

echo "FHIR-check (good)"
check "fhir-check" "curl -s -X POST ${BASE_URL}/fhir-check -H 'Content-Type: application/json' -d '{\"record\":{\"id\":\"pat-001\",\"name\":\"Asha Devi\",\"age\":42,\"gender\":\"female\"}}' | jq ."

echo "Suggest-fixes (fallback or LLM)"
check "suggest-fixes" "curl -s -X POST ${BASE_URL}/suggest-fixes -H 'Content-Type: application/json' -d '{\"record\":{\"age\":150},\"issues\":[\"Age must be between 0 and 120\"]}' | jq ."

echo "Done. Use X-Correlation-Id header to trace requests in logs."
