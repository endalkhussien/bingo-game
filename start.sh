#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo ""
echo "  ========================================"
echo "    Minch Bingo - Desktop Application"
echo "  ========================================"
echo ""

if [ ! -d "node_modules" ]; then
  echo "[1/2] Installing dependencies..."
  npm install
fi

echo "[2/2] Starting desktop app..."
echo ""
echo "  Login: agent/agent123  or  admin/admin123"
echo ""

npm run desktop:dev
