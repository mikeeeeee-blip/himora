# Building APK Locally for Push Notification Testing

## Prerequisites

1. **Install EAS CLI** (if not already installed):
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**:
   ```bash
   eas login
   ```

3. **Configure EAS** (if not already done):
   ```bash
   eas build:configure
   ```

## Building APK Locally

### Option 1: Local Build (Recommended for Testing)

This builds the APK on your local machine. Requires Android Studio and Android SDK.

```bash
cd mobile-app
eas build --platform android --profile preview --local
```

**Requirements:**
- Android Studio installed
- Android SDK configured
- JAVA_HOME set correctly
- At least 8GB RAM available

### Option 2: Cloud Build (Easier, but requires Expo account)

```bash
cd mobile-app
eas build --platform android --profile preview
```

This will upload your code to Expo's servers and build it there. You'll get a download link when it's done.

### Option 3: Development Build (For testing with Expo Go)

```bash
cd mobile-app
npx expo run:android
```

This builds and installs directly on a connected device/emulator.

## Installing the APK

1. **Transfer APK to Android device:**
   - If built locally, the APK will be in `mobile-app/android/app/build/outputs/apk/`
   - If built on cloud, download from the provided link

2. **Enable Unknown Sources:**
   - Go to Settings > Security > Enable "Install from Unknown Sources"

3. **Install APK:**
   - Open the APK file on your device
   - Tap "Install"
   - Open the app after installation

## Testing Push Notifications

### 1. SuperAdmin Login
- Open the app on the SuperAdmin's phone
- Login with SuperAdmin credentials
- The app should automatically register for push notifications

### 2. Check Device Registration
- Check the backend logs to see if device registration was successful
- Verify in database that the device token was saved

### 3. Test Notification
- Have an Admin user create a payout request
- SuperAdmin should receive a push notification
- Tap the notification to verify it navigates to the Payouts tab

### 4. Debug Issues

**Check logs:**
```bash
# On device, check Metro bundler logs
npx expo start --android

# Or use adb logcat
adb logcat | grep -i "notification\|expo"
```

**Common Issues:**
- **No token received**: Check if permissions were granted
- **Token not registered**: Check backend API endpoint and authentication
- **Notifications not received**: Verify Expo push notification service is working
- **App crashes**: Check if all dependencies are properly installed

## Backend Configuration

Make sure your backend has:
1. Expo Push Notification service configured
2. Device registration endpoint working (`/api/device/register`)
3. Push notification sending service working
4. Proper error handling and logging

## Environment Variables

If you need to set environment variables for the build:

```bash
# Create .env file in mobile-app directory
EXPO_PUBLIC_API_URL=https://your-api-url.com
```

Then rebuild the APK.

