#!/usr/bin/env bash
set -e

echo ""
echo "==> @lazysnap setup"
echo ""

# Step 1: install and build core first
# react and angular depend on file:../core, so core must exist before their install
echo "[1/3] Installing @lazysnap/core..."
npm install --prefix packages/core

echo "[1/3] Building @lazysnap/core..."
npm run build --prefix packages/core

# Step 2: install react (now that core/dist exists)
echo "[2/3] Installing @lazysnap/react..."
npm install --prefix packages/react

echo "[2/3] Building @lazysnap/react..."
npm run build --prefix packages/react

# Step 3: install angular
echo "[3/3] Installing @lazysnap/angular..."
npm install --prefix packages/angular

echo "[3/3] Building @lazysnap/angular..."
npm run build --prefix packages/angular

echo ""
echo "✅ All packages installed and built."
echo ""
echo "Next steps:"
echo "  npm run build:core     rebuild core"
echo "  npm run build:react    rebuild react"
echo "  npm run build:angular  rebuild angular"
echo "  npm test               run core tests"
echo "  open apps/demo/index.html"
echo ""
