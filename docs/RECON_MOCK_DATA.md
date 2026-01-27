# Reconciliation Mock – Dummy Data & Sample Recon Run

**All data below is fictitious.** Used for partner review before a technical deep dive.

---

## Part (1): Dummy Journal / Postings (Balanced)

Commission logic: **3.8%** base + **18% GST** on commission → effective ~**4.484%**.  
Example: ₹1,000 → base ₹38, GST ₹6.84 → **fee ₹44.84**, **net ₹955.16**.

---

### (1a) Capture + Fee

**Event:** Customer payment captured. Order `ORD_MOCK_001`, internal `TXN_MOCK_001`, gateway `pay_xxx_cf_001`.  
**Amount:** ₹1,000.00 | **Fee:** ₹44.84 | **Net to merchant:** ₹955.16

| # | Date       | Account             | Dr (INR)   | Cr (INR)   | Reference        | Description                    |
|---|------------|---------------------|------------|------------|------------------|--------------------------------|
| 1 | 2026-01-20 | gateway_receivable  | 1,000.00   |            | pay_xxx_cf_001   | Capture received from gateway  |
| 2 | 2026-01-20 | revenue             |            | 955.16     | ORD_MOCK_001     | Merchant net revenue           |
| 3 | 2026-01-20 | commission_income   |            | 44.84      | ORD_MOCK_001     | Platform fee                   |
|   |            | **Total**           | **1,000.00** | **1,000.00** |                 | **Balanced** ✓                 |

**Equivalent merchant payable:** We owe merchant ₹955.16 (booked as `revenue` here; in practice may map to `merchant_payable`).

---

### (1b) Partial Refund

**Event:** Partial refund on same order. Refund **₹400.00**.  
**Original:** ₹1,000, fee ₹44.84, net ₹955.16. We do **not** reverse fee on refunded amount in this mock (fee retained).

| # | Date       | Account             | Dr (INR)   | Cr (INR)   | Reference        | Description                    |
|---|------------|---------------------|------------|------------|------------------|--------------------------------|
| 1 | 2026-01-21 | revenue             | 400.00     |            | ORD_MOCK_001     | Partial refund (reduce revenue)|
| 2 | 2026-01-21 | gateway_receivable  |            | 400.00     | rfd_yyy_001      | Refund paid via gateway        |
|   |            | **Total**           | **400.00**   | **400.00**   |                 | **Balanced** ✓                 |

**Result:** Revenue reduced by ₹400. Merchant effectively retains credit for ₹555.16 (955.16 − 400) of the original net; gateway receivable reduced by ₹400.

---

### (1c) Dispute + Reversal

**Event:** Separate txn **fully disputed** and reversed. Order `ORD_MOCK_002`, internal `TXN_MOCK_002`, gateway `pay_xxx_cf_002`.  
**Original capture:** ₹2,500.00 | **Fee:** ₹112.10 | **Net:** ₹2,387.90. **Full reversal.**

| # | Date       | Account             | Dr (INR)     | Cr (INR)   | Reference        | Description                    |
|---|------------|---------------------|--------------|------------|------------------|--------------------------------|
| 1 | 2026-01-22 | revenue             | 2,387.90     |            | ORD_MOCK_002     | Reversal of merchant net       |
| 2 | 2026-01-22 | commission_income   | 112.10       |            | ORD_MOCK_002     | Reversal of platform fee       |
| 3 | 2026-01-22 | gateway_receivable  |              | 2,500.00   | pay_xxx_cf_002   | Dispute reversal               |
|   |            | **Total**           | **2,500.00**   | **2,500.00** |                 | **Balanced** ✓                 |

**Result:** Capture and fee fully reversed; gateway receivable reduced by full ₹2,500.

---

### (1d) Dummy transaction-like rows (client/server schema)

These map to our `Transaction` model and dashboard; same fictitious data as above.

| transactionId | orderId      | amount   | commission | netAmount | status         | refundAmount | paymentGateway | gateway_ref    |
|---------------|--------------|----------|------------|-----------|----------------|--------------|----------------|----------------|
| TXN_MOCK_001  | ORD_MOCK_001 | 1,000.00 | 44.84      | 955.16    | partial_refund | 400.00       | cashfree       | pay_xxx_cf_001 |
| TXN_MOCK_002  | ORD_MOCK_002 | 2,500.00 | 112.10     | 2,387.90  | refunded       | 2,500.00     | cashfree       | pay_xxx_cf_002 |
| TXN_MOCK_003  | ORD_MOCK_003 | 750.00   | 33.63      | 716.37    | paid           | 0            | cashfree       | pay_xxx_cf_003 |

*(TXN_MOCK_001: capture + fee, then partial refund. TXN_MOCK_002: dispute + full reversal. TXN_MOCK_003: exception — ledger 750 vs bank 745.50 → adjustment applied.)*

---

## Part (2): Sample Recon Run Output

**Run ID:** `RECON_20260127_001`  
**Run at:** `2026-01-27T14:30:00Z`  
**Internal ledger range:** `2026-01-20` to `2026-01-22`  
**Bank/settlement file:** `SETTLEMENT_BANK_20260127.csv` (mock).

---

### 2.1 Matched Items

| Ledger ID   | Order ID      | Amount (INR) | Gateway ref    | Bank ref         | Match key   | Status   |
|-------------|---------------|--------------|----------------|------------------|-------------|----------|
| TXN_MOCK_001| ORD_MOCK_001  | 1,000.00     | pay_xxx_cf_001 | BK_TXN_1001      | amount+ref  | matched  |
| TXN_MOCK_002| ORD_MOCK_002  | 2,500.00     | pay_xxx_cf_002 | BK_TXN_1002      | amount+ref  | matched  |
| rfd_yyy_001 | ORD_MOCK_001  | −400.00      | rfd_yyy_001    | BK_REF_2001      | amount+ref  | matched  |

**Summary:** 3 ledger lines matched to 3 bank lines. No amount or ref mismatches for these.

---

### 2.2 Exception (Single Example)

| Field        | Ledger side                    | Bank side                       | Discrepancy                          |
|-------------|---------------------------------|----------------------------------|--------------------------------------|
| **Entity**  | TXN_MOCK_003 / ORD_MOCK_003     | BK_TXN_1003                     | —                                    |
| **Amount**  | 750.00                          | 745.50                          | **Δ = 4.50** (bank less than ledger) |
| **Gateway ref** | pay_xxx_cf_003              | pay_xxx_cf_003                  | Same                                 |
| **Date**    | 2026-01-21                     | 2026-01-21                      | Same                                 |

**Exception type:** `AMOUNT_MISMATCH`  
**Code:** `RECON_EX_001`

---

### 2.3 Resolution / Backfill / Adjustment Path

| Step | Action           | Description                                                                 |
|------|------------------|-----------------------------------------------------------------------------|
| 1    | **Flag**         | Exception `RECON_EX_001` created; item excluded from “matched” tally.       |
| 2    | **Investigate**  | Check gateway dashboard & our logs: ₹4.50 difference → **gateway fee/tax** deducted at bank but not in our initial capture posting. |
| 3    | **Adjustment**   | Post **adjustment** in ledger: Dr `gateway_fee_adjustment` 4.50, Cr `gateway_receivable` 4.50. Link to `TXN_MOCK_003` and `RECON_EX_001`. |
| 4    | **Backfill**     | Store resolution in recon result: `exception_id: RECON_EX_001`, `resolution: ADJUSTMENT`, `adjustment_ref: ADJ_MOCK_003`, `resolved_at: 2026-01-27T14:32:01Z`. |
| 5    | **Re-run**       | Next recon run treats `TXN_MOCK_003` as matched (after adjustment). Optional: batch job to re-match adjusted items. |

**Path summary:** **Exception → Investigate → Post adjustment → Backfill resolution → Re-run (optional).**

---

### 2.4 Recon Run Summary (Mock)

```
RECON RUN SUMMARY
-----------------
Run ID:           RECON_20260127_001
Run at:           2026-01-27T14:30:00Z
Ledger range:     2026-01-20 .. 2026-01-22
Bank file:        SETTLEMENT_BANK_20260127.csv

Matched:          3
Exceptions:       1 (AMOUNT_MISMATCH)
Resolution:       ADJUSTMENT (RECON_EX_001 → ADJ_MOCK_003)
Unmatched bank:   0
Unmatched ledger: 0 (after adjustment)
```

---

## Quick Reference

- **Plan:** `docs/RECON_MOCK_PLAN.md`
- **Sample recon logs:** `server/docs/RECON_MOCK_LOGS.txt`

---

*All IDs, amounts, and timestamps are dummy. Last updated: 2026-01-27.*
