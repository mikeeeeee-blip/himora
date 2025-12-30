# Push Notification Implementation Guide

## Overview
This document describes the complete push notification flow for payout requests from Admin to SuperAdmin.

## Flow Diagram
```
Admin (Web/Mobile) 
    ↓
Creates Payout Request → POST /api/payments/merchant/payout/request
    ↓
Node.js Backend saves to DB
    ↓
Finds SuperAdmin Push Tokens from Device collection
    ↓
Sends Push Notification via Expo Push Notification Service
    ↓
SuperAdmin React Native App receives notification
```

## Backend Implementation

### 1. Device Model (`server/models/Device.js`)
- Stores push tokens for users (admin/superAdmin)
- Fields: `userId`, `role`, `pushToken`, `platform`, `deviceId`, `isActive`
- Indexed for efficient queries

### 2. Device Controller (`server/controllers/deviceController.js`)
- `registerDevice()`: Register/update device push token
- `getDeviceTokensByRole()`: Get all tokens for a role (used internally)
- `getDeviceTokensByUserId()`: Get tokens for specific user
- `unregisterDevice()`: Mark device as inactive

### 3. Push Notification Service (`server/services/pushNotificationService.js`)
- `sendPushNotification()`: Send notification to array of tokens
- `notifySuperAdmins()`: Send notification to all superadmins
- `notifyUser()`: Send notification to specific user
- Uses Expo Push Notification API: `https://exp.host/--/api/v2/push/send`

### 4. Device Routes (`server/routes/deviceRoutes.js`)
- `POST /api/device/register` - Register device (requires JWT auth)
- `POST /api/device/unregister` - Unregister device (requires JWT auth)

### 5. Updated Payout Request (`server/controllers/adminController.js`)
- After saving payout request, automatically sends push notification to all superadmins
- Notification includes: title, body, and data payload with payout details

## Mobile App Implementation

### 1. Push Notification Service (`mobile-app/services/pushNotificationService.ts`)
- `registerForPushNotifications()`: Request permissions and get Expo push token
- `registerDeviceToken()`: Register token with backend
- `setupPushNotificationsForSuperAdmin()`: Complete setup for superadmin on login
- `setupNotificationListeners()`: Setup listeners for foreground/background notifications

### 2. Updated Auth Service (`mobile-app/services/authService.ts`)
- Stores `userId` in AsyncStorage after login
- Added `getUserId()` method

### 3. Updated Login Screen (`mobile-app/app/login.tsx`)
- After successful superadmin login, automatically sets up push notifications
- Calls `setupPushNotificationsForSuperAdmin(userId)` in background

### 4. API Endpoints (`mobile-app/constants/api.ts`)
- Added `DEVICE_REGISTER` and `DEVICE_UNREGISTER` endpoints

### 5. App Configuration (`mobile-app/app.json`)
- Added `expo-notifications` plugin

## Installation Steps

### Backend
No additional packages needed - uses built-in `axios` for HTTP requests.

### Mobile App
Install expo-notifications:
```bash
cd mobile-app
npx expo install expo-notifications
```

## Usage

### SuperAdmin Login Flow
1. SuperAdmin logs in
2. App requests push notification permissions
3. Gets Expo push token
4. Registers token with backend via `POST /api/device/register`
5. Token stored in Device collection

### Payout Request Flow
1. Admin creates payout request
2. Backend saves payout to DB
3. Backend finds all superadmin device tokens
4. Backend sends push notification via Expo API
5. SuperAdmin receives notification on mobile device

### Notification Payload
```json
{
  "title": "💰 New Payout Request",
  "body": "Merchant Name requested payout of ₹1000.00",
  "data": {
    "type": "payout_request",
    "payoutId": "PAYOUT_REQ_...",
    "merchantId": "...",
    "merchantName": "...",
    "amount": 1000,
    "grossAmount": 1035.40,
    "status": "requested",
    "timestamp": "2025-01-20T10:30:00.000Z"
  },
  "sound": "default",
  "badge": 1
}
```

## Testing

### Test Device Registration
```bash
POST /api/device/register
Headers: { "x-auth-token": "JWT_TOKEN" }
Body: {
  "userId": "USER_ID",
  "pushToken": "ExponentPushToken[xxxx]",
  "role": "superAdmin",
  "platform": "android"
}
```

### Test Push Notification
Create a payout request as admin - superadmin should receive notification.

## Important Notes

1. **Expo Project ID**: The push notification service tries to get projectId from `expo-constants`. If you're using EAS, make sure your `app.json` or `eas.json` has the project ID configured.

2. **Permissions**: The app will request notification permissions on first login. User must grant permissions for notifications to work.

3. **Token Updates**: Push tokens only change when:
   - App is reinstalled
   - App data is cleared
   - User uninstalls and reinstalls

4. **Error Handling**: If push notification fails, the payout request still succeeds (notification failure doesn't block payout creation).

5. **Multiple Devices**: A superadmin can have multiple devices registered. All will receive notifications.

## Troubleshooting

### No notifications received
1. Check if device is registered: Query Device collection in MongoDB
2. Check if permissions are granted: Check device settings
3. Check Expo push token: Should start with `ExponentPushToken[`
4. Check backend logs for push notification errors

### Token registration fails
1. Verify JWT token is valid
2. Verify userId matches logged-in user
3. Verify role matches user role
4. Check backend logs for errors

## Database Schema

### Device Collection
```javascript
{
  userId: ObjectId (ref: User),
  role: "superAdmin" | "admin",
  pushToken: String (unique),
  platform: "android" | "ios" | "web",
  deviceId: String,
  appVersion: String,
  isActive: Boolean,
  lastUsedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## API Endpoints

### Register Device
- **Endpoint**: `POST /api/device/register`
- **Auth**: JWT Token (x-auth-token header)
- **Body**:
  ```json
  {
    "userId": "USER_ID",
    "pushToken": "ExponentPushToken[xxxx]",
    "role": "superAdmin",
    "platform": "android",
    "deviceId": "optional",
    "appVersion": "optional"
  }
  ```

### Unregister Device
- **Endpoint**: `POST /api/device/unregister`
- **Auth**: JWT Token
- **Body**:
  ```json
  {
    "pushToken": "ExponentPushToken[xxxx]"
  }
  ```

## Next Steps

1. Install `expo-notifications` in mobile app
2. Test device registration on superadmin login
3. Test payout request notification flow
4. Add notification tap handler to navigate to payout details
5. Add notification badge count management





# View all devices
curl -X GET "http://localhost:3000/api/device/list" \
  -H "x-auth-token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiNjkzYmFjZDBhNGQ3OWU1NTk0MTcxYzRlIiwicm9sZSI6InN1cGVyQWRtaW4ifSwiaWF0IjoxNzY3MDcxOTczLCJleHAiOjE3Njc2NzY3NzN9.X-bt2HJ4u4rnQoMCxwQ0XmzOF18_13ZN1ODzGJpvdkQ"

# View devices by role
curl -X GET "https://himora.art/api/device/list?role=superAdmin" \
  -H "x-auth-token: YOUR_SUPERADMIN_JWT_TOKEN"

# View devices by role and active status
curl -X GET "https://himora.art/api/device/list?role=superAdmin&isActive=true" \
  -H "x-auth-token: YOUR_SUPERADMIN_JWT_TOKEN"

# View devices for a specific user
curl -X GET "https://himora.art/api/device/list?userId=USER_ID_HERE" \
  -H "x-auth-token: YOUR_SUPERADMIN_JWT_TOKEN"






# Delete ALL devices (⚠️ DANGEROUS - deletes everything)
curl -X DELETE "https://himora.art/api/device/flush" \
  -H "x-auth-token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiNjkzYmFjZDBhNGQ3OWU1NTk0MTcxYzRlIiwicm9sZSI6InN1cGVyQWRtaW4ifSwiaWF0IjoxNzY3MDcxOTczLCJleHAiOjE3Njc2NzY3NzN9.X-bt2HJ4u4rnQoMCxwQ0XmzOF18_13ZN1ODzGJpvdkQ"

# Delete all devices for a specific role
curl -X DELETE "https://himora.art/api/device/flush?role=superAdmin" \
  -H "x-auth-token: YOUR_SUPERADMIN_JWT_TOKEN"

# Delete all devices for a specific user
curl -X DELETE "https://himora.art/api/device/flush?userId=USER_ID_HERE" \
  -H "x-auth-token: YOUR_SUPERADMIN_JWT_TOKEN"

# Delete devices for a specific role and user
curl -X DELETE "https://himora.art/api/device/flush?role=superAdmin&userId=USER_ID_HERE" \
  -H "x-auth-token: YOUR_SUPERADMIN_JWT_TOKEN"