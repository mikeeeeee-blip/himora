#!/bin/bash
# Release script: bump version, update CHANGELOG, create tag, and push

set -e

BUMP_TYPE=${1:-patch}

if [ "$BUMP_TYPE" != "major" ] && [ "$BUMP_TYPE" != "minor" ] && [ "$BUMP_TYPE" != "patch" ]; then
  echo "Usage: ./scripts/release.sh [major|minor|patch]"
  exit 1
fi

echo "🚀 Starting release process..."

# 1. Bump version
echo "📦 Bumping version ($BUMP_TYPE)..."
./scripts/bump-version.sh $BUMP_TYPE

# Get new version
NEW_VERSION=$(node -p "require('./server/package.json').version")
VERSION_TAG="v${NEW_VERSION}"

echo "New version: $NEW_VERSION"
echo "Version tag: $VERSION_TAG"

# 2. Update CHANGELOG.md (move Unreleased to new version)
echo "📝 Updating CHANGELOG.md..."

# Get current date
RELEASE_DATE=$(date +%Y-%m-%d)

# Create temporary file with updated changelog
node <<EOF
const fs = require('fs');
const changelog = fs.readFileSync('./CHANGELOG.md', 'utf8');

// Replace [Unreleased] with new version
const updated = changelog.replace(
  '## [Unreleased]',
  \`## [\${process.env.VERSION_TAG}] - \${process.env.RELEASE_DATE}\n\n## [Unreleased]\`
);

fs.writeFileSync('./CHANGELOG.md', updated);
console.log('✅ CHANGELOG.md updated');
EOF

# 3. Stage changes
echo "📋 Staging changes..."
git add server/package.json client/package.json CHANGELOG.md

# 4. Commit
echo "💾 Committing changes..."
git commit -m "chore: release $VERSION_TAG" || echo "No changes to commit"

# 5. Create tag
echo "🏷️  Creating tag $VERSION_TAG..."
git tag -a "$VERSION_TAG" -m "Release $VERSION_TAG"

# 6. Push to master
echo "📤 Pushing to master..."
git push origin master

# 7. Push tags
echo "📤 Pushing tags..."
git push origin "$VERSION_TAG"

echo "✅ Release $VERSION_TAG completed!"
echo "🔗 CI/CD pipeline will automatically deploy this release"
