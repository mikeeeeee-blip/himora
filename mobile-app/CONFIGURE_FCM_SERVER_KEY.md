# Configure FCM Server Key for Expo Push Notifications

## Issue
You're getting this error when sending push notifications:
```
Unable to retrieve the FCM server key for the recipient's app. 
Make sure you have provided a server key as directed by the Expo FCM documentation.
```

This happens because Expo's push notification service needs the FCM (Firebase Cloud Messaging) server key to send notifications to Android devices.

## Solution: Configure FCM Server Key in Expo

### Step 1: Get FCM Server Key from Google Cloud Console

**Note:** The server key is NOT in Firebase Console. You need to get it from Google Cloud Console.

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. **Select your Firebase project** (it should be named "payments ninex" or similar)
   - If you don't see it, make sure you're logged in with the same Google account used for Firebase
3. Navigate to **APIs & Services** → **Credentials** (in the left sidebar)
4. Look for **API Keys** section
5. Find the key that says **"Server key"** or **"Firebase Cloud Messaging"** or **"Legacy server key"**
   - It will start with `AAAA...` (a long alphanumeric string)
6. **If you don't see a Server Key:**
   - Click **"+ CREATE CREDENTIALS"** → **"API key"**
   - A new API key will be created
   - Click on the newly created key to edit it
   - Under **"API restrictions"**, select **"Restrict key"**
   - Choose **"Firebase Cloud Messaging API (Legacy)"** from the list
   - Click **"Save"**
   - **Copy the key** (it starts with `AIza...` or `AAAA...`)

7. **Alternative: Enable Legacy API to get Server Key**
   - In Firebase Console → Project Settings → Cloud Messaging
   - Click the **three dots (⋮)** next to **"Cloud Messaging API (Legacy)"**
   - Click **"Enable"** (if available)
   - The server key should appear after enabling

**Important:** The Sender ID (`845134953350`) is different from the Server Key. You need the Server Key (starts with `AAAA...` or `AIza...`).

### Step 2: Configure in Expo Dashboard

**Option A: Via Expo Dashboard (Recommended)**

1. Go to [Expo Dashboard](https://expo.dev/)
2. Sign in with your Expo account
3. Select your project: **payments** (or find project ID: `7fc96d97-5298-4beb-83f5-56b827c8350a`)
4. Go to **Credentials** → **Android** (or **Push Notifications**)
5. Find **FCM Server Key** section
6. Paste your FCM Server Key
7. Click **Save**

**Option B: Via EAS CLI**

```bash
cd /home/pranjal/himora/mobile-app

# Login to Expo (if not already)
eas login

# Configure FCM credentials
eas credentials
# Select: Android
# Select: Push Notifications
# Enter your FCM Server Key when prompted
```

### Step 3: Verify Configuration

After configuring the FCM server key:

1. Wait a few minutes for Expo to process the configuration
2. Test sending a notification:

```bash
curl -X POST https://himora.art/api/superadmin/notifications/send \
  -H "Content-Type: application/json" \
  -H "x-auth-token: YOUR_TOKEN" \
  -d '{
    "title": "Test Notification",
    "body": "Testing FCM configuration",
    "target": "all_superadmins"
  }'
```

3. Check server logs - you should see:
   - ✅ `Push notification sent: 1 success, 0 errors`
   - Instead of: ❌ `Unable to retrieve the FCM server key`

## Alternative: Use EAS Build (Automatic Configuration)

If you have access to EAS and the project permissions, EAS build can automatically configure FCM:

```bash
cd /home/pranjal/himora/mobile-app

# Login to Expo
eas login

# Build with EAS (this will prompt for FCM credentials if not set)
eas build --platform android --profile preview --local
```

During the build, EAS will prompt you to configure FCM credentials if they're not already set.

## Troubleshooting

### "Project not found" or Permission Issues
- Make sure you're logged into the correct Expo account
- Verify you have access to project ID: `7fc96d97-5298-4beb-83f5-56b827c8350a`
- If you don't have access, you may need to:
  1. Create a new Expo project, OR
  2. Get access to the existing project from the project owner

### "FCM Server Key not found" in Firebase
- **The server key is NOT in Firebase Console** - it's in Google Cloud Console
- Go to Google Cloud Console → APIs & Services → Credentials
- Look for "Server key" or create a new API key restricted to "Firebase Cloud Messaging API (Legacy)"
- The Sender ID (like `845134953350`) is different from the Server Key - you need the Server Key
- If the Legacy API is disabled, you can:
  1. Enable it in Firebase Console (Cloud Messaging tab → three dots next to Legacy API)
  2. OR create an API key in Google Cloud Console and restrict it to FCM Legacy API

### Still Getting Errors After Configuration
- Wait 5-10 minutes after configuring - Expo needs time to process
- Verify the server key is correct (no extra spaces, correct format)
- Check that your Firebase project is the same one used in `google-services.json`
- Make sure the package name matches: `com.payments.app`

## Quick Reference

**Expo Project ID:** `7fc96d97-5298-4beb-83f5-56b827c8350a`  
**Package Name:** `com.payments.app`  
**Expo Dashboard:** https://expo.dev/accounts/[your-account]/projects/payments  
**Firebase Console:** https://console.firebase.google.com/  
**FCM Server Key Location:** Firebase Console → Project Settings → Cloud Messaging → Server Key

## Important Notes

- The FCM Server Key is different from `google-services.json`
  - `google-services.json` → Goes in your Android app (for receiving notifications)
  - FCM Server Key → Configured in Expo dashboard (for sending notifications)
- Both are required for push notifications to work
- The server key is sensitive - don't commit it to git
- One FCM server key can be used for multiple apps in the same Firebase project

