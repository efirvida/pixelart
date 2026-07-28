#!/usr/bin/env bash
# Deploy script — runs on the VPS via GitHub Actions
set -e

echo "=== Nginx config ==="
sudo cp /opt/pixelart/repo/deploy/nginx.conf /etc/nginx/sites-available/pixelart.conf
sudo ln -sf /etc/nginx/sites-available/pixelart.conf /etc/nginx/sites-enabled/pixelart.conf

echo "=== Pull latest code ==="
cd /opt/pixelart/repo
git pull origin main

echo "=== Backend: install deps ==="
cd /opt/pixelart/repo/backend
source .venv/bin/activate
pip install -U pip 2>/dev/null
pip install . 2>&1 | tail -2

echo "=== Frontend: build ==="
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
nvm use 20 2>/dev/null || true
cd /opt/pixelart/repo/frontend
npm ci 2>&1 | tail -1
npx vite build 2>&1 | tail -3

echo "=== Restart backend ==="
sudo systemctl restart pixelart

echo "=== Reload nginx ==="
sudo nginx -t && sudo systemctl reload nginx

echo "=== Deploy OK ==="
