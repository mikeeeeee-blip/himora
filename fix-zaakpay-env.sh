#!/bin/bash
# Zaakpay Environment Fix Script (Corrected paths)
# This script helps fix the Zaakpay encrypted name issue

set -e

echo "🔧 Zaakpay Environment Fix Script"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Correct credentials
TEST_SECRET_KEY="0678056d96914a8583fb518caf42828a"
TEST_MERCHANT_ID="d22b6680ce804b1a81cdccb69a1285f1"
PROD_SECRET_KEY="8213da8027db44aa937e203ce2745cfe"
PROD_MERCHANT_ID="a55fa97d585646228a70d0e6ae5db840"

echo "📋 Step 1: Detecting paths and checking environment files..."
echo ""

# Auto-detect user and base directory
CURRENT_USER=$(whoami)
HOME_DIR=$(eval echo ~$CURRENT_USER)

# Try to find the actual paths
# Check common locations
if [ -d "$HOME_DIR/shaktisewa-krishi" ]; then
    KRISHI_DIR="$HOME_DIR/shaktisewa-krishi"
elif [ -d "$HOME_DIR/himora/krishi-shaktisewa" ]; then
    KRISHI_DIR="$HOME_DIR/himora/krishi-shaktisewa"
elif [ -d "/home/ubuntu/shaktisewa-krishi" ]; then
    KRISHI_DIR="/home/ubuntu/shaktisewa-krishi"
elif [ -d "/home/pranjal/shaktisewa-krishi" ]; then
    KRISHI_DIR="/home/pranjal/shaktisewa-krishi"
else
    echo -e "${RED}❌ Could not find Next.js app directory${NC}"
    echo "   Please specify the path manually or ensure the directory exists"
    exit 1
fi

if [ -d "$HOME_DIR/himora/server" ]; then
    SERVER_DIR="$HOME_DIR/himora/server"
elif [ -d "/home/ubuntu/himora/server" ]; then
    SERVER_DIR="/home/ubuntu/himora/server"
elif [ -d "/home/pranjal/himora/server" ]; then
    SERVER_DIR="/home/pranjal/himora/server"
else
    echo -e "${RED}❌ Could not find server directory${NC}"
    echo "   Please specify the path manually or ensure the directory exists"
    exit 1
fi

KRISHI_ENV="$KRISHI_DIR/.env"
SERVER_ENV="$SERVER_DIR/.env"

echo "📁 Detected paths:"
echo "   User: $CURRENT_USER"
echo "   Home: $HOME_DIR"
echo "   Next.js app: $KRISHI_DIR"
echo "   Server: $SERVER_DIR"
echo ""

##############################
# Fix krishi-shaktisewa/.env
##############################
if [ -f "$KRISHI_ENV" ]; then
    echo "✅ Found shaktisewa-krishi/.env"
    
    if grep -q "ZACKPAY_SECRET_KEY_TEST=$TEST_SECRET_KEY" "$KRISHI_ENV"; then
        echo -e "${GREEN}✅ Test secret key is correct in shaktisewa-krishi/.env${NC}"
    else
        echo -e "${RED}❌ Test secret key is missing or incorrect in shaktisewa-krishi/.env${NC}"
        echo "   Updating with correct Zaakpay configuration..."

        # Remove old lines if exist
        sed -i '/ZACKPAY_MODE=/d' "$KRISHI_ENV" || true
        sed -i '/ZACKPAY_MERCHANT_ID_TEST=/d' "$KRISHI_ENV" || true
        sed -i '/ZACKPAY_SECRET_KEY_TEST=/d' "$KRISHI_ENV" || true
        sed -i '/ZACKPAY_MERCHANT_ID=/d' "$KRISHI_ENV" || true
        sed -i '/ZACKPAY_SECRET_KEY=/d' "$KRISHI_ENV" || true
        sed -i '/ZACKPAY_CALLBACK_URL_TEST=/d' "$KRISHI_ENV" || true
        sed -i '/ZACKPAY_CALLBACK_URL_PRODUCTION=/d' "$KRISHI_ENV" || true
        sed -i '/ZACKPAY_WEBSITE_URL=/d' "$KRISHI_ENV" || true
        sed -i '/NEXT_PUBLIC_WEBSITE_URL=/d' "$KRISHI_ENV" || true
        sed -i '/NEXT_PUBLIC_SERVER_URL=/d' "$KRISHI_ENV" || true

        cat >> "$KRISHI_ENV" << EOF

# Zaakpay Configuration - Updated $(date)
ZACKPAY_MODE=test
ZACKPAY_MERCHANT_ID_TEST=$TEST_MERCHANT_ID
ZACKPAY_SECRET_KEY_TEST=$TEST_SECRET_KEY
ZACKPAY_MERCHANT_ID=$PROD_MERCHANT_ID
ZACKPAY_SECRET_KEY=$PROD_SECRET_KEY
ZACKPAY_CALLBACK_URL_TEST=https://www.shaktisewafoudation.in
ZACKPAY_CALLBACK_URL_PRODUCTION=https://www.shaktisewafoudation.in
ZACKPAY_WEBSITE_URL=https://www.shaktisewafoudation.in
NEXT_PUBLIC_WEBSITE_URL=https://www.shaktisewafoudation.in
NEXT_PUBLIC_SERVER_URL=https://api.shaktisewafoudation.in
EOF

        echo -e "${GREEN}✅ Updated shaktisewafoudation-krishi/.env${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  shaktisewafoudation-krishi/.env not found, creating it...${NC}"
    cat > "$KRISHI_ENV" << EOF
# Zaakpay Configuration
ZACKPAY_MODE=test
ZACKPAY_MERCHANT_ID_TEST=$TEST_MERCHANT_ID
ZACKPAY_SECRET_KEY_TEST=$TEST_SECRET_KEY
ZACKPAY_MERCHANT_ID=$PROD_MERCHANT_ID
ZACKPAY_SECRET_KEY=$PROD_SECRET_KEY
ZACKPAY_CALLBACK_URL_TEST=https://www.shaktisewafoudation.in
ZACKPAY_CALLBACK_URL_PRODUCTION=https://www.shaktisewafoudation.in
ZACKPAY_WEBSITE_URL=https://www.shaktisewafoudation.in
NEXT_PUBLIC_WEBSITE_URL=https://www.shaktisewafoudation.in
NEXT_PUBLIC_SERVER_URL=https://api.shaktisewafoudation.in
EOF
    echo -e "${GREEN}✅ Created shaktisewafoudation-krishi/.env${NC}"
fi

#######################
# Fix server/.env
#######################
if [ -f "$SERVER_ENV" ]; then
    echo "✅ Found himora/server/.env"
    
    if grep -q "ZACKPAY_SECRET_KEY_TEST=$TEST_SECRET_KEY" "$SERVER_ENV"; then
        echo -e "${GREEN}✅ Test secret key is correct in server/.env${NC}"
    else
        echo -e "${RED}❌ Test secret key is missing or incorrect in server/.env${NC}"
        echo "   Updating with correct Zaakpay configuration..."

        sed -i '/ZACKPAY_MODE=/d' "$SERVER_ENV" || true
        sed -i '/ZACKPAY_MERCHANT_ID_TEST=/d' "$SERVER_ENV" || true
        sed -i '/ZACKPAY_SECRET_KEY_TEST=/d' "$SERVER_ENV" || true
        sed -i '/ZACKPAY_MERCHANT_ID=/d' "$SERVER_ENV" || true
        sed -i '/ZACKPAY_SECRET_KEY=/d' "$SERVER_ENV" || true
        sed -i '/KRISHI_API_URL=/d' "$SERVER_ENV" || true
        sed -i '/FRONTEND_URL=/d' "$SERVER_ENV" || true
        sed -i '/BACKEND_URL=/d' "$SERVER_ENV" || true
        sed -i '/ZACKPAY_CALLBACK_URL=/d' "$SERVER_ENV" || true
        sed -i '/ZACKPAY_WEBSITE_URL=/d' "$SERVER_ENV" || true

        cat >> "$SERVER_ENV" << EOF

# Zaakpay Configuration - Updated $(date)
ZACKPAY_MODE=test
ZACKPAY_MERCHANT_ID_TEST=$TEST_MERCHANT_ID
ZACKPAY_SECRET_KEY_TEST=$TEST_SECRET_KEY
ZACKPAY_MERCHANT_ID=$PROD_MERCHANT_ID
ZACKPAY_SECRET_KEY=$PROD_SECRET_KEY
KRISHI_API_URL=https://www.shaktisewafoudation.in
FRONTEND_URL=https://www.shaktisewafoudation.in
BACKEND_URL=https://api.shaktisewafoudation.in
ZACKPAY_CALLBACK_URL=https://www.shaktisewafoudation.in
ZACKPAY_WEBSITE_URL=https://www.shaktisewafoudation.in
EOF

        echo -e "${GREEN}✅ Updated server/.env${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  server/.env not found, creating it...${NC}"
    cat > "$SERVER_ENV" << EOF
# Zaakpay Configuration
ZACKPAY_MODE=test
ZACKPAY_MERCHANT_ID_TEST=$TEST_MERCHANT_ID
ZACKPAY_SECRET_KEY_TEST=$TEST_SECRET_KEY
ZACKPAY_MERCHANT_ID=$PROD_MERCHANT_ID
ZACKPAY_SECRET_KEY=$PROD_SECRET_KEY
KRISHI_API_URL=https://www.shaktisewafoudation.in
FRONTEND_URL=https://www.shaktisewafoudation.in
BACKEND_URL=https://api.shaktisewafoudation.in
ZACKPAY_CALLBACK_URL=https://www.shaktisewafoudation.in
ZACKPAY_WEBSITE_URL=https://www.shaktisewafoudation.in
EOF
    echo -e "${GREEN}✅ Created server/.env${NC}"
fi

echo ""
echo "📋 Step 2: Verification"
echo ""

if grep -q "ZACKPAY_SECRET_KEY_TEST=$TEST_SECRET_KEY" "$KRISHI_ENV" && \
   grep -q "ZACKPAY_SECRET_KEY_TEST=$TEST_SECRET_KEY" "$SERVER_ENV"; then
    echo -e "${GREEN}✅ Both environment files have correct test secret key${NC}"
else
    echo -e "${RED}❌ Verification failed. Please check the files manually.${NC}"
    exit 1
fi

echo ""
echo "📋 Step 3: Next Steps"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Now you must restart apps:${NC}"
echo ""
echo "1. Restart backend:"
echo "   cd $SERVER_DIR"
echo "   pm2 restart all"
echo ""
echo "2. Rebuild/redeploy Next.js app:"
echo "   cd $KRISHI_DIR"
echo "   npm run build"
echo "   # Then redeploy or restart your Next.js process"
echo ""
echo "3. Create a NEW payment link (do not reuse old transaction IDs)"
echo ""
echo -e "${GREEN}✅ Environment files updated successfully!${NC}"
echo ""