# Mobile App Notification API

## Overview
This API allows superadmins to send push notifications to mobile app users directly from the web dashboard.

## Endpoint

### Send Notification
**POST** `/api/superadmin/notifications/send`

Send a push notification to mobile app users.

#### Authentication
- Requires SuperAdmin authentication
- Header: `x-auth-token: <JWT_TOKEN>`

#### Request Body

```json
{
  "title": "Notification Title",
  "body": "Notification message body",
  "target": "all_superadmins" | "specific_user",
  "userId": "user_id_here" // Required only if target is "specific_user"
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | Notification title (max 100 characters) |
| `body` | string | Yes | Notification message body (max 500 characters) |
| `target` | string | Yes | Target audience: `"all_superadmins"` or `"specific_user"` |
| `userId` | string | Conditional | Required when `target` is `"specific_user"` |

#### Response

**Success (200 OK)**
```json
{
  "success": true,
  "message": "Notification sent to 3 device(s)",
  "sent": 3,
  "errors": 0
}
```

**Error (400 Bad Request)**
```json
{
  "success": false,
  "error": "Title and body are required"
}
```

**Error (500 Internal Server Error)**
```json
{
  "success": false,
  "error": "Failed to send notification",
  "details": "Error message"
}
```

## cURL Examples

### Send Notification to All SuperAdmins

```bash
curl -X POST https://himora.art/api/superadmin/notifications/send \
  -H "Content-Type: application/json" \
  -H "x-auth-token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiNjkzYmFjZDBhNGQ3OWU1NTk0MTcxYzRlIiwicm9sZSI6InN1cGVyQWRtaW4ifSwiaWF0IjoxNzY3MDcxOTczLCJleHAiOjE3Njc2NzY3NzN9.X-bt2HJ4u4rnQoMCxwQ0XmzOF18_13ZN1ODzGJpvdkQ" \
  -d '{
    "title": "Welcome to the ninex payment gateway",
    "body": "Test message",
    "target": "all_superadmins"
  }'
```

### Send Notification to Specific User

```bash
curl -X POST http://localhost:5000/api/superadmin/notifications/send \
  -H "Content-Type: application/json" \
  -H "x-auth-token: YOUR_JWT_TOKEN" \
  -d '{
    "title": "Account Update",
    "body": "Your account settings have been updated",
    "target": "specific_user",
    "userId": "507f1f77bcf86cd799439011"
  }'
```

### Send Payout Reminder Notification

```bash
curl -X POST http://localhost:5000/api/superadmin/notifications/send \
  -H "Content-Type: application/json" \
  -H "x-auth-token: YOUR_JWT_TOKEN" \
  -d '{
    "title": "Payout Reminder",
    "body": "You have 5 pending payout requests awaiting approval",
    "target": "all_superadmins"
  }'
```

### Send System Alert

```bash
curl -X POST http://localhost:5000/api/superadmin/notifications/send \
  -H "Content-Type: application/json" \
  -H "x-auth-token: YOUR_JWT_TOKEN" \
  -d '{
    "title": "⚠️ System Alert",
    "body": "High transaction volume detected. Please review dashboard.",
    "target": "all_superadmins"
  }'
```

## Notification Types

The API automatically sets the notification type in the data payload:

- **Custom Notification**: `type: "custom_notification"`
- **Payout Request**: `type: "payout_request"` (automatically sent when payout is created)

## Mobile App Handling

The mobile app handles notifications based on the `type` field:

### Custom Notifications
- Shows an alert dialog with the title and body
- No automatic navigation
- User can dismiss the notification

### Payout Request Notifications
- Shows an alert with payout details
- Provides "View Now" button to navigate to payouts screen
- Automatically refreshes dashboard data

## Error Handling

### Common Errors

1. **Missing Title or Body**
   ```json
   {
     "success": false,
     "error": "Title and body are required"
   }
   ```

2. **Invalid Target**
   ```json
   {
     "success": false,
     "error": "Target must be either \"all_superadmins\" or \"specific_user\""
   }
   ```

3. **Missing User ID**
   ```json
   {
     "success": false,
     "error": "userId is required when target is \"specific_user\""
   }
   ```

4. **No Devices Found**
   ```json
   {
     "success": false,
     "error": "No superadmin devices found"
   }
   ```

## Rate Limiting

- No rate limiting currently implemented
- Consider implementing rate limiting for production use

## Best Practices

1. **Keep titles short**: Maximum 50-60 characters for best mobile display
2. **Clear messaging**: Use concise, actionable messages
3. **Appropriate targeting**: Use `all_superadmins` for general announcements, `specific_user` for personal messages
4. **Test notifications**: Always test notifications before sending to all users
5. **Monitor delivery**: Check the `sent` and `errors` fields in the response

## Integration Example

### JavaScript/React

```javascript
const sendNotification = async (title, body, target, userId = null) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/superadmin/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify({
        title,
        body,
        target,
        userId
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log(`Notification sent to ${data.sent} device(s)`);
      return data;
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};

// Usage
await sendNotification(
  'System Update',
  'New features are now available in the mobile app',
  'all_superadmins'
);
```

## Testing

### Test with cURL

```bash
# Get your JWT token first (from login)
TOKEN="your_jwt_token_here"

# Send test notification
curl -X POST http://localhost:5000/api/superadmin/notifications/send \
  -H "Content-Type: application/json" \
  -H "x-auth-token: $TOKEN" \
  -d '{
    "title": "Test Notification",
    "body": "This is a test notification from the API",
    "target": "all_superadmins"
  }'
```

### Verify on Mobile App

1. Ensure the mobile app is running and logged in as superadmin
2. The app should automatically register for push notifications
3. Send a test notification using the API
4. Check the mobile device for the notification
5. Verify the notification appears correctly

## Notes

- Notifications are sent via Expo Push Notification service
- Delivery is not guaranteed (depends on device connectivity)
- Invalid or expired push tokens are automatically filtered
- The API returns the number of successful and failed deliveries

