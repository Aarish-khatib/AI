#!/usr/bin/env bash
set -euo pipefail

checkpoint_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$checkpoint_root"

sha256sum --check handoff/checksums.sha256

for excluded in node_modules .next dist .sites-runtime .vercel .wrangler coverage out outputs work; do
  if [[ -e "$excluded" ]]; then
    echo "Unexpected generated directory in checkpoint: $excluded" >&2
    exit 1
  fi
done

if find . -type f \( -name '.env' -o -name '.env.local' -o -name '.env.production' -o -name '*.zip' \) -print -quit | grep -q .; then
  echo "Unexpected environment file or nested ZIP in checkpoint." >&2
  exit 1
fi

node -e '
const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 22 || (major === 22 && minor < 13)) {
  throw new Error("Node.js 22.13 or newer is required.");
}
'

if [[ "${1:-}" == "--install" ]]; then
  npm run install:ci
  npm run release:validate
else
  echo "Source integrity and exclusions passed."
  echo "Run with --install for the complete build and test gate."
fi
