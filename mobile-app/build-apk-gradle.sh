#!/bin/bash

# Build Android APK using Gradle with Firebase/Notifications support
# This script builds the APK directly using Gradle (not EAS Build)

set -e

echo "🚀 Building Android APK with Gradle"
echo "===================================="
echo ""

# Change to mobile-app directory
cd "$(dirname "$0")"

# Check if google-services.json exists
if [ ! -f "android/app/google-services.json" ]; then
    echo "❌ google-services.json not found at android/app/google-services.json"
    echo "   Copying from project root..."
    if [ -f "google-services.json" ]; then
        cp google-services.json android/app/google-services.json
        echo "✅ Copied google-services.json to android/app/"
    else
        echo "❌ google-services.json not found in project root either!"
        echo "   Please ensure google-services.json is in the project root or android/app/"
        exit 1
    fi
else
    echo "✅ google-services.json found at android/app/google-services.json"
fi

echo ""

# Check if Android SDK is available
if [ -z "$ANDROID_HOME" ] && [ -z "$ANDROID_SDK_ROOT" ]; then
    echo "⚠️  ANDROID_HOME or ANDROID_SDK_ROOT not set"
    echo "   Attempting to find Android SDK..."
    
    # Common locations
    if [ -d "$HOME/Android/Sdk" ]; then
        export ANDROID_HOME="$HOME/Android/Sdk"
        export ANDROID_SDK_ROOT="$HOME/Android/Sdk"
        echo "✅ Found Android SDK at: $ANDROID_HOME"
    elif [ -d "$HOME/Library/Android/sdk" ]; then
        export ANDROID_HOME="$HOME/Library/Android/sdk"
        export ANDROID_SDK_ROOT="$HOME/Library/Android/sdk"
        echo "✅ Found Android SDK at: $ANDROID_HOME"
    else
        echo "❌ Android SDK not found"
        echo "   Please set ANDROID_HOME or install Android Studio"
        exit 1
    fi
else
    if [ -n "$ANDROID_HOME" ]; then
        echo "✅ ANDROID_HOME: $ANDROID_HOME"
    fi
    if [ -n "$ANDROID_SDK_ROOT" ]; then
        echo "✅ ANDROID_SDK_ROOT: $ANDROID_SDK_ROOT"
    fi
fi

echo ""

# Check if Java is available
if ! command -v java &> /dev/null; then
    echo "❌ Java not found"
    echo "   Please install Java (JDK 17 or higher)"
    exit 1
fi

JAVA_VERSION=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2 | sed '/^1\./s///' | cut -d'.' -f1)
echo "✅ Java version: $JAVA_VERSION"

echo ""

# Ensure google-services.json is in android/app/ before prebuild
if [ ! -f "android/app/google-services.json" ]; then
    if [ -f "google-services.json" ]; then
        echo "📋 Copying google-services.json to android/app/ before prebuild..."
        cp google-services.json android/app/google-services.json
        echo "✅ Copied google-services.json"
    fi
fi

# Generate codegen first (before cleaning)
echo "📦 Generating native code and codegen directories..."
npx expo prebuild --platform android --no-install 2>&1 | grep -v "Git branch has uncommitted" || true

# Ensure google-services.json is still in android/app/ after prebuild
if [ ! -f "android/app/google-services.json" ]; then
    if [ -f "google-services.json" ]; then
        echo "📋 Copying google-services.json to android/app/ after prebuild..."
        cp google-services.json android/app/google-services.json
        echo "✅ Copied google-services.json"
    fi
fi

# Navigate to android directory
cd android

echo "🧹 Cleaning previous build..."
# Clean but skip the problematic externalNativeBuildClean task
./gradlew clean -x externalNativeBuildClean || true

echo ""
echo "🧹 Cleaning native build cache..."
# Only clean .cxx cache, not generated codegen
rm -rf app/.cxx
rm -rf .gradle/caches

echo ""
echo "🔨 Building release APK..."
echo "   This may take several minutes..."
echo ""

# Build release APK
if ./gradlew assembleRelease; then
    echo ""
    echo "✅ Build successful!"
    echo ""
    
    # Find the APK
    APK_PATH="app/build/outputs/apk/release/app-release.apk"
    
    if [ -f "$APK_PATH" ]; then
        APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
        echo "📦 APK Location: $(pwd)/$APK_PATH"
        echo "📊 APK Size: $APK_SIZE"
        echo ""
        echo "✅ APK built successfully with Firebase/Notifications support!"
        echo ""
        echo "📱 To install on device:"
        echo "   adb install $APK_PATH"
        echo ""
        echo "   Or transfer the APK to your device and install manually"
    else
        echo "⚠️  APK not found at expected location: $APK_PATH"
        echo "   Searching for APK files..."
        find app/build/outputs -name "*.apk" -type f 2>/dev/null || echo "   No APK files found"
    fi
else
    echo ""
    echo "❌ Build failed!"
    echo "   Check the error messages above"
    exit 1
fi

