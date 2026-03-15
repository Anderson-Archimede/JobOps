#!/usr/bin/env bash
# Build Job-Ops Docker image then minify it with SlimToolkit (slim build).
# Run from the monorepo root: ./scripts/build-slim.sh
#
# Prerequisites:
#   - Docker
#   - SlimToolkit: https://slimtoolkit.org/ (e.g. brew install slim)

set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

TARGET_IMAGE="job-ops:full"
SLIM_TAG="job-ops:slim"

echo "================================================"
echo "  Job-Ops Slim Build (SlimToolkit)"
echo "================================================"
echo ""

if ! command -v slim &>/dev/null; then
  echo "SlimToolkit (slim) is not in PATH. Install it first:"
  echo "  brew install slim"
  echo "  or: https://slimtoolkit.org/"
  exit 1
fi

echo "[1/2] Building Docker image: $TARGET_IMAGE ..."
docker build -t "$TARGET_IMAGE" -f Dockerfile .

echo "[2/2] Minifying image with SlimToolkit -> $SLIM_TAG ..."
slim build \
  --target "$TARGET_IMAGE" \
  --tag "$SLIM_TAG" \
  --http-probe-cmd "GET http://localhost:3001/health" \
  --expose 3001 \
  --continue-after probe

echo ""
echo "Done. Run the slim image with:"
echo "  docker run --rm -p 3005:3001 $SLIM_TAG"
echo ""
