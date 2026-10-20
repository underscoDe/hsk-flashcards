#!/usr/bin/env bash
# Downloads the HSK vocabulary JSON files into data/.
# Source: https://github.com/gigacool/hanyu-shuiping-kaoshi (MIT), pinned to a commit.
# To update: change COMMIT, run this script, review `git diff data/`,
# then bump VERSION in sw.js so clients refresh their cache.
set -euo pipefail

COMMIT="5875a36415856c456cbc8364fba5306a415a9ebc"
REPO="https://raw.githubusercontent.com/gigacool/hanyu-shuiping-kaoshi/${COMMIT}"
DATA_DIR="$(cd "$(dirname "$0")/.." && pwd)/data"

mkdir -p "$DATA_DIR"
for level in 1 2 3 4 5 6; do
  file="hsk-level-${level}.json"
  curl -fsSL "${REPO}/json/${file}" -o "${DATA_DIR}/${file}"
  echo "✓ ${file}"
done

# Keep the upstream MIT notice alongside the data
curl -fsSL "${REPO}/LICENSE" -o "${DATA_DIR}/LICENSE"
echo "✓ LICENSE"
