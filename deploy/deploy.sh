#!/usr/bin/env bash
# Pull the latest code and (re)start the app. Run on the VM from the repo folder.
# Set DOMAIN=smartnextmovenow.tech once DNS points here for automatic HTTPS.
set -euo pipefail
cd "$(dirname "$0")/.."

git pull --ff-only
docker compose up -d --build
docker compose ps
