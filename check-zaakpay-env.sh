#!/bin/bash
# Check Zaakpay environment variables without requiring dotenv

echo "🔍 Checking Zaakpay Environment Variables"
echo "=========================================="
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

echo "📁 Checking Next.js app (.env file)..."
echo "   Path: $KRISHI_ENV"
echo ""

if [ -f "$KRISHI_ENV" ]; then
    echo "✅ File exists"
    echo ""
    
    # Check for Zaakpay variables
    if grep -q "ZACKPAY_SECRET_KEY_TEST" "$KRISHI_ENV"; then
        TEST_KEY=$(grep "^ZACKPAY_SECRET_KEY_TEST=" "$KRISHI_ENV" | cut -d'=' -f2- | tr -d ' ' | tr -d '"' | tr -d "'")
        echo "   ZACKPAY_SECRET_KEY_TEST: ${TEST_KEY:0:20}..."
        
        if [ "$TEST_KEY" = "$CORRECT_TEST_KEY" ]; then
            echo "   ✅ CORRECT!"
        else
            echo "   ❌ WRONG! Expected: ${CORRECT_TEST_KEY:0:20}..."
            echo "   Run: ./fix-zaakpay-env.sh"
        fi
    else
        echo "   ❌ ZACKPAY_SECRET_KEY_TEST not found in .env"
        echo "   Run: ./fix-zaakpay-env.sh"
    fi
    
    echo ""
    
    if grep -q "ZACKPAY_MODE" "$KRISHI_ENV"; then
        MODE=$(grep "^ZACKPAY_MODE=" "$KRISHI_ENV" | cut -d'=' -f2- | tr -d ' ' | tr -d '"' | tr -d "'")
        echo "   ZACKPAY_MODE: $MODE"
    else
        echo "   ⚠️  ZACKPAY_MODE not set"
    fi
    
    echo ""
    echo "   📋 All Zaakpay variables in file:"
    grep "^ZACKPAY" "$KRISHI_ENV" | sed 's/=.*/=***/' | head -10
    
else
    echo "❌ File NOT FOUND!"
    echo "   Run: ./fix-zaakpay-env.sh"
fi

echo ""
echo "📁 Checking Server (.env file)..."
echo "   Path: $SERVER_ENV"
echo ""

if [ -f "$SERVER_ENV" ]; then
    echo "✅ File exists"
    echo ""
    
    if grep -q "ZACKPAY_SECRET_KEY_TEST" "$SERVER_ENV"; then
        TEST_KEY=$(grep "^ZACKPAY_SECRET_KEY_TEST=" "$SERVER_ENV" | cut -d'=' -f2- | tr -d ' ' | tr -d '"' | tr -d "'")
        echo "   ZACKPAY_SECRET_KEY_TEST: ${TEST_KEY:0:20}..."
        
        if [ "$TEST_KEY" = "$CORRECT_TEST_KEY" ]; then
            echo "   ✅ CORRECT!"
        else
            echo "   ❌ WRONG! Expected: ${CORRECT_TEST_KEY:0:20}..."
            echo "   Run: ./fix-zaakpay-env.sh"
        fi
    else
        echo "   ❌ ZACKPAY_SECRET_KEY_TEST not found in .env"
        echo "   Run: ./fix-zaakpay-env.sh"
    fi
else
    echo "❌ File NOT FOUND!"
    echo "   Run: ./fix-zaakpay-env.sh"
fi

echo ""
echo "📋 Next Steps:"
echo ""
echo "1. If keys are wrong/missing, run:"
echo "   cd ~/himora"
echo "   ./fix-zaakpay-env.sh"
echo ""
echo "2. Restart Next.js app (if running on server):"
echo "   cd ~/shaktisewa-krishi"
echo "   pm2 restart shaktisewa-krishi"
echo "   # OR if using Vercel, set env vars in Vercel dashboard and redeploy"
echo ""
echo "3. Restart backend:"
echo "   cd ~/himora/server"
echo "   pm2 restart all"
echo ""
echo "4. Check if Next.js app is reading env vars:"
echo "   Look for logs showing: '🔧 Zaakpay Configuration:'"
echo ""

