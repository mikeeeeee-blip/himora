#!/bin/bash

# Manual deployment script
# Usage: ./scripts/deploy.sh [server|client|both]

set -e

DEPLOY_TARGET=${1:-"both"}
SERVER_HOST=${SERVER_HOST:-"your-server-ip"}
SERVER_USER=${SERVER_USER:-"ec2-user"}
SERVER_DIR="/opt/ninexgroup"
CLIENT_DIR="${SERVER_DIR}/client"
SERVER_PATH="${SERVER_DIR}/server"

echo "🚀 Starting manual deployment (target: $DEPLOY_TARGET)..."

if [ "$DEPLOY_TARGET" = "server" ] || [ "$DEPLOY_TARGET" = "both" ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📦 DEPLOYING SERVER"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # Create backup
  ssh "${SERVER_USER}@${SERVER_HOST}" << ENDSSH
    set -e
    cd ${SERVER_PATH} || (mkdir -p ${SERVER_DIR} && git clone YOUR_REPO_URL ${SERVER_PATH} && cd ${SERVER_PATH})
    
    # Backup
    BACKUP_DIR="${SERVER_DIR}/backups/\$(date +%Y%m%d_%H%M%S)"
    mkdir -p "\$BACKUP_DIR"
    cp -r . "\$BACKUP_DIR/" 2>/dev/null || true
    
    # Pull latest
    git fetch origin master
    git reset --hard origin/master
    
    # Install dependencies
    npm ci --production
    
    # Restart
    sudo systemctl restart ninexgroup-server || pm2 restart ninexgroup-server || (pkill -f "node index.js" && node index.js > /dev/null 2>&1 &)
    
    echo "✅ Server deployed!"
ENDSSH
fi

if [ "$DEPLOY_TARGET" = "client" ] || [ "$DEPLOY_TARGET" = "both" ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📦 DEPLOYING CLIENT"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # Build client
  echo "🔨 Building client..."
  cd client
  npm ci
  npm run build
  cd ..
  
  # Deploy
  ssh "${SERVER_USER}@${SERVER_HOST}" << ENDSSH
    set -e
    mkdir -p ${CLIENT_DIR}
    BACKUP_DIR="${SERVER_DIR}/backups/client_\$(date +%Y%m%d_%H%M%S)"
    mkdir -p "\$BACKUP_DIR"
    cp -r ${CLIENT_DIR}/dist "\$BACKUP_DIR/" 2>/dev/null || true
    rm -rf ${CLIENT_DIR}/dist
ENDSSH
  
  # Copy files
  scp -r client/dist/* "${SERVER_USER}@${SERVER_HOST}:${CLIENT_DIR}/dist/"
  
  # Reload web server
  ssh "${SERVER_USER}@${SERVER_HOST}" << ENDSSH
    sudo systemctl reload nginx || sudo service nginx reload || true
    echo "✅ Client deployed!"
ENDSSH
fi

echo ""
echo "✅ Deployment complete!"
echo "🧪 Please run smoke tests:"
echo "   - Auth flows"
echo "   - Header/nav + dashboard pages"
echo "   - API calls from client to server"
echo "   - Check console/network for errors"

