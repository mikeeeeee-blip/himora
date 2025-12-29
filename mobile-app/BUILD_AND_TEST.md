# Build APK and Test Push Notifications - Step by Step Guide

## Prerequisites ✅

- ✅ EAS CLI is installed (`eas-cli@16.28.0`)
- ✅ Push notification service is configured
- ✅ Backend endpoints are set up
- ✅ Android package name configured: `com.payments.app`

## Step 1: Login to Expo (if not already logged in)

```bash
cd /Users/mayanksahu/Documents/himora/mobile-app
eas login
```

Enter your Expo credentials. If you don't have an account, create one at https://expo.dev

## Step 2: Configure EAS Project (First Time Only)

```bash
eas build:configure
```

This will:
- Link your project to Expo
- Create/update `eas.json` (already created)
- Set up project configuration

## Step 3: Build APK

### Option A: Local Build (Requires Android Studio)

**Requirements:**
- Android Studio installed
- Android SDK configured
- JAVA_HOME environment variable set
- At least 8GB free RAM

```bash
cd /Users/mayanksahu/Documents/himora/mobile-app
eas build --platform android --profile preview --local
```

**Note:** Local builds are faster but require more setup.

### Option B: Cloud Build (Recommended - Easier)

```bash
cd /Users/mayanksahu/Documents/himora/mobile-app
eas build --platform android --profile preview
```

This will:
1. Upload your code to Expo servers
2. Build the APK in the cloud
3. Provide a download link when complete

**Time:** Usually 10-20 minutes

## Step 4: Download and Install APK

1. **Get the APK:**
   - If cloud build: Check the URL provided in terminal or visit https://expo.dev
   - If local build: APK will be in `android/app/build/outputs/apk/preview/`

2. **Transfer to Android Device:**
   - Use USB cable and enable file transfer
   - Or upload to Google Drive/Dropbox and download on device
   - Or use `adb install` if device is connected via USB

3. **Install on Device:**
   - Enable "Install from Unknown Sources" in Settings > Security
   - Open the APK file
   - Tap "Install"
   - Open the app

## Step 5: Test Push Notifications

### 5.1 SuperAdmin Setup

1. **Open the app** on SuperAdmin's phone
2. **Login** with SuperAdmin credentials
3. **Grant notification permissions** when prompted
4. **Check logs** to verify:
   - Push token was obtained
   - Device was registered with backend

**Expected Console Output:**
```
📱 Setting up push notifications for superadmin...
✅ Push token obtained: ExponentPushToken[xxxx...
✅ Device registered successfully
✅ Push notifications setup complete
```

### 5.2 Verify Backend Registration

Check your backend logs/database to confirm:
- Device token was saved
- User ID and role are correct
- Platform is set to "android"

**Database Query (MongoDB):**
```javascript
db.devices.find({ role: "superAdmin" })
```

### 5.3 Test Notification Flow

1. **Login as Admin** (on web or another device)
2. **Create a Payout Request:**
   - Go to Payout Request page
   - Fill in payout details
   - Submit the request

3. **Check SuperAdmin Phone:**
   - Should receive push notification
   - Notification title: "New Payout Request"
   - Notification body: Details about the payout

4. **Test Notification Actions:**
   - **Tap notification:** Should navigate to Payouts tab
   - **View Later:** Notification should be dismissed
   - **View Now:** Should open Payouts tab

## Step 6: Debugging

### Check App Logs

**On Device (via USB):**
```bash
adb logcat | grep -i "notification\|expo\|push"
```

**In App (Metro Bundler):**
```bash
cd /Users/mayanksahu/Documents/himora/mobile-app
npx expo start
```

### Common Issues

#### Issue 1: No Push Token Received
**Symptoms:** No token in logs, permission denied
**Solutions:**
- Check if notification permissions were granted
- Verify `expo-notifications` is properly installed
- Check `app.json` has `expo-notifications` plugin configured

#### Issue 2: Token Not Registered with Backend
**Symptoms:** Token obtained but registration fails
**Solutions:**
- Check backend API endpoint is accessible
- Verify authentication token is valid
- Check backend logs for errors
- Ensure `/api/device/register` endpoint exists

#### Issue 3: Notifications Not Received
**Symptoms:** Device registered but no notifications
**Solutions:**
- Verify backend is sending notifications correctly
- Check Expo Push Notification service is working
- Verify notification payload format
- Check device has internet connection

#### Issue 4: App Crashes on Notification
**Symptoms:** App crashes when notification arrives
**Solutions:**
- Check notification handler is properly configured
- Verify notification listeners are set up correctly
- Check for null/undefined values in notification data

### Backend Verification

**Test Push Notification Manually:**
```bash
# Using curl to test Expo Push API
curl -H "Content-Type: application/json" \
     -X POST https://exp.host/--/api/v2/push/send \
     -d '{
       "to": "ExponentPushToken[YOUR_TOKEN_HERE]",
       "title": "Test Notification",
       "body": "This is a test",
       "data": { "type": "payout_request" }
     }'
```

## Step 7: Production Build (When Ready)

For production builds:

```bash
eas build --platform android --profile production
```

This creates a signed APK ready for Play Store distribution.

## Quick Reference Commands

```bash
# Login to Expo
eas login

# Check login status
eas whoami

# Build APK (cloud)
eas build --platform android --profile preview

# Build APK (local)
eas build --platform android --profile preview --local

# View build status
eas build:list

# Install on connected device (if using local build)
adb install android/app/build/outputs/apk/preview/app-preview.apk
```

## Next Steps

1. ✅ Build APK using one of the methods above
2. ✅ Install on SuperAdmin's Android device
3. ✅ Login and verify push token registration
4. ✅ Test notification flow with payout request
5. ✅ Verify notifications work correctly
6. ✅ Document any issues for fixes

## Support

If you encounter issues:
1. Check the logs (both app and backend)
2. Verify all prerequisites are met
3. Ensure backend is running and accessible
4. Check Expo documentation: https://docs.expo.dev/push-notifications/overview/

