#!/bin/bash

# Script to commit and push changes in 10 logical commits

cd /home/pranjal/himora

# Commit 1: Fix authentication token handling
git add mobile-app/services/authService.ts mobile-app/services/apiService.ts
git commit -m "fix: Fix authentication token handling in mobile app

- Trim token to remove whitespace
- Set authLoaded flag immediately after login
- Update in-memory token state synchronously
- Add better error logging for debugging"

# Commit 2: Improve login flow
git add mobile-app/app/login.tsx
git commit -m "fix: Improve login flow with token verification

- Verify token is available before redirecting
- Ensure auth is fully loaded after login
- Add better error handling"

# Commit 3: Dashboard improvements
git add mobile-app/app/\(admin\)/dashboard.tsx
git commit -m "fix: Add delay and logging to dashboard initialization

- Add small delay to ensure token is available
- Add logging for authentication state
- Improve error handling for API calls"

# Commit 4: Add UI components
git add mobile-app/components/Navbar.tsx mobile-app/components/Sidebar.tsx mobile-app/components/MetricCard.tsx
git commit -m "feat: Add Navbar, Sidebar, and MetricCard components matching client UI

- Create Navbar component with search, notifications, user menu
- Create Sidebar component with navigation items
- Create MetricCard component for dashboard metrics
- Match client UI styling and functionality"

# Commit 5: Update theme constants
git add mobile-app/constants/theme.ts
git commit -m "feat: Update theme constants to match client color scheme

- Add client UI color palette (#001D22, #122D32, #263F43, #475C5F)
- Add text colors for dark backgrounds
- Add status colors (success, danger, warning, info)"

# Commit 6: Update mobile app UI
git add mobile-app/app/login.tsx mobile-app/app/\(admin\)/_layout.tsx mobile-app/app/\(superadmin\)/_layout.tsx
git commit -m "feat: Update mobile app UI to match client design

- Update login page with X logo and dark theme
- Switch from Tabs to Stack navigation
- Match client UI styling and layout"

# Commit 7: Fix order creation in cart
git add krishi-shaktisewa/app/cart/page.tsx
git commit -m "fix: Include product name and details in order items

- Add productName to order items (required by backend)
- Add variantName, price, and brand for better order tracking
- Fix both COD and Cashfree checkout flows"

# Commit 8: Update order and payment APIs
git add krishi-shaktisewa/lib/api/orders.ts krishi-shaktisewa/lib/api/payments.ts
git commit -m "fix: Update order and payment APIs to include product details

- Add productName, variantName, price, brand to order items
- Update CreatePaymentSessionRequest interface
- Fix 'Product name is required' error"

# Commit 9: Update dashboard UI
git add mobile-app/app/\(admin\)/dashboard.tsx mobile-app/components/MetricCard.tsx mobile-app/assets/images/X.png 2>/dev/null
git commit -m "feat: Update admin dashboard to match client UI

- Add background X graphic
- Add greeting section with date range selector
- Add metric cards grid matching client design
- Add quick actions section"

# Commit 10: Remaining changes
git add -A
git commit -m "chore: Update mobile app configuration and assets

- Add X.png logo to assets
- Update app layouts and navigation
- Minor fixes and improvements"

# Push all commits
echo "Pushing commits to remote..."
git push

echo "Done! All changes have been committed and pushed."

