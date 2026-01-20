# Zaakpay transaction flow logging

Structured `[ZP]` logs trace the full Zaakpay flow from **link creation → checkout → callback → commission** in both `server/` and `krishi-shaktisewa/`.

## Log format

- **Prefix:** `[ZP]` or `[ZP:STEP]`
- **Steps:** `LINK_CREATE`, `TXN_FETCH`, `CHECKOUT`, `CALLBACK`, `COMMISSION`, `REDIRECT`
- **Trace IDs:** `txnId=TXN_ZP_...` and `orderId=ORDER_ZP_...` (or `zaakpayOrderId`)

Example lines:

```
[ZP:LINK_CREATE] 2025-01-15T10:00:00.000Z txnId=TXN_ZP_1738... orderId=ORDER_ZP_1738... amount=100 | building payment link
[ZP:LINK_CREATE] 2025-01-15T10:00:00.100Z txnId=TXN_ZP_1738... orderId=ORDER_ZP_1738... amount=100 hostedRedirectLink=https://.../zaakpay-checkout?transaction_id=TXN_ZP_... | transaction saved, returning checkout url
[ZP:TXN_FETCH] 2025-01-15T10:00:05.000Z txnId=TXN_ZP_1738... | fetching transaction for checkout
[ZP:TXN_FETCH] 2025-01-15T10:00:05.050Z txnId=TXN_ZP_1738... orderId=ORDER_ZP_1738... amount=100 status=created | transaction found
[ZP:CHECKOUT] 2025-01-15T10:00:06.000Z txnId=TXN_ZP_1738... | redirecting to /api/zaakpay/checkout
[ZP:CHECKOUT] 2025-01-15T10:00:06.100Z txnId=TXN_ZP_1738... | Zaakpay checkout requested
[ZP:CHECKOUT] 2025-01-15T10:00:06.200Z txnId=TXN_ZP_1738... orderId=ORDER_ZP_1738... amount=100 | transaction fetched, building Zaakpay form
[ZP:CHECKOUT] 2025-01-15T10:00:06.300Z txnId=TXN_ZP_1738... orderId=ORDER_ZP_1738... | returning HTML form POST to Zaakpay
... user pays on Zaakpay ...
[ZP:CALLBACK] 2025-01-15T10:01:00.000Z txnId=TXN_ZP_1738... orderId=ORDER_ZP_1738... responseCode=100 amount=10000 paymentId=ZP_PAY_... | ========== Zaakpay callback received ==========
[ZP:CALLBACK] 2025-01-15T10:01:00.050Z txnId=TXN_ZP_1738... | transaction found
[ZP:COMMISSION] 2025-01-15T10:01:00.060Z txnId=TXN_ZP_1738... gross=100 commission=4.48 net=95.52 rate=4.484 | commission applied
[ZP:CALLBACK] 2025-01-15T10:01:00.100Z txnId=TXN_ZP_1738... zaakpayPaymentId=ZP_PAY_... netAmount=95.52 commission=4.48 processingTimeMs=120 | status=paid
[ZP:REDIRECT] 2025-01-15T10:01:00.200Z txnId=TXN_ZP_1738... status=paid | success: returning auto-close HTML
```

## How to trace one payment

1. Get `transaction_id` (e.g. `TXN_ZP_1738...`) or `order_id` (`ORDER_ZP_...`) from your app or DB.
2. Grep logs:
   - **Server:** `grep "TXN_ZP_1738" /var/log/your-app.log` or `grep "ORDER_ZP_1738" ...`
   - **krishi-shaktisewa (Next.js):** same `grep` on the process output or your log aggregation.

## Where logs are emitted

| Step           | Layer              | File / handler |
|----------------|--------------------|----------------|
| LINK_CREATE    | server             | `zaakpayController.createZaakpayPaymentLink` |
| TXN_FETCH      | server             | `zaakpayController.getZaakpayTransaction` |
| CHECKOUT       | krishi-shaktisewa  | `app/zaakpay-checkout/page.tsx`, `app/api/zaakpay/checkout/route.ts` |
| CALLBACK       | server + next      | `zaakpayController.handleZaakpayCallback`, `app/api/zaakpay/callback/route.ts` |
| COMMISSION     | server             | `zaakpayController.handleZaakpayCallback` (inside success branch) |
| REDIRECT       | krishi-shaktisewa  | `app/api/zaakpay/callback/route.ts`, `app/payment-success/page.tsx` |

## Commission

Commission is logged in `[ZP:COMMISSION]` with:

- `gross`: amount in ₹ (from Zaakpay, or from stored `transaction.amount`)
- `commission`: computed fee (base 3.8% + 18% GST on that)
- `net`: `gross - commission`
- `rate`: effective percentage

Formula: `server/utils/commissionCalculator.js` → `calculatePayinCommission`.

## Utilities

- **Server:** `server/utils/zaakpayLogger.js` → `zplog.step()`, `zplog.phase()`, `zplog.log()`, `zplog.err()`
- **krishi-shaktisewa:** `lib/zaakpayLogger.ts` → `step()`, `phase()`, `log()`, `err()`

Both use the same `[ZP]` / `[ZP:STEP]` format so you can correlate server and Next.js logs by `txnId` or `orderId`.
