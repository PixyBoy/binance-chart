#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

# TODO: ensure /opt/trading-backend/.env exists on the server with real
# production values before running this for the first time.

docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
docker image prune -f
