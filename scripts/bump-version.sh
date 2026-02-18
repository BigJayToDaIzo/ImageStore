#!/usr/bin/env bash
# Usage: ./scripts/bump-version.sh 0.3.9
# Bumps version in all files, commits, tags, and pushes

set -euo pipefail

VERSION="${1:?Usage: bump-version.sh <version>}"

# Strip leading 'v' if present
VERSION="${VERSION#v}"

# Validate semver format
if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Error: version must be semver (e.g. 0.3.9)" >&2
  exit 1
fi

cd "$(git rev-parse --show-toplevel)/client"

# 1. package.json
sed -i.bak "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" package.json && rm package.json.bak

# 2. tauri.conf.json
sed -i.bak "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" src-tauri/tauri.conf.json && rm src-tauri/tauri.conf.json.bak

# 3. Cargo.toml (only the package version, not dependency versions)
sed -i.bak "0,/^version = \"[^\"]*\"/s//version = \"$VERSION\"/" src-tauri/Cargo.toml && rm src-tauri/Cargo.toml.bak

cd "$(git rev-parse --show-toplevel)"

git add client/package.json client/src-tauri/tauri.conf.json client/src-tauri/Cargo.toml

echo ""
read -rp "Commit message [v${VERSION}]: " MSG
MSG="${MSG:-v${VERSION}}"

git commit -m "${MSG}"
git tag "v${VERSION}"

echo ""
echo "✓ Committed and tagged v${VERSION}"
echo "  Run: git push && git push --tags"
