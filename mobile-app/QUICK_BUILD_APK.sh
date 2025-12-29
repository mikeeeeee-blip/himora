#!/bin/bash

# Quick APK Build Script for Push Notification Testing
# This script helps you build an APK locally for testing

set -e

echo "🚀 Building APK for Push Notification Testing"
echo "=============================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the mobile-app directory"
    exit 1
fi

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "📦 Installing EAS CLI..."
    npm install -g eas-cli
fi

# Check if logged in to Expo
echo "🔐 Checking Expo login status..."
if ! eas whoami &> /dev/null; then
    echo "⚠️  Not logged in to Expo. Please login:"
    echo "   Run: eas login"
    exit 1
fi

echo "✅ Logged in to Expo"
echo ""

# Check if eas.json exists
if [ ! -f "eas.json" ]; then
    echo "📝 Creating eas.json..."
    # The file should already be created, but just in case
    echo "⚠️  eas.json not found. Please ensure it exists."
    exit 1
fi

echo "📱 Starting APK build..."
echo ""
echo "Choose build method:"
echo "1. Local build (requires Android Studio, builds on your machine)"
echo "2. Cloud build (builds on Expo servers, requires internet)"
echo ""
read -p "Enter choice (1 or 2): " choice

if [ "$choice" = "1" ]; then
    echo ""
    echo "🏗️  Building APK locally..."
    echo "⚠️  This requires Android Studio and Android SDK to be installed"
    echo ""
    eas build --platform android --profile preview --local
elif [ "$choice" = "2" ]; then
    echo ""
    echo "☁️  Building APK on Expo servers..."
    echo ""
    eas build --platform android --profile preview
else
    echo "❌ Invalid choice"
    exit 1
fi

echo ""
echo "✅ Build complete!"
echo ""
echo "📲 Next steps:"
echo "1. Transfer the APK to your Android device"
echo "2. Enable 'Install from Unknown Sources' in Settings"
echo "3. Install the APK"
echo "4. Login as SuperAdmin to register for push notifications"
echo "5. Test by creating a payout request from an Admin account"
echo ""

