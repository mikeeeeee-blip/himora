# Reconciliation Mock – Plan & Deliverables

**Purpose:** Provide dummy sample data and a sample recon run so a partner can confirm whether our capture/fee, refund, dispute+reversal handling and reconciliation flows align before scheduling a technical deep dive.

**Scope:** Client + Server (Himora payment platform). All figures, IDs, and timestamps below are **mock/dummy** and for illustration only.

---

## 1. What We Are Sending

| # | Deliverable | Description |
|---|-------------|-------------|
| **(1)** | **Dummy journal/postings** | Balanced double-entry rows for: (a) **Capture + fee**, (b) **Partial refund**, (c) **Dispute + reversal** |
| **(2)** | **Sample recon run output** | Matched items, **one exception**, and the **resolution/backfill/adjustment path** |

Supporting docs:

- **Plan (this file):** `docs/RECON_MOCK_PLAN.md`
- **Mock data & recon output:** `docs/RECON_MOCK_DATA.md`
- **Sample recon run logs:** `server/docs/RECON_MOCK_LOGS.txt`

---

## 2. Plan Overview

### 2.1 Journal & Postings

- We use a **double-entry style** ledger:
  - **Accounts:** `gateway_receivable`, `revenue`, `commission_income`, `merchant_payable`, `refund_reserve`
- Each event produces **balanced** debits/credits (sum of Dr = sum of Cr).
- Amounts use **INR**, and fee logic matches our **pay-in commission** (3.8% + 18% GST on commission → effective ~4.484%).

### 2.2 Events Covered

1. **Capture + fee**  
   Customer pays ₹1,000. We recognise revenue, deduct platform fee, and book merchant payable. All entries balance.

2. **Partial refund**  
   Same txn partially refunded (e.g. ₹400). We reduce revenue/merchant obligation and gateway receivable; fee on the refunded amount can be reversed or retained per policy (mock shows one approach).

3. **Dispute + reversal**  
   A separate txn is fully disputed and reversed. We reverse capture and fee via balanced journal entries.

### 2.3 Reconciliation Run

- **Inputs:** Internal ledger (from our `Transaction` / ledger store) vs. **bank/settlement file** (or gateway statement).
- **Output:**  
  - **Matched** items (ledger ↔ bank),  
  - **One exception** (e.g. amount mismatch, timing difference, or missing-on-one-side),  
  - **Resolution path:** how we **backfill**, **adjust**, or **escalate** to resolve it.

### 2.4 Logs

- Sample **recon run logs** showing:
  - Run id, date, input file references
  - Match / exception counters
  - The chosen resolution (backfill vs. adjustment vs. manual review) and any follow-up actions

---

## 3. Next Steps

1. Partner reviews **(1)** and **(2)** (and logs).
2. Partner confirms whether capture+fee, partial refund, dispute+reversal flows and the exception-resolution path are acceptable.
3. If yes → schedule **technical deep dive** (APIs, webhooks, settlement, actual recon implementation).

---

## 4. Reference

- **Client:** `client/` (dashboard, transactions, payouts, balance).
- **Server:** `server/` (payment controllers, settlement job, payout/revert logic, `Transaction` model).
- **Schema:** `docs/database_schema.md`, `server/models/Transaction.js`, `server/models/Payout.js`.

---

*Last updated: 2026-01-27. All data in linked mock files is fictitious.*
