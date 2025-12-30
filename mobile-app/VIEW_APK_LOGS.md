# Viewing APK Logs

## Quick Commands

### 1. View All Logs (Real-time)
```bash
adb logcat
```

### 2. View Filtered Logs (React Native + Your App)
```bash
adb logcat | grep -E "ReactNativeJS|expo|payments|Device|Notification|Push|register|ERROR|WARN"
```

### 3. View Only Your App's Logs
```bash
adb logcat | grep "com.payments.app"
```

### 4. View Logs with Timestamps
```bash
adb logcat -v time | grep -E "ReactNativeJS|expo|payments|Device|Notification"
```

### 5. Save Logs to File
```bash
adb logcat -v time > apk-logs.txt
# Then press Ctrl+C to stop
```

### 6. Clear Logs and Start Fresh
```bash
adb logcat -c  # Clear logs
adb logcat -v time | grep -E "ReactNativeJS|expo|payments|Device|Notification|Push|register"
```

## Using the Script

```bash
cd /home/pranjal/himora/mobile-app
./view-apk-logs.sh
```

## Filter for Specific Issues

### Device Registration
```bash
adb logcat | grep -E "Device|register|pushToken|backend|API"
```

### Push Notifications
```bash
adb logcat | grep -E "Notification|Push|expo-notifications|token"
```

### Errors Only
```bash
adb logcat | grep -E "ERROR|Error|error|❌|Failed|failed"
```

### Settings Page
```bash
adb logcat | grep -E "settings|toggle|Notification|enabled|disabled"
```

## Check Device Connection

```bash
adb devices
```

Should show:
```
List of devices attached
<device-id>    device
```

## Troubleshooting

### No device found?
1. Enable USB Debugging:
   - Settings → About Phone → Tap "Build Number" 7 times
   - Settings → Developer Options → Enable "USB Debugging"

2. Check USB connection:
   - Try different USB cable
   - Try different USB port
   - Enable "File Transfer" mode on device

### Logs not showing?
1. Make sure app is running
2. Try clearing logs first: `adb logcat -c`
3. Check if device is authorized: `adb devices`

## Advanced: Filter by Log Level

```bash
# Only errors
adb logcat *:E

# Errors and warnings
adb logcat *:W

# All levels
adb logcat *:V
```

## View Logs for Specific Time Period

```bash
# Start logging
adb logcat -v time > logs-$(date +%Y%m%d-%H%M%S).txt

# Do your action (toggle notifications, etc.)
# Then press Ctrl+C to stop

# View the saved log
cat logs-*.txt | grep -E "Device|Notification|register"
```

