#!/usr/bin/dumb-init /bin/sh
set -e

cd /opt/app

PROFILE_DIR="${PROFILE_DIR:-/profiles}"
PROFILE_SECONDS="${PROFILE_SECONDS:-60}"
PROFILE_RATE="${PROFILE_RATE:-100}"
PROFILE_OUTPUT="${PROFILE_OUTPUT:-${PROFILE_DIR}/szurubooru-flamegraph.svg}"

mkdir -p "${PROFILE_DIR}"

echo "Running database migrations..."
alembic upgrade head

echo "Profiling szurubooru API on port ${PORT} - Running on ${THREADS} threads"
echo "Profile duration: ${PROFILE_SECONDS}s"
echo "Profile output: ${PROFILE_OUTPUT}"

exec py-spy record \
  --output "${PROFILE_OUTPUT}" \
  --duration "${PROFILE_SECONDS}" \
  --rate "${PROFILE_RATE}" \
  --subprocesses \
  -- \
  hupper -m waitress \
    --listen "*:${PORT}" \
    --threads "${THREADS}" \
    szurubooru.facade:app