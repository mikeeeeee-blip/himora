#!/bin/bash
# Rollback script to revert to previous deployment

set -e

VERSION_TAG=${1:-}

if [ -z "$VERSION_TAG" ]; then
  echo "Usage: ./scripts/rollback.sh <version_tag>"
  echo "Example: ./scripts/rollback.sh v1.0.0"
  exit 1
fi

SERVER_HOST="ec2-13-50-107-204.eu-north-1.compute.amazonaws.com"
SERVER_USER="ec2-user"
DEPLOY_PATH="/home/ec2-user/ninex-group"
SSH_KEY="${SSH_KEY:-~/.ssh/my-new-key.pem}"

echo "🔄 Rolling back to version: $VERSION_TAG"

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
  echo "❌ SSH key not found at: $SSH_KEY"
  echo "Set SSH_KEY environment variable or place key at ~/.ssh/my-new-key.pem"
  exit 1
fi

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" << ENDSSH
  set -e
  cd $DEPLOY_PATH
  
  echo "📦 Checking out version: $VERSION_TAG"
  git fetch --all --tags
  git checkout $VERSION_TAG
  
  echo "📦 Installing dependencies..."
  cd server
  npm ci --production
  
  echo "🔄 Restarting server..."
  pm2 restart ninex-group-api || pm2 start server/index.js --name ninex-group-api
  pm2 save
  
  echo "✅ Rollback completed to $VERSION_TAG"
  
  echo "🔍 Checking server health..."
  sleep 5
  curl -f http://localhost:5001/api/health && echo "✅ Health check passed!" || echo "⚠️  Health check failed"
ENDSSH

echo "✅ Rollback to $VERSION_TAG completed successfully!"
