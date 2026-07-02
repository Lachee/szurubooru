#!/usr/bin/dumb-init /bin/sh
set -e
cd /opt/app

alembic upgrade head

echo "Starting szurubooru API debugger on port ${PORT} - Debugpy on ${DEBUGPY_PORT:-5678}"

exec python3 -m debugpy \
  --listen "0.0.0.0:${DEBUGPY_PORT:-5678}" \
  --wait-for-client \
  -m waitress \
  --listen "*:${PORT}" \
  --threads "${THREADS}" \
  szurubooru.facade:app