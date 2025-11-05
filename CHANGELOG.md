# Changelog

All notable changes to the Ninex Group Payment Gateway Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.0.0] - 2025-11-05

### Added
- New comprehensive API Documentation Page in Admin Dashboard
- Mobile deep link support for PhonePe, Google Pay, and UPI apps
- Unified webhook configuration API endpoint
- Enhanced webhook UI with secret visibility toggle
- Updated login page with new logo

### Changed
- Payment link response now includes multiple deep link types
- Improved API documentation UI with better spacing and alignment
- Enhanced PhonePe controller with dynamic environment support
- Better webhook configuration state management

### Fixed
- Deep link generation issues for mobile payment apps
- Webhook UI display issues where configurations disappeared
- API documentation layout and spacing issues
- Code block alignment in authentication tabs

## [Unreleased]

### Added
- **API Documentation Page** - Comprehensive API documentation accessible from the Admin Dashboard
  - Complete authentication guide with API Key and JWT Token methods
  - Detailed endpoint documentation for all payment APIs
  - Request/response examples with payloads for all endpoints
  - Code examples in multiple languages (cURL, JavaScript, Python)
  - Getting started guide with step-by-step instructions
  - Webhook configuration and testing documentation
  - Report generation API documentation
  - API key management endpoints
  - Best practices and security recommendations
  - Warning cards highlighting critical information (JWT expiration, token usage)
  - Responsive design with tabbed interface for easy navigation

- **Mobile Deep Link Support** - Enhanced mobile payment experience
  - Integrated PhonePe Customized Deeplink API (`/v3/deeplink`) for reliable direct app opening
  - Support for multiple deep link types:
    - PhonePe Intent URLs (direct app opening)
    - Google Pay deep links (`gpay://` and `intent://`)
    - Generic UPI deep links (`upi://`)
    - Android Intent URLs for UPI apps
  - Intelligent fallback system: prioritized deeplink API → UPI_INTENT API → checkout URL
  - Improved error handling and logging for deep link generation
  - Environment-based URL selection (UAT vs Production)
  - Legacy deep link generation only when valid VPA is available

- **Unified Webhook Configuration API** - Consolidated webhook management
  - New unified endpoint: `GET /api/payments/merchant/webhook/all/config`
  - Single API call to retrieve both payment and payout webhook configurations
  - Backward compatible with individual webhook endpoints
  - Improved webhook service with unified fetching method

- **Enhanced Webhook UI** - Improved webhook configuration interface
  - Always-visible webhook cards for both Payment and Payout webhooks
  - Show/hide toggle for webhook secrets with eye icon
  - Copy buttons for webhook URLs and secrets
  - Clear visual distinction between configured and unconfigured webhooks
  - Separate loading states for each webhook type
  - Improved error handling and state persistence

- **Login Page Improvements**
  - Updated logo to use `/X.png` image instead of text-based logo
  - Responsive logo sizing for mobile and desktop

### Changed
- **Payment Link Response Structure** - Enhanced response format
  - Added multiple deep link types in payment link creation response:
    - `checkout_url` - Universal link for web and mobile browsers
    - `phonepe_deep_link` - PhonePe-specific deep link
    - `gpay_deep_link` - Google Pay deep link
    - `gpay_intent` - Google Pay Android Intent URL
    - `upi_deep_link` - Generic UPI deep link
    - `intent_url` - Direct app-opening intent URL (prioritized)
  - Improved mobile app deep link reliability and user experience

- **API Documentation Enhancements**
  - Added JWT token expiration information (7 days) with refresh instructions
  - Improved warning card placement at the top of authentication sections
  - Better code block spacing and alignment in Getting Started and Authentication tabs
  - Full-width code blocks and warning cards for better readability
  - Enhanced CSS styling for improved visual hierarchy

- **PhonePe Controller Improvements**
  - Removed TypeScript type annotations (migrated to pure JavaScript)
  - Dynamic environment-based base URL selection (UAT vs Production)
  - Enhanced intent URL extraction with multiple fallback paths
  - Improved error handling with detailed logging for API responses
  - Corrected Google Pay deep link formats (`https://gpay.app.goo.gl/upi/pay?` and Intent format)
  - Removed hardcoded UPI ID dependency for intent link generation

- **Webhook Configuration State Management**
  - Improved state persistence to prevent configuration loss
  - Better error handling that preserves existing configurations
  - Enhanced loading states with separate indicators for each webhook type

### Fixed
- **Deep Link Generation Issues**
  - Fixed Google Pay deep links redirecting to Play Store instead of app
  - Fixed PhonePe deep links showing retry options instead of opening app
  - Corrected Android Intent URL formats for UPI apps
  - Fixed invalid deep link generation when UPI ID is not available
  - Improved fallback mechanism to ensure a usable link is always returned

- **Webhook UI Display Issues**
  - Fixed webhook configurations not appearing in UI after API response
  - Fixed conditional rendering that was hiding webhook cards
  - Ensured both payment and payout webhook cards are always visible
  - Fixed state management issues causing configurations to disappear

- **API Documentation UI Issues**
  - Fixed code block spacing and alignment in authentication tabs
  - Fixed width adjustment issues in authentication section
  - Removed HTML comment causing parsing issues
  - Fixed JSX syntax error with `<` character in text content

### Technical Improvements
- **Code Quality**
  - Removed TypeScript type annotations from `phonepeController.js`
  - Consolidated duplicate imports
  - Improved error logging and debugging information
  - Added comprehensive console logging for development debugging

- **API Endpoints**
  - Added `WEBHOOK_ALL_CONFIG` constant in frontend API constants
  - Updated webhook service to support unified configuration fetching
  - Maintained backward compatibility with existing individual webhook endpoints

### Security
- **Webhook Secret Protection**
  - Added show/hide toggle for webhook secrets in UI
  - Secrets are hidden by default for security
  - Copy functionality for easy secret management

### Documentation
- **API Documentation**
  - Complete API reference with all endpoints
  - Request/response examples for all payment operations
  - Authentication methods clearly explained
  - Webhook configuration and testing guides
  - Best practices and security recommendations
  - Code examples in multiple programming languages

---

## Previous Releases

*Note: Previous changelog entries would be documented here as the project evolves.*

---

## Version History

- **Current Version**: v1.0.0
- **Last Updated**: 2025-11-05

---

## Notes

- All API endpoints require proper authentication (API Key or JWT Token)
- JWT tokens expire after 7 days and require refreshing
- Webhook configurations support both payment and payout events
- Deep links are automatically generated for mobile payment apps
- Checkout URLs work universally on both web and mobile browsers

