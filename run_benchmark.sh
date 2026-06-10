#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
RESULT_DIR="$ROOT_DIR/benchmark/results/$(date +%Y%m%d_%H%M%S)"

if [[ -f "$ROOT_DIR/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$ROOT_DIR/.env"
    set +a
fi

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-benchmark}"
DB_USER="${DB_USER:-dweb}"
DB_PASSWORD="${DB_PASSWORD:-1234}"
DURATION="${DURATION:-60}"

CLIENTS=(10 50 100)
WORKERS=(4 8 16)

mkdir -p "$RESULT_DIR"

run_case() {
    local label="$1"
    local workload_file="$2"

    for client_count in "${CLIENTS[@]}"; do
        for worker_count in "${WORKERS[@]}"; do
            local output_file="$RESULT_DIR/${label}_c${client_count}_j${worker_count}.txt"

            echo "[RUN] $label c=${client_count} j=${worker_count} T=${DURATION}s"

            PGPASSWORD="$DB_PASSWORD" pgbench \
                -h "$DB_HOST" \
                -p "$DB_PORT" \
                -U "$DB_USER" \
                -d "$DB_NAME" \
                -f "$workload_file" \
                -n \
                -c "$client_count" \
                -j "$worker_count" \
                -T "$DURATION" | tee "$output_file"
        done
    done
}

run_case "read_committed" "$ROOT_DIR/benchmark/join_workload.sql"
run_case "serializable" "$ROOT_DIR/benchmark/join_workload_serializable.sql"

echo
echo "Benchmark complete. Results are stored in: $RESULT_DIR"
