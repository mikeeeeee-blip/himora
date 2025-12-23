#!/bin/bash

# Deployment Script for fix#15 Branch
# This script automates the deployment process to the server

set -e  # Exit on any error

echo "🚀 Starting deployment from fix#15 branch..."
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Server details
SERVER_HOST="ec2-13-50-107-204.eu-north-1.compute.amazonaws.com"
SERVER_USER="ec2-user"
KEY_FILE="my-new-key.pem"
BRANCH="fix#15"

echo -e "${YELLOW}Step 1: Checking SSH key...${NC}"
if [ ! -f "$KEY_FILE" ]; then
    echo -e "${RED}❌ Error: SSH key file '$KEY_FILE' not found!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ SSH key found${NC}"

echo -e "\n${YELLOW}Step 2: Connecting to server and deploying...${NC}"

# SSH into server and run deployment commands
ssh -i "$KEY_FILE" "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
    set -e
    
    echo "📦 Connected to server"
    echo "======================"
    
    # Navigate to project directory
    cd ~/himora || cd /home/ec2-user/himora || {
        echo "❌ Error: himora directory not found!"
        exit 1
    }
    
    echo "📂 Current directory: $(pwd)"
    
    # Check current branch
    echo -e "\n🔍 Checking current branch..."
    CURRENT_BRANCH=$(git branch --show-current)
    echo "Current branch: $CURRENT_BRANCH"
    
    # Stash any local changes
    if ! git diff-index --quiet HEAD --; then
        echo "⚠️  Local changes detected, stashing..."
        git stash
    fi
    
    # Switch to fix#15 branch
    echo -e "\n🔄 Switching to fix#15 branch..."
    git checkout 'fix#15' || {
        echo "❌ Error: Could not checkout fix#15 branch"
        exit 1
    }
    
    # Pull latest changes
    echo -e "\n⬇️  Pulling latest changes from fix#15..."
    git pull origin 'fix#15' || {
        echo "❌ Error: Could not pull latest changes"
        exit 1
    }
    
    echo -e "\n✅ Code updated successfully"
    
    # Check if dependencies need updating
    echo -e "\n📦 Checking dependencies..."
    
    # Server dependencies
    if [ -f "server/package.json" ]; then
        cd server
        echo "Checking server dependencies..."
        npm install --production
        cd ..
    fi
    
    # Client dependencies
    if [ -f "client/package.json" ]; then
        cd client
        echo "Checking client dependencies..."
        npm install
        cd ..
    fi
    
    # Build client application
    echo -e "\n🏗️  Building client application..."
    cd client
    npm run build || {
        echo "❌ Error: Client build failed!"
        exit 1
    }
    cd ..
    
    echo -e "\n✅ Build completed successfully"
    
    # Create logs directory if it doesn't exist
    echo -e "\n📁 Ensuring logs directory exists..."
    mkdir -p server/logs || true
    
    # Restart PM2 processes using ecosystem config
    echo -e "\n🔄 Restarting PM2 processes..."
    cd server
    
    # Stop existing process if running
    pm2 stop ninex-group-api 2>/dev/null || true
    pm2 delete ninex-group-api 2>/dev/null || true
    
    # Start with ecosystem config
    if [ -f "ecosystem.config.js" ]; then
        pm2 start ecosystem.config.js || {
            echo "❌ Error: PM2 start with ecosystem config failed!"
            echo "Falling back to direct start..."
            pm2 start index.js --name ninex-group-api --log server/logs/pm2-out.log --error server/logs/pm2-error.log --time
        }
    else
        echo "⚠️  ecosystem.config.js not found, starting directly..."
        pm2 start index.js --name ninex-group-api --log server/logs/pm2-out.log --error server/logs/pm2-error.log --time
    fi
    
    cd ..
    
    # Save PM2 configuration
    pm2 save
    
    echo -e "\n✅ PM2 processes restarted"
    
    # Check PM2 status
    echo -e "\n📊 PM2 Status:"
    pm2 status
    
    # Show recent logs from files
    echo -e "\n📋 Recent logs from files (last 30 lines):"
    if [ -f "server/logs/pm2-out.log" ]; then
        echo "--- stdout logs ---"
        tail -n 30 server/logs/pm2-out.log || echo "No stdout logs yet"
    fi
    if [ -f "server/logs/pm2-error.log" ]; then
        echo "--- error logs ---"
        tail -n 30 server/logs/pm2-error.log || echo "No error logs yet"
    fi
    
    # Also show PM2 logs
    echo -e "\n📋 PM2 live logs (last 20 lines):"
    pm2 logs ninex-group-api --lines 20 --nostream || pm2 logs --lines 20 --nostream
    
    echo -e "\n${GREEN}✅ Deployment completed successfully!${NC}"
    echo "=========================================="
    echo "🚀 Application is now live!"
    echo ""
    echo "Next steps:"
    echo "1. Monitor logs: pm2 logs"
    echo "2. Check status: pm2 status"
    echo "3. Monitor resources: pm2 monit"
ENDSSH

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✅ Deployment script completed successfully!${NC}"
else
    echo -e "\n${RED}❌ Deployment failed! Check the errors above.${NC}"
    exit 1
fi

