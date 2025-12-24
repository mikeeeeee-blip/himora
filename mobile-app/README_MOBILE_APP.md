# Mobile App - Payment Dashboard

This is the React Native mobile version of the payment dashboard, built with Expo Router and TypeScript.

## Features

- ✅ **Safe Area Support**: All screens use `SafeAreaView` for proper display on devices with notches
- ✅ **Authentication**: Login with role-based access (Admin/Superadmin)
- ✅ **API Integration**: Connected to `https://himora.art/api`
- ✅ **Admin Dashboard**: View transactions, payouts, create payments, manage webhooks
- ✅ **Superadmin Dashboard**: Manage all merchants, transactions, payouts, and payment gateway settings
- ✅ **Tab Navigation**: Bottom tab navigation for easy access to main features
- ✅ **Pull to Refresh**: All list screens support pull-to-refresh

## Installation

1. Install dependencies:
```bash
npm install
```

2. Install required packages (if not already installed):
```bash
npx expo install @react-native-async-storage/async-storage axios
```

## Project Structure

```
mobile-app/
├── app/
│   ├── _layout.tsx          # Root layout with safe area
│   ├── index.tsx             # Index route (redirects based on auth)
│   ├── login.tsx             # Login screen
│   ├── (admin)/              # Admin routes group
│   │   ├── _layout.tsx       # Admin tab navigation
│   │   ├── dashboard.tsx     # Admin dashboard
│   │   ├── transactions.tsx  # Transactions list
│   │   ├── payouts.tsx       # Payouts list
│   │   ├── payments.tsx      # Create payment link
│   │   └── webhooks.tsx      # Webhook configuration
│   └── (superadmin)/         # Superadmin routes group
│       ├── _layout.tsx       # Superadmin tab navigation
│       ├── dashboard.tsx     # Superadmin dashboard
│       ├── transactions.tsx  # All transactions
│       ├── payouts.tsx       # All payouts
│       ├── merchants.tsx     # Merchant management
│       └── settings.tsx      # Payment gateway settings
├── components/
│   └── AuthWrapper.tsx      # Authentication wrapper component
├── constants/
│   └── api.ts               # API endpoints and constants
└── services/
    ├── authService.ts       # Authentication service (AsyncStorage)
    └── apiService.ts        # Axios instance with interceptors
```

## API Configuration

The app is configured to use `https://himora.art/api` as the base URL. This is set in:
- `constants/api.ts` - All API endpoints
- `services/apiService.ts` - Axios instance configuration

## Key Features

### Authentication
- Uses AsyncStorage for token persistence
- Automatic token injection in API requests
- Role-based route protection
- Auto-redirect based on user role

### Safe Area Handling
- All screens use `SafeAreaView` from `react-native-safe-area-context`
- Proper handling of notches and system UI
- Consistent padding across all devices

### Navigation
- Expo Router for file-based routing
- Tab navigation for main sections
- Stack navigation for detail screens
- Back button support on all screens

## Running the App

```bash
# Start Expo development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on web
npm run web
```

## Environment Variables

No environment variables needed - the API URL is hardcoded to `https://himora.art/api` as requested.

## Screens Overview

### Admin Screens
1. **Dashboard**: Overview with stats and quick actions
2. **Transactions**: List of all transactions with status badges
3. **Payouts**: List of payouts with request functionality
4. **Payments**: Create payment links form
5. **Webhooks**: Webhook configuration and testing

### Superadmin Screens
1. **Dashboard**: System-wide statistics
2. **Transactions**: All transactions across all merchants
3. **Payouts**: All payouts across all merchants
4. **Merchants**: Merchant list and management
5. **Settings**: Payment gateway enable/disable

## Notes

- All screens follow the same design pattern for consistency
- Error handling with Alert dialogs
- Loading states on all async operations
- Pull-to-refresh on all list screens
- Proper TypeScript types throughout

