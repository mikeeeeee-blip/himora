#!/bin/bash
# Zaakpay Environment Fix Script
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

echo "📋 Step 1: Checking current environment files..."
echo ""

# Check krishi-shaktisewa/.env
KRISHI_ENV="/home/pranjal/himora/krishi-shaktisewa/.env"
if [ -f "$KRISHI_ENV" ]; then
    echo "✅ Found krishi-shaktisewa/.env"
    
    # Check if secret key is correct
    if grep -q "ZACKPAY_SECRET_KEY_TEST=$TEST_SECRET_KEY" "$KRISHI_ENV"; then
        echo -e "${GREEN}✅ Test secret key is correct${NC}"
    else
        echo -e "${RED}❌ Test secret key is missing or incorrect${NC}"
        echo "   Adding correct test secret key..."
        
        # Remove old incorrect key if exists
        sed -i '/ZACKPAY_SECRET_KEY_TEST=/d' "$KRISHI_ENV"
        
        # Add correct key
        echo "" >> "$KRISHI_ENV"
        echo "# Zaakpay Configuration - Updated $(date)" >> "$KRISHI_ENV"
        echo "ZACKPAY_MODE=test" >> "$KRISHI_ENV"
        echo "ZACKPAY_MERCHANT_ID_TEST=$TEST_MERCHANT_ID" >> "$KRISHI_ENV"
        echo "ZACKPAY_SECRET_KEY_TEST=$TEST_SECRET_KEY" >> "$KRISHI_ENV"
        echo "ZACKPAY_MERCHANT_ID=$PROD_MERCHANT_ID" >> "$KRISHI_ENV"
        echo "ZACKPAY_SECRET_KEY=$PROD_SECRET_KEY" >> "$KRISHI_ENV"
        echo "ZACKPAY_CALLBACK_URL_TEST=https://www.shaktisewafoudation.in" >> "$KRISHI_ENV"
        echo "ZACKPAY_CALLBACK_URL_PRODUCTION=https://www.shaktisewafoudation.in" >> "$KRISHI_ENV"
        echo "ZACKPAY_WEBSITE_URL=https://www.shaktisewafoudation.in" >> "$KRISHI_ENV"
        echo "NEXT_PUBLIC_WEBSITE_URL=https://www.shaktisewafoudation.in" >> "$KRISHI_ENV"
        echo "NEXT_PUBLIC_SERVER_URL=https://api.shaktisewafoudation.in" >> "$KRISHI_ENV"
        
        echo -e "${GREEN}✅ Updated krishi-shaktisewa/.env${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  krishi-shaktisewa/.env not found, creating it...${NC}"
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
    echo -e "${GREEN}✅ Created krishi-shaktisewa/.env${NC}"
fi

# Check server/.env
SERVER_ENV="/home/pranjal/himora/server/.env"
if [ -f "$SERVER_ENV" ]; then
    echo "✅ Found server/.env"
    
    if grep -q "ZACKPAY_SECRET_KEY_TEST=$TEST_SECRET_KEY" "$SERVER_ENV"; then
        echo -e "${GREEN}✅ Test secret key is correct${NC}"
    else
        echo -e "${RED}❌ Test secret key is missing or incorrect${NC}"
        echo "   Adding correct test secret key..."
        
        sed -i '/ZACKPAY_SECRET_KEY_TEST=/d' "$SERVER_ENV"
        
        echo "" >> "$SERVER_ENV"
        echo "# Zaakpay Configuration - Updated $(date)" >> "$SERVER_ENV"
        echo "ZACKPAY_MODE=test" >> "$SERVER_ENV"
        echo "ZACKPAY_MERCHANT_ID_TEST=$TEST_MERCHANT_ID" >> "$SERVER_ENV"
        echo "ZACKPAY_SECRET_KEY_TEST=$TEST_SECRET_KEY" >> "$SERVER_ENV"
        echo "ZACKPAY_MERCHANT_ID=$PROD_MERCHANT_ID" >> "$SERVER_ENV"
        echo "ZACKPAY_SECRET_KEY=$PROD_SECRET_KEY" >> "$SERVER_ENV"
        echo "KRISHI_API_URL=https://www.shaktisewafoudation.in" >> "$SERVER_ENV"
        echo "FRONTEND_URL=https://www.shaktisewafoudation.in" >> "$SERVER_ENV"
        echo "BACKEND_URL=https://api.shaktisewafoudation.in" >> "$SERVER_ENV"
        echo "ZACKPAY_CALLBACK_URL=https://www.shaktisewafoudation.in" >> "$SERVER_ENV"
        echo "ZACKPAY_WEBSITE_URL=https://www.shaktisewafoudation.in" >> "$SERVER_ENV"
        
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

# Verify the keys are correct
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
echo -e "${YELLOW}⚠️  IMPORTANT: You must now:${NC}"
echo ""
echo "1. Restart the Next.js app (if using PM2 or similar):"
echo "   cd /home/pranjal/himora/krishi-shaktisewa"
echo "   npm run build"
echo "   # Then redeploy to Vercel or restart your server"
echo ""
echo "2. Restart the backend server:"
echo "   cd /home/pranjal/himora/server"
echo "   pm2 restart all"
echo ""
echo "3. Create a NEW payment link (don't reuse old transaction IDs)"
echo ""
echo "4. Test the new payment link"
echo ""
echo -e "${GREEN}✅ Environment files updated successfully!${NC}"
echo ""

