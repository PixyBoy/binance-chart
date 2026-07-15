#!/usr/bin/env bash
# One-time bootstrap for a fresh Ubuntu VPS.
# TODO: run manually via SSH the first time; not part of CI/CD yet.
set -euo pipefail

curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"

# TODO: create a non-root deploy user here instead of using root, e.g.:
# sudo adduser deploy && sudo usermod -aG docker deploy

# TODO: basic firewall — adjust ports once SSL/domain are finalized
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

mkdir -p /opt/trading-backend
echo "Now: git clone the repo into /opt/trading-backend and copy .env there."
