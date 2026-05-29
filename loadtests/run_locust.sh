#!/usr/bin/env bash
set -euo pipefail

HOST=${1:-http://localhost:8000}
USERS=${USERS:-50}
SPAWN_RATE=${SPAWN_RATE:-10}
DURATION=${DURATION:-60s}
CSV_PREFIX=${CSV_PREFIX:-loadtest_results/schema_guard}
HTML_REPORT=${HTML_REPORT:-loadtest_results/schema_guard.html}

mkdir -p loadtest_results

locust \
  -f loadtests/locustfile.py \
  --headless \
  --host "$HOST" \
  -u "$USERS" \
  -r "$SPAWN_RATE" \
  -t "$DURATION" \
  --csv "$CSV_PREFIX" \
  --html "$HTML_REPORT"

STATS_FILE="${CSV_PREFIX}_stats.csv"

python - "$STATS_FILE" <<'PY'
import csv
import sys

path = sys.argv[1]
p95_limit = 500.0
error_limit = 0.02

with open(path, newline='', encoding='utf-8') as handle:
    rows = list(csv.DictReader(handle))

aggregated = next((row for row in rows if row.get('Name') == 'Aggregated'), None)
if aggregated is None:
    raise SystemExit('Aggregated row not found in Locust CSV output')

median = float(aggregated.get('50%', '0') or 0)
p95 = float(aggregated.get('95%', '0') or 0)
p99 = float(aggregated.get('99%', '0') or 0)
failures = float(aggregated.get('Failure Count', '0') or 0)
requests = float(aggregated.get('Request Count', '0') or 0)
error_rate = failures / requests if requests else 0.0

print(f'p50={median:.2f}ms p95={p95:.2f}ms p99={p99:.2f}ms error_rate={error_rate:.4f}')

if p95 > p95_limit:
    raise SystemExit(f'p95 latency too high: {p95:.2f}ms > {p95_limit:.2f}ms')

if error_rate > error_limit:
    raise SystemExit(f'error rate too high: {error_rate:.4f} > {error_limit:.4f}')
PY
