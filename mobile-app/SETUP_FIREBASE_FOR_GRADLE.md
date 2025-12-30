# Setup Firebase for Local Gradle Builds

Since you're building with `./gradlew assembleRelease` (not EAS), you need to configure Firebase manually.

## Step-by-Step Guide

### Step 1: Create Firebase Project

1. Go to https://console.firebase.google.com
2. Click "Add project" or select an existing project
3. Follow the setup wizard:
   - Enter project name (e.g., "Payments App")
   - Enable/disable Google Analytics (optional)
   - Click "Create project"

### Step 2: Add Android App to Firebase

1. In Firebase Console, click the Android icon (or "Add app" → Android)
2. Fill in the details:
   - **Android package name:** `com.payments.app`
   - **App nickname:** `Payments App` (optional)
   - **Debug signing certificate SHA-1:** (optional, leave blank for now)
3. Click "Register app"

### Step 3: Download google-services.json

1. Firebase will show a "Download google-services.json" button
2. Click to download the file
3. **IMPORTANT:** Save this file to:
   ```
   /home/pranjal/himora/mobile-app/android/app/google-services.json
   ```

### Step 4: Verify File Location

The file structure should be:
```
mobile-app/
├── android/
│   ├── app/
│   │   ├── google-services.json  ← HERE
│   │   ├── build.gradle
│   │   └── src/
│   └── build.gradle
```

**Note:** The Google Services plugin has been added to the build files automatically. You just need to add the `google-services.json` file.

### Step 5: Rebuild APK

```bash
cd /home/pranjal/himora/mobile-app/android
./gradlew clean
./gradlew assembleRelease
```

### Step 6: Install and Test

1. Install the new APK on your device
2. Open the app
3. Go to Settings → Toggle Push Notifications ON
4. Check logs - you should see "✅ Push token obtained" instead of Firebase error

## Verification

After setup, when you enable notifications, you should see:
- ✅ "Push token obtained" in logs
- ✅ Device registered successfully
- ✅ Device appears in backend when you run: `curl -X GET "https://himora.art/api/device/list?role=superAdmin" -H "x-auth-token: YOUR_TOKEN"`

## Troubleshooting

### File Not Found
- Make sure `google-services.json` is at: `android/app/google-services.json`
- Check file permissions: `chmod 644 android/app/google-services.json`

### Still Getting Firebase Error
- Make sure you rebuilt the APK after adding the file
- Check that package name in `google-services.json` matches `com.payments.app`
- Try: `cd android && ./gradlew clean && ./gradlew assembleRelease`

### Package Name Mismatch
- The package name in `google-services.json` must exactly match `com.payments.app`
- Check `app.json` to confirm package name

## Quick Reference

**Package Name:** `com.payments.app`  
**File Location:** `mobile-app/android/app/google-services.json`  
**Rebuild Command:** `cd android && ./gradlew clean && ./gradlew assembleRelease`

