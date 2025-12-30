# How to Get FCM Server Key

## Quick Guide

The **FCM Server Key** is NOT in Firebase Console. You need to get it from **Google Cloud Console**.

## Step-by-Step Instructions

### Method 1: Find Existing Server Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. **Select your Firebase project** (should be "payments ninex")
   - Use the project selector at the top
3. In the left sidebar, click **"APIs & Services"** → **"Credentials"**
4. Look for **"API Keys"** section
5. Find a key that says:
   - **"Server key"** OR
   - **"Firebase Cloud Messaging"** OR
   - **"Legacy server key"**
6. Click on the key to view it
7. **Copy the key** - it starts with `AAAA...` or `AIza...` (long string)

### Method 2: Create New Server Key

If you don't see an existing server key:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Navigate to **"APIs & Services"** → **"Credentials"**
4. Click **"+ CREATE CREDENTIALS"** → **"API key"**
5. A new API key will be created and displayed
6. **Copy the key immediately** (you can see it only once)
7. Click on the key name to edit it
8. Under **"API restrictions"**:
   - Select **"Restrict key"**
   - Choose **"Firebase Cloud Messaging API (Legacy)"**
   - Click **"Save"**

### Method 3: Enable Legacy API in Firebase

If you want to see the server key in Firebase Console:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Settings** → **Project settings** → **Cloud Messaging** tab
4. Find **"Cloud Messaging API (Legacy)"** section
5. Click the **three dots (⋮)** on the right
6. Click **"Enable"** (if available)
7. The server key should appear after enabling

## Important Notes

- **Sender ID** (`845134953350`) ≠ **Server Key**
  - Sender ID: Used by the app to identify the sender
  - Server Key: Used by your backend/Expo to send notifications
- The Server Key starts with `AAAA...` or `AIza...`
- The Server Key is sensitive - don't share it publicly
- One Server Key can be used for multiple apps in the same Firebase project

## What to Do With the Server Key

Once you have the Server Key:

1. Go to [Expo Dashboard](https://expo.dev/)
2. Select your project (ID: `7fc96d97-5298-4beb-83f5-56b827c8350a`)
3. Go to **Credentials** → **Android** → **FCM Server Key**
4. Paste the Server Key
5. Click **Save**

## Troubleshooting

### "I only see Sender ID, not Server Key"
- The Server Key is in Google Cloud Console, not Firebase Console
- Follow Method 1 or Method 2 above

### "I can't find API Keys in Google Cloud Console"
- Make sure you've selected the correct project
- The project name should match your Firebase project
- Try: **APIs & Services** → **Credentials** → **API Keys** (at the top)

### "The key I created doesn't work"
- Make sure you restricted it to **"Firebase Cloud Messaging API (Legacy)"**
- Wait a few minutes after creating/restricting the key
- Verify the key starts with `AAAA...` or `AIza...`

## Quick Reference

**Where to get Server Key:** Google Cloud Console → APIs & Services → Credentials  
**What it looks like:** `AAAA...` or `AIza...` (long alphanumeric string)  
**Where to use it:** Expo Dashboard → Your Project → Credentials → Android → FCM Server Key  
**Sender ID (different):** `845134953350` (this is NOT the server key)

