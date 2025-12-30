# Firebase Setup for Android Push Notifications

## Issue
When building APK locally with Gradle, you may see this error:
```
Default FirebaseApp is not initialized in this process com.payments.app. 
Make sure to call FirebaseApp.initializeApp(Context) first.
```

This happens because Expo push notifications on Android require Firebase Cloud Messaging (FCM).

## Solution Options

### Option 1: Use EAS Build (Recommended - Automatic FCM Setup)

EAS builds automatically configure FCM for you. This is the easiest option.

```bash
cd /home/pranjal/himora/mobile-app

# Login to Expo (if not already)
eas login

# Build with EAS (cloud or local)
eas build --platform android --profile preview --local
# OR
eas build --platform android --profile preview
```

**Advantages:**
- ✅ Automatic FCM configuration
- ✅ No manual Firebase setup needed
- ✅ Works out of the box

### Option 2: Manual Firebase Setup (For Local Gradle Builds)

If you must use `./gradlew assembleRelease`, you need to configure Firebase manually:

#### Step 1: Create Firebase Project

1. Go to https://console.firebase.google.com
2. Click "Add project" or select existing project
3. Follow the setup wizard

#### Step 2: Add Android App

1. In Firebase Console, click "Add app" → Android
2. Enter package name: `com.payments.app`
3. Enter app nickname: `Payments App` (optional)
4. Click "Register app"

#### Step 3: Download google-services.json

1. Download the `google-services.json` file
2. Place it in: `mobile-app/android/app/google-services.json`

#### Step 4: Configure Gradle

The `google-services.json` should be automatically picked up by the Android build system if the Google Services plugin is configured (which Expo should handle).

#### Step 5: Rebuild APK

```bash
cd /home/pranjal/himora/mobile-app/android
./gradlew clean
./gradlew assembleRelease
```

## Verify Firebase Setup

After setup, when you run the app and try to enable notifications, you should see:
- ✅ Push token obtained (instead of Firebase error)
- ✅ Device registered successfully

## Troubleshooting

### Error: "google-services.json not found"
- Make sure the file is at: `android/app/google-services.json`
- Check file permissions
- Rebuild after adding the file

### Error: "FirebaseApp not initialized"
- Verify `google-services.json` is in the correct location
- Make sure you've rebuilt the APK after adding the file
- Check that the package name in `google-services.json` matches `com.payments.app`

### Still Not Working?
1. Use EAS build instead (Option 1) - it's easier
2. Or check Expo documentation: https://docs.expo.dev/push-notifications/fcm-credentials/

## Quick Reference

**Package Name:** `com.payments.app`  
**google-services.json location:** `mobile-app/android/app/google-services.json`  
**EAS Project ID:** `7fc96d97-5298-4beb-83f5-56b827c8350a`


