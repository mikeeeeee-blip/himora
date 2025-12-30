#!/bin/bash

# Build APK with Push Notifications using EAS Build
# This ensures Firebase is properly configured

set -e

echo "🚀 Building APK with Push Notifications Support"
echo "================================================"
echo ""

# Change to mobile-app directory
cd "$(dirname "$0")"

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI is not installed"
    echo "   Install it with: npm install -g eas-cli"
    exit 1
fi

# Check if logged in to Expo
echo "📋 Checking Expo login status..."
if ! eas whoami &> /dev/null; then
    echo "⚠️  Not logged in to Expo"
    echo "   Logging in..."
    eas login
fi

echo "✅ Logged in to Expo"
echo ""

# Check EAS project configuration
echo "📋 Checking EAS project configuration..."
PROJECT_ID=$(grep -A 2 '"eas"' app.json | grep 'projectId' | sed 's/.*"projectId": *"\([^"]*\)".*/\1/' || echo "")
if [ -z "$PROJECT_ID" ]; then
    echo "❌ EAS project ID not found in app.json"
    exit 1
fi
echo "✅ Project ID: $PROJECT_ID"
echo ""

# Ask user for build type
echo "Select build type:"
echo "1) Preview (for testing)"
echo "2) Production (for release)"
read -p "Enter choice [1-2] (default: 1): " BUILD_TYPE
BUILD_TYPE=${BUILD_TYPE:-1}

if [ "$BUILD_TYPE" = "2" ]; then
    PROFILE="production"
    echo "📦 Building production APK..."
else
    PROFILE="preview"
    echo "📦 Building preview APK..."
fi

echo ""
echo "🔨 Starting EAS build..."
echo "   This will automatically configure Firebase for push notifications"
echo ""

# Build with EAS
if eas build --platform android --profile "$PROFILE" --local; then
    echo ""
    echo "✅ Build completed successfully!"
    echo ""
    echo "📱 APK location:"
    find . -name "*.apk" -type f -newer build-apk-with-notifications.sh 2>/dev/null | head -1 || echo "   Check the build output above for the APK path"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Install the APK on your device"
    echo "   2. Open the app and log in"
    echo "   3. Go to Settings → Enable Push Notifications"
    echo "   4. Test by sending a notification from the backend"
    echo ""
else
    echo ""
    echo "❌ Build failed"
    echo "   Check the error messages above"
    exit 1
fi

