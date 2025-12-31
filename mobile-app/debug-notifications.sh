#!/bin/bash

echo "🔍 Starting Comprehensive Notification Debugging"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if device is connected
echo -e "${BLUE}📱 Checking device connection...${NC}"
DEVICE=$(adb devices | grep -w "device" | awk '{print $1}' | head -n1)
if [ -z "$DEVICE" ]; then
    echo -e "${RED}❌ No device connected!${NC}"
    echo "Please connect a device or start an emulator"
    exit 1
fi
echo -e "${GREEN}✅ Device connected: $DEVICE${NC}"
echo ""

# Clear logcat
echo -e "${BLUE}🧹 Clearing logcat...${NC}"
adb logcat -c
echo ""

# Check if APK is installed
echo -e "${BLUE}📦 Checking if app is installed...${NC}"
PACKAGE_NAME="com.payments.app"
if adb shell pm list packages | grep -q "$PACKAGE_NAME"; then
    echo -e "${GREEN}✅ App is installed${NC}"
else
    echo -e "${RED}❌ App is not installed${NC}"
    echo "Installing APK..."
    adb install -r android/app/build/outputs/apk/release/app-release.apk
fi
echo ""

# Check notification permissions
echo -e "${BLUE}🔐 Checking notification permissions...${NC}"
NOTIF_PERM=$(adb shell dumpsys package $PACKAGE_NAME | grep -A 5 "granted=true" | grep -i notification || echo "Not found")
echo "Notification permissions: $NOTIF_PERM"
echo ""

# Check if google-services.json exists in project (needed for build)
echo -e "${BLUE}📄 Checking if google-services.json exists...${NC}"
if [ -f "android/app/google-services.json" ]; then
    echo -e "${GREEN}✅ google-services.json found at android/app/google-services.json${NC}"
    # Verify it has correct project ID
    if grep -q "payments-ninex" android/app/google-services.json 2>/dev/null; then
        echo -e "${GREEN}✅ Project ID verified: payments-ninex${NC}"
    else
        echo -e "${YELLOW}⚠️  Project ID might be incorrect${NC}"
    fi
elif [ -f "google-services.json" ]; then
    echo -e "${YELLOW}⚠️  google-services.json in root, copying to android/app/...${NC}"
    cp google-services.json android/app/google-services.json
    echo -e "${GREEN}✅ Copied to android/app/google-services.json${NC}"
else
    echo -e "${RED}❌ google-services.json NOT found!${NC}"
    echo "This is a critical issue - Firebase won't work without it!"
    echo "Please ensure google-services.json is in the project root or android/app/"
fi
echo ""

# Note: The raw JSON file is NOT in the APK (this is normal)
# Google Services plugin processes it and generates XML resources
echo -e "${BLUE}ℹ️  Note: google-services.json is processed by Google Services plugin${NC}"
echo -e "${BLUE}   The raw JSON is not in the APK (this is normal)${NC}"
echo -e "${BLUE}   Firebase configuration is generated as XML resources${NC}"
echo ""

# Launch the app
echo -e "${BLUE}🚀 Launching app...${NC}"
adb shell am start -n com.payments.app/.MainActivity
sleep 3
echo ""

# Start monitoring logs with filters
echo -e "${GREEN}📊 Starting log monitoring...${NC}"
echo "Monitoring for:"
echo "  - Firebase/FCM errors"
echo "  - Notification errors"
echo "  - expo-notifications logs"
echo "  - Push token registration"
echo "  - Notification channel setup"
echo ""
echo "Press Ctrl+C to stop monitoring"
echo ""
echo "================================================"
echo ""

# Monitor logs with multiple filters
adb logcat -v time \
  | grep -E --line-buffered \
    "(Firebase|FCM|expo-notifications|Notification|PushToken|google-services|FirebaseApp|FirebaseMessaging|NotificationChannel|NotificationManager|📱|📬|✅|❌|⚠️)" \
  | while IFS= read -r line; do
    # Color code different types of logs
    if echo "$line" | grep -qE "(❌|ERROR|Error|error|Failed|failed)"; then
        echo -e "${RED}$line${NC}"
    elif echo "$line" | grep -qE "(✅|SUCCESS|Success|success|Working|working)"; then
        echo -e "${GREEN}$line${NC}"
    elif echo "$line" | grep -qE "(⚠️|WARN|Warn|warn|Warning|warning)"; then
        echo -e "${YELLOW}$line${NC}"
    elif echo "$line" | grep -qE "(📱|📬|📤|📥|Firebase|FCM|Notification|PushToken)"; then
        echo -e "${BLUE}$line${NC}"
    else
        echo "$line"
    fi
done

