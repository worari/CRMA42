#!/usr/bin/env bash

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$APP_DIR"

echo "[deploy] Installing root dependencies"
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

echo "[deploy] Building Next.js app"
npm run build

if ! command -v pm2 >/dev/null 2>&1; then
  echo "[deploy] pm2 is not installed. Install it with: npm i -g pm2"
  exit 1
fi

echo "[deploy] Starting or reloading services with PM2"
pm2 startOrReload ecosystem.config.js --env production

pm2 save
pm2 status

echo "[deploy] Done"
