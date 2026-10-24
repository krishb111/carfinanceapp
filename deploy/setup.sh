#!/usr/bin/env bash
# One-time setup on a fresh Ubuntu Vultr VM. Run as root:
#   bash deploy/setup.sh
set -euo pipefail

if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi

ufw allow OpenSSH || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true

echo "Docker installed. Next: copy .env here, then run deploy/deploy.sh"
