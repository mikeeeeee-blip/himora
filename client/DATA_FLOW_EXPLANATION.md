# AdminDashboard Data Flow Explanation

## Overview
The AdminDashboard component displays two main sections that require real transaction data:
1. **Quick Analytics** - Shows charts for Payin, Payout, and Settlement
2. **Today Transactions** - Shows a filtered table of today's transactions

## Data Fetching

### 1. Quick Analytics Chart Data (`fetchChartData`)

**Purpose**: Fetches historical data for the chart visualization based on selected date range (Daily, Weekly, Monthly).

**Endpoints Used**:
- **Payin**: `/api/payments/merchant/transactions/search`
  - Fetches all transactions within date range
  - No status filter (gets all transactions)
  
- **Payout**: `/api/payments/merchant/payouts/search`
  - Fetches all payouts within date range
  
- **Settlement**: `/api/payments/merchant/transactions/search`
  - Fetches paid transactions first
  - Then filters for settled transactions (must have `settlementStatus: "settled"` OR `settlementDate`)

**Data Processing**:
- Groups transactions by date (YYYY-MM-DD format)
- Sums amounts per day
- Uses `amount` for payin (gross amount)
- Uses `netAmount` for payout and settlement (after commission)
- Fills missing dates with zero values for smooth chart visualization

**When Called**: 
- On component mount
- When `dateRange` changes (Daily/Weekly/Monthly)

---

### 2. Today Transactions (`fetchTodayTransactions`)

**Purpose**: Fetches ONLY today's transactions for the "Today Transactions" table.

**Date Range**: 
- Today 00:00:00 to Tomorrow 00:00:00 (exclusive)
- Example: If today is 2025-01-15, fetches from 2025-01-15 00:00:00 to 2025-01-16 00:00:00

**Endpoints Used**:
- **Payin**: `/api/payments/merchant/transactions/search`
  ```javascript
  {
    startDate: "2025-01-15", // Today
    endDate: "2025-01-16",   // Tomorrow (exclusive)
    limit: 100,
    sortBy: "createdAt",
    sortOrder: "desc"
  }
  ```
  
- **Payout**: `/api/payments/merchant/payouts/search`
  ```javascript
  {
    startDate: "2025-01-15", // Today
    endDate: "2025-01-16",   // Tomorrow (exclusive)
    limit: 100,
    sortBy: "createdAt",
    sortOrder: "desc"
  }
  ```
  
- **Settlement**: `/api/payments/merchant/transactions/search`
  ```javascript
  {
    startDate: "2025-01-15", // Today
    endDate: "2025-01-16",   // Tomorrow (exclusive)
    status: "paid",          // Must be paid
    limit: 100,
    sortBy: "createdAt",
    sortOrder: "desc"
  }
  ```
  Then filters for: `settlementStatus === "settled"` OR has `settlementDate`

**Data Validation**:
- ✅ Must have valid date field (`createdAt`, `requestedAt`, etc.)
- ✅ Must have valid amount (number > 0)
- ✅ Settlement must have settlement status or date
- ❌ Invalid records are filtered out

**Data Processing**:
Each transaction is enriched with:
- `type`: "payin" | "payout" | "settlement"
- `transactionId` or `payoutId`: For navigation
- `amount`: Parsed as float
- `customerName`: Extracted from various fields
- `status`: Transaction status

**When Called**: 
- On component mount
- Every 30 seconds (auto-refresh)
- When date range changes

---

## Data Display

### Quick Analytics Section

**Chart Data**:
- Uses `chartData` state which contains:
  - `chartData.payin[]` - Array of { date, amount, count }
  - `chartData.payout[]` - Array of { date, amount, count }
  - `chartData.settlement[]` - Array of { date, amount, count }

**Summary Cards**:
- **Today payin**: Sum of today's payin amounts from `todayTransactions.payin`
- **Last payin**: Most recent payin from chart data or today's transactions
- **Today payout**: Count of today's payouts from `todayTransactions.payout`

---

### Today Transactions Table

**Filtering**:
The `getFilteredTransactions()` function combines all three types:
```javascript
allTransactions = [
  ...todayTransactions.payin,      // All payin transactions
  ...todayTransactions.payout,     // All payout transactions  
  ...todayTransactions.settlement  // All settlement transactions
]
```

Then filters based on selected filter:
- **"all"**: Shows all transactions
- **"payin"**: Shows only payin transactions
- **"payout"**: Shows only payout transactions
- **"settlement"**: Shows only settlement transactions

**Table Columns**:
- **Name**: `customerName` or `description` or `beneficiaryDetails.accountHolderName`
- **Amount**: `amount` or `netAmount` (formatted as currency)
- **Type**: `type` field ("payin", "payout", "settlement")
- **Status**: `status` field
- **Label**: Color-coded badge ("In", "Out", "Settled")

---

## API Response Structure

### Transaction Response (Payin/Settlement)
```javascript
{
  transactionId: "txn_123",
  transaction_id: "txn_123",  // Alternative field name
  amount: 1000.00,             // Gross amount
  netAmount: 962.00,           // After commission (for settlement)
  net_amount: 962.00,          // Alternative field name
  customerName: "John Doe",
  customer_name: "John Doe",   // Alternative field name
  customer: {
    name: "John Doe",
    email: "john@example.com"
  },
  createdAt: "2025-01-15T10:30:00Z",
  created_at: "2025-01-15T10:30:00Z",  // Alternative field name
  status: "paid",
  settlementStatus: "settled",  // For settlement
  settlement_status: "settled", // Alternative field name
  settlementDate: "2025-01-16T04:00:00Z",
  settlement_date: "2025-01-16T04:00:00Z"  // Alternative field name
}
```

### Payout Response
```javascript
{
  payoutId: "payout_123",
  payout_id: "payout_123",      // Alternative field name
  amount: 500.00,                // Gross amount
  netAmount: 485.00,             // After commission
  requestedAt: "2025-01-15T14:00:00Z",
  createdAt: "2025-01-15T14:00:00Z",  // Alternative
  created_at: "2025-01-15T14:00:00Z", // Alternative
  status: "completed",
  description: "Monthly payout",
  beneficiaryDetails: {
    accountHolderName: "Jane Doe"
  }
}
```

---

## Key Points

1. **Real Data Only**: All data comes from API endpoints, no mock/fake data
2. **Date Filtering**: Today's transactions use strict date range (00:00:00 to 23:59:59)
3. **Validation**: All transactions are validated before display
4. **Auto-Refresh**: Today's transactions refresh every 30 seconds
5. **Error Handling**: If API fails, empty arrays are set (no crashes)
6. **Logging**: Console logs show exactly what data is fetched and processed

---

## Troubleshooting

**If no data appears**:
1. Check browser console for API errors
2. Verify API endpoints are accessible
3. Check date range filters
4. Verify authentication token is valid

**If data seems incorrect**:
1. Check console logs for data validation messages
2. Verify transaction dates are within the selected range
3. Check that settlement transactions have `settlementStatus: "settled"`


