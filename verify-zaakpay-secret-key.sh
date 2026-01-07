#!/bin/bash
# Quick script to verify Zaakpay secret key is set correctly

echo "🔍 Verifying Zaakpay Secret Key Configuration"
echo "=============================================="
echo ""

# Detect paths
if [ -d "/home/ubuntu" ]; then
    USER_HOME="/home/ubuntu"
elif [ -d "/home/pranjal" ]; then
    USER_HOME="/home/pranjal"
else
    USER_HOME="$HOME"
fi

KRISHI_ENV="$USER_HOME/shaktisewa-krishi/.env"
SERVER_ENV="$USER_HOME/himora/server/.env"

CORRECT_TEST_KEY="0678056d96914a8583fb518caf42828a"
CORRECT_PROD_KEY="8213da8027db44aa937e203ce2745cfe"

echo "📁 Checking environment files..."
echo ""

# Check Next.js .env
if [ -f "$KRISHI_ENV" ]; then
    echo "✅ Found: $KRISHI_ENV"
    
    TEST_KEY=$(grep "^ZACKPAY_SECRET_KEY_TEST=" "$KRISHI_ENV" | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    PROD_KEY=$(grep "^ZACKPAY_SECRET_KEY=" "$KRISHI_ENV" | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    
    if [ "$TEST_KEY" = "$CORRECT_TEST_KEY" ]; then
        echo "   ✅ ZACKPAY_SECRET_KEY_TEST is CORRECT"
    else
        echo "   ❌ ZACKPAY_SECRET_KEY_TEST is WRONG or MISSING"
        echo "      Expected: $CORRECT_TEST_KEY"
        echo "      Got:      ${TEST_KEY:-NOT SET}"
    fi
    
    if [ "$PROD_KEY" = "$CORRECT_PROD_KEY" ]; then
        echo "   ✅ ZACKPAY_SECRET_KEY is CORRECT"
    else
        echo "   ⚠️  ZACKPAY_SECRET_KEY is different (OK if not using production)"
    fi
else
    echo "❌ NOT FOUND: $KRISHI_ENV"
    echo "   Run: ./fix-zaakpay-env.sh"
fi

echo ""

# Check Server .env
if [ -f "$SERVER_ENV" ]; then
    echo "✅ Found: $SERVER_ENV"
    
    TEST_KEY=$(grep "^ZACKPAY_SECRET_KEY_TEST=" "$SERVER_ENV" | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    PROD_KEY=$(grep "^ZACKPAY_SECRET_KEY=" "$SERVER_ENV" | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    
    if [ "$TEST_KEY" = "$CORRECT_TEST_KEY" ]; then
        echo "   ✅ ZACKPAY_SECRET_KEY_TEST is CORRECT"
    else
        echo "   ❌ ZACKPAY_SECRET_KEY_TEST is WRONG or MISSING"
        echo "      Expected: $CORRECT_TEST_KEY"
        echo "      Got:      ${TEST_KEY:-NOT SET}"
    fi
else
    echo "❌ NOT FOUND: $SERVER_ENV"
    echo "   Run: ./fix-zaakpay-env.sh"
fi

echo ""
echo "📋 Next Steps:"
echo ""
echo "1. If keys are wrong, run: ./fix-zaakpay-env.sh"
echo "2. Restart Next.js app to load new env vars:"
echo "   cd $USER_HOME/shaktisewa-krishi"
echo "   pm2 restart shaktisewa-krishi"
echo "   # OR if using Vercel, redeploy"
echo ""
echo "3. Restart backend:"
echo "   cd $USER_HOME/himora/server"
echo "   pm2 restart all"
echo ""
echo "4. Check logs for secret key verification:"
echo "   Look for: '✅ Secret key verified for TEST mode'"
echo ""

