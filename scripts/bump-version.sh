#!/bin/bash
# Bump version in package.json files and update CHANGELOG.md

set -e

# Get current version
CURRENT_VERSION=$(node -p "require('./server/package.json').version")
echo "Current version: $CURRENT_VERSION"

# Parse version parts
IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
MAJOR=${VERSION_PARTS[0]}
MINOR=${VERSION_PARTS[1]}
PATCH=${VERSION_PARTS[2]}

# Determine version bump type (default: patch)
BUMP_TYPE=${1:-patch}

case $BUMP_TYPE in
  major)
    NEW_VERSION="$((MAJOR + 1)).0.0"
    ;;
  minor)
    NEW_VERSION="${MAJOR}.$((MINOR + 1)).0"
    ;;
  patch)
    NEW_VERSION="${MAJOR}.${MINOR}.$((PATCH + 1))"
    ;;
  *)
    echo "Invalid bump type: $BUMP_TYPE (use: major, minor, patch)"
    exit 1
    ;;
esac

echo "Bumping version to: $NEW_VERSION"

# Update server package.json
node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('./server/package.json', 'utf8'));
  pkg.version = '$NEW_VERSION';
  fs.writeFileSync('./server/package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# Update client package.json
node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('./client/package.json', 'utf8'));
  pkg.version = '$NEW_VERSION';
  fs.writeFileSync('./client/package.json', JSON.stringify(pkg, null, 2) + '\n');
"

echo "✅ Version bumped to $NEW_VERSION in package.json files"

