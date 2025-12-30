#!/bin/bash

# Script to view logs from the installed APK
# Usage: ./view-apk-logs.sh

echo "📱 APK Log Viewer"
echo "================="
echo ""

# Check if device is connected
if ! adb devices | grep -q "device$"; then
    echo "❌ No Android device connected"
    echo ""
    echo "Please:"
    echo "1. Connect your Android device via USB"
    echo "2. Enable USB Debugging in Developer Options"
    echo "3. Run this script again"
    exit 1
fi

echo "✅ Device connected"
echo ""

# Get package name from app.json
PACKAGE_NAME="com.payments.app"

echo "📋 Viewing logs for: $PACKAGE_NAME"
echo ""
echo "Select log view:"
echo "1. All mobile app logs (recommended)"
echo "2. Device registration only"
echo "3. Push notifications only"
echo "4. Errors and warnings only"
echo "5. All logs (no filter)"
echo ""
read -p "Enter choice (1-5, default: 1): " log_choice
log_choice=${log_choice:-1}

echo ""
echo "Press Ctrl+C to stop"
echo ""

# Clear previous logs (optional)
read -p "Clear previous logs? (y/n, default: y): " clear_logs
clear_logs=${clear_logs:-y}
if [ "$clear_logs" = "y" ]; then
    echo "🧹 Clearing logs..."
    adb logcat -c
    echo "✅ Logs cleared"
    echo ""
fi

echo "📺 Starting log viewer..."
echo ""

# Define filter patterns
FILTER_ALL="ReactNativeJS|expo|Expo|payments|com\.payments\.app|Device|device|Notification|notification|Push|push|register|Register|backend|Backend|API|api|ERROR|Error|error|WARN|Warn|warn|LOG|Log|📱|✅|❌|🔍|📤|📬|⚠️|settings|Settings|toggle|Toggle|enabled|Enabled|disabled|Disabled|token|Token|auth|Auth|userId|User|verification|Verification|registration|Registration"

FILTER_DEVICE="Device|device|register|Register|registration|Registration|backend|Backend|API|api|token|Token|userId|User|📱|✅|❌|🔍|📤|verification|Verification"

FILTER_NOTIFICATIONS="Notification|notification|Push|push|expo-notifications|token|Token|permission|Permission|📱|✅|❌|⚠️"

FILTER_ERRORS="ERROR|Error|error|WARN|Warn|warn|❌|⚠️|Failed|failed|Exception|exception"

# Apply selected filter
case $log_choice in
    1)
        echo "📱 Viewing all mobile app logs..."
        adb logcat -v time | grep -E "$FILTER_ALL" --line-buffered
        ;;
    2)
        echo "📱 Viewing device registration logs..."
        adb logcat -v time | grep -E "$FILTER_DEVICE" --line-buffered
        ;;
    3)
        echo "📱 Viewing push notification logs..."
        adb logcat -v time | grep -E "$FILTER_NOTIFICATIONS" --line-buffered
        ;;
    4)
        echo "📱 Viewing errors and warnings..."
        adb logcat -v time | grep -E "$FILTER_ERRORS" --line-buffered
        ;;
    5)
        echo "📱 Viewing all logs (no filter)..."
        adb logcat -v time
        ;;
    *)
        echo "📱 Viewing all mobile app logs (default)..."
        adb logcat -v time | grep -E "$FILTER_ALL" --line-buffered
        ;;
esac

