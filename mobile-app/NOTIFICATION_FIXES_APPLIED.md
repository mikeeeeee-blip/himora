# Notification Fixes Applied

## Issues Found

1. **Firebase Messaging can't find notification channel**
   - Error: `Notification Channel requested (default) has not been created by the app`
   - Error: `Missing Default Notification Channel metadata in AndroidManifest`

2. **Channel creation timing issue**
   - Channel was being created asynchronously in JavaScript
   - Firebase Messaging might try to use it before it's created

## Fixes Applied

### 1. Added Channel Metadata to AndroidManifest.xml
```xml
<meta-data android:name="com.google.firebase.messaging.default_notification_channel_id" android:value="default"/>
```
This tells Firebase Messaging which channel to use.

### 2. Immediate Channel Creation
Added code to create the notification channel immediately on app start (before Firebase tries to use it):
```typescript
// Create channel immediately if on Android
if (Platform.OS === 'android') {
  ensureNotificationsAvailable().then((available) => {
    if (available && Notifications) {
      Notifications.setNotificationChannelAsync('default', {
        name: 'Default Notifications',
        description: 'Default notification channel for app notifications',
        importance: Notifications.AndroidImportance.MAX,
        // ... other settings
      });
    }
  });
}
```

## Testing

After rebuilding the APK, test:

1. **Check channel exists:**
   ```bash
   adb shell dumpsys notification | grep -A 20 "com.payments.app"
   ```
   Should show channel with `mImportance=5` (MAX)

2. **Send test notification:**
   ```bash
   curl -X POST https://himora.art/api/superadmin/notifications/send \
     -H "Content-Type: application/json" \
     -H "x-auth-token: YOUR_TOKEN" \
     -d '{"title": "Test", "body": "Test notification", "target": "all_superadmins"}'
   ```

3. **Monitor logs:**
   ```bash
   adb logcat -v time | grep -E "(📬|Notification|FirebaseMessaging|shouldShowAlert)"
   ```
   Should see:
   - `📬 Notification handler called (foreground):` (if app is in foreground)
   - `📬 [LISTENER] Notification received (foreground):` (if listener is working)
   - Notification should appear in notification bar

## Expected Behavior

### Foreground (App Open)
- Notification handler should be called
- Handler should return `shouldShowAlert: true`
- Notification should appear as:
  - In-app toast (via NotificationToast component)
  - System notification (if handler allows it)

### Background (App Minimized)
- Notification should appear in notification bar automatically
- Tapping notification should:
  - Trigger `onNotificationTapped` callback
  - Navigate to appropriate screen (if configured)
  - Add notification to app's internal list

## If Still Not Working

Check:
1. **Notification permissions:** `adb shell dumpsys package com.payments.app | grep notification`
2. **Channel importance:** Should be 5 (MAX)
3. **Firebase logs:** Look for Firebase initialization errors
4. **expo-notifications logs:** Check if listeners are registered
5. **Backend logs:** Verify notifications are being sent successfully


