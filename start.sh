#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js not found. Install Node.js >= 18.12 first."
  exit 1
fi

if ! node -e "const [maj, min] = process.versions.node.split('.').map(Number); if (maj < 18 || (maj === 18 && min < 12)) process.exit(1);" >/dev/null 2>&1; then
  echo "Node.js >= 18.12 is required."
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm not found. Install with: npm i -g pnpm@8.15.9"
  exit 1
fi

if [ ! -d node_modules ]; then
  pnpm install
fi

pnpm dev
