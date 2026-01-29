# Technical Deep Dive Prep – Control-Plane Foundations

**Purpose:** Prep for the 60–75 min technical deep dive. The client wants to **validate the control-plane foundations** behind the reconciliation UI, not just the UI itself. Use **NDA-safe, dummy data** and generic entities.

**Attendees (to confirm):** Technical Lead / Lead Architect or Lead Backend Engineer.

---

## Quick Checklist

- [ ] Assign **lead** for the call (name + title).
- [ ] Choose **2–3 time slots** (60–75 min) and insert into draft reply below.
- [ ] Send **reply** to client accepting deep dive + proposed slots.
- [ ] **(Optional)** Implement P1–P4 (Section 5.2) so you can **demo code** on the call.
- [ ] **(Optional)** Add simple **diagrams** (ledger flow, idempotency flow, recon states, provider adapters) for screen-share.

---

## 1. Ledger Model

**Client ask:** *A true double-entry structure (accounts, journal entries, postings) with enforced invariants (Dr = Cr), tenant scoping, and immutability conventions.*

### 1.1 Current State

- **Transaction** model: payment-centric (orderId, amount, status, gateway refs, merchantId). One record per payment. **Not** double-entry.
- **Reconciliation UI**: Uses **mock** journal data (`reconMockData.js`). Structure (Account, Dr/Cr, ref) exists only in static JSON; no DB persistence, no invariants.

### 1.2 Gap

- No `Account`, `JournalEntry`, or `Posting` collections.
- No enforcement of Dr = Cr at write time.
- No formal tenant scoping for ledger (merchantId exists on Transaction; no ledger-level tenant).
- No immutability: Transaction is mutable (status updates, refunds, etc.).

### 1.3 Target Architecture (to present)

| Concept | Description | NDA-safe example |
|--------|-------------|-------------------|
| **Accounts** | Chart of accounts per tenant (e.g. `gateway_receivable`, `revenue`, `commission_income`). Tenant = `merchantId` (or orgId). | `ACC_M1_revenue`, `ACC_M1_gateway_receivable` |
| **JournalEntry** | Header: `tenantId`, `type` (capture / refund / dispute_reversal / adjustment), `reference` (orderId, txnId), `postedAt`. Immutable once posted. | `JE_001`, `type: capture`, `ref: ORD_001` |
| **Posting** | Line items: `journalEntryId`, `accountId`, `amount`, `side` (dr/cr), `ref`. | Dr `gateway_receivable` 1000, Cr `revenue` 955.16, Cr `commission_income` 44.84 |
| **Invariant** | On insert: `SUM(dr) = SUM(cr)` per journal. Enforced in application logic and optionally DB constraint/trigger. | Reject journal if not balanced. |
| **Immutability** | No updates/deletes to posted journals. Reversals or corrections = **new** journal entries (e.g. reversal, adjustment). | Fix tx via ADJ_003, not by editing JE_001. |
| **Tenant scoping** | All queries filter by `tenantId`. Accounts and journals are tenant-isolated. | `Account.find({ tenantId: merchantId })`. |

**Implementation outline:**

- Mongoose models: `Account`, `JournalEntry`, `Posting`.
- `JournalEntry` pre-save: aggregate postings, assert `Math.abs(sumDr - sumCr) < epsilon`.
- `Posting` schema: `journalEntryId`, `accountId`, `amount`, `side`, `ref`.
- API to create journal: validate balance, set `postedAt`, insert. No update endpoint for posted journals.

---

## 2. Idempotency & Event Handling

**Client ask:** *Where idempotency is persisted for API calls and provider webhooks, how deduplication works, and how retries, replays, and out-of-order events are safely handled.*

### 2.1 Current State

- **API calls:** No explicit idempotency keys. Create-payment flows use `orderId` (unique). Duplicate `orderId` → DB unique error.
- **Webhooks:** Each PSP controller (Cashfree, PayU, Razorpay, etc.) looks up `Transaction` by `transactionId` or `orderId`. If found and status already `paid` (or same terminal state), skip update (“already processed”). No separate idempotency store.
- **Documentation:** `UNIVERSAL_CALLBACK_SCHEMA.md` recommends idempotency (check by `transaction_id`, same status → ignore).

### 2.2 Gap

- No **dedicated idempotency store** (e.g. `IdempotencyKey` table). Dedup is “natural” via unique transaction/order.
- No **per-request idempotency key** for payment-create or other mutating APIs.
- **Out-of-order / replays:** Handled ad hoc (e.g. “if paid, ignore”). No explicit event version or sequence; no formal replay window.

### 2.3 Target Architecture (to present)

| Concern | Where | How |
|--------|-------|-----|
| **API idempotency** | Payment-create, refund, etc. | Client sends `Idempotency-Key: <key>`. Server stores `key → (response, status)` in `IdempotencyKey` collection with TTL (e.g. 24h). Same key within TTL → return stored response; no duplicate charge. |
| **Webhook idempotency** | PSP webhook handler | Persist `(provider, provider_event_id)` or `(provider, payment_id, event_type)` in `ProcessedWebhookEvent`. Before processing: lookup; if exists → 200 + “already processed”. After success: insert. |
| **Deduplication** | Both | Keys are **deterministic**: API = client idempotency key; Webhook = provider event id (or composite). Same key ⇒ same outcome. |
| **Retries** | PSP → us | We return 200 quickly; processing async optional. Or process sync, then 200. Idempotency key ensures retries don’t double-apply. |
| **Replays** | Webhooks | Store `processed_at`. Reject if `event_timestamp` too old (e.g. > 5 min) to limit replay window. Already processed ⇒ 200, no op. |
| **Out-of-order** | Events | Option A: Process in order per `(transactionId, event_type)` using a queue. Option B: Idempotent handlers + idempotency keys; last-write-wins for terminal state, with audit log. |

**Implementation outline:**

- New collection: `IdempotencyKey` – `key` (unique), `response`, `status`, `createdAt`, TTL index.
- New collection: `ProcessedWebhookEvent` – `provider`, `providerEventId` (or composite), `createdAt`, TTL.
- Payment-create API: check `Idempotency-Key`; if present and stored → return stored response. Else process, then store.
- Each webhook handler: check `ProcessedWebhookEvent`; if exists → 200. Else process, insert, then 200.

---

## 3. Reconciliation Internals

**Client ask:** *How reconciliation operates at the data/model level (ledger vs provider artifacts), including matching logic, state transitions, and how exceptions flow through adjustment/backfill and re-run—not just the UI resolution path.*

### 3.1 Current State

- **UI:** Mock reconciliation dashboard (runs, journal, exceptions, resolution path). Data from `reconMockData.js`; no real engine.
- **Data:** No `ReconRun`, `ReconException`, or `ReconMatch` collections. No matching logic or state machine.

### 3.2 Gap

- Reconciliation is **mock only**. No persisted runs, no matching, no exception or adjustment flow at the data layer.

### 3.3 Target Architecture (to present)

| Concept | Description | NDA-safe example |
|--------|-------------|-------------------|
| **Ledger artifacts** | Journal-derived view: postings per tenant with `(ref, amount, side, account)`. Or materialized “ledger lines” table keyed by `txnId` / `orderId`. | `TXN_001` → +1000 gateway_receivable, −955.16 revenue, −44.84 commission. |
| **Provider artifacts** | Bank/settlement file or provider API: lines with `(provider_ref, amount, date)`. Normalized into a **provider_ledger** or **settlement_line** structure. | `BK_TXN_1001` ↔ 1000, `pay_cf_001`. |
| **Matching** | Match keys: e.g. `(amount, gateway_ref)` or `(amount, date, provider_ref)`. Match ledger lines to provider lines. Unmatched ledger / unmatched provider → candidates for exceptions. | `TXN_001` + `pay_cf_001` ↔ `BK_TXN_1001`. |
| **ReconRun** | One run = one job. Stores `runId`, `tenantId`, `ledgerRange`, `bankFile`/`provider`, `status`, `startedAt`, `finishedAt`, `summary` (matched count, exception count). | `RECON_20260127_001`. |
| **ReconMatch** | `runId`, `ledgerId`, `providerRef`, `amount`, `status: matched`. | Links TXN_001 ↔ BK_TXN_1001. |
| **ReconException** | `runId`, `exceptionId`, `type` (e.g. AMOUNT_MISMATCH, MISSING_REF, TIMING_DIFF), `entity` (ledger + provider refs), `amountDiscrepancy`, `status` (open, investigating, resolved). | `RECON_EX_001`, Δ 4.50. |
| **State transitions** | Exception: `open` → `investigating` → `resolved`. Resolution path: **Flag** (create exception) → **Investigate** (update status, notes) → **Adjustment** (post journal; link to exception) → **Backfill** (store `resolution`, `adjustment_ref`, `resolved_at` on exception) → **Re-run** (next run uses updated ledger; adjusted item can match). |
| **Re-run** | New `ReconRun` over same or extended range. Ledger now includes adjustment entries. Previously unresolved exception’s entity can match after adjustment. | Next run treats TXN_003 as matched post ADJ_003. |

**Implementation outline:**

- Models: `ReconRun`, `ReconMatch`, `ReconException`.
- Matching job: pull ledger lines (from journals/postings or materialized view) and provider lines; compute matches; insert `ReconMatch`; create `ReconException` for unmatched.
- Adjustment: create `JournalEntry` (type `adjustment`) with postings; link to `ReconException` via `adjustment_ref`.
- Backfill: update `ReconException` with `resolution: ADJUSTMENT`, `adjustment_ref`, `resolved_at`.
- Re-run: new run; matching logic runs again over updated ledger.

---

## 4. Provider Abstraction

**Client ask:** *How PSP/rail-specific events are normalized and how additional providers are added without rewriting core logic.*

### 4.1 Current State

- **Inbound:** Separate controller per PSP (Cashfree, PayU, Razorpay, Paytm, Easebuzz, SabPaisa, Zaakpay, etc.). Each has its own webhook route and handler. **No** single normalization layer.
- **Outbound:** `UNIVERSAL_CALLBACK_SCHEMA` – merchants receive a **normalized** webhook payload (`event`, `transaction_id`, `order_id`, `data`, etc.) regardless of PSP. `merchantWebhookController` (and related) send these.
- **Configuration:** `Settings.paymentGateways` (enabled, default, etc.). `Transaction.paymentGateway` stores which PSP was used.

### 4.2 Gap

- Inbound processing is **per-PSP**. Adding a new provider = new controller + new webhook route + new “find transaction, update status” logic. Shared patterns exist but no formal **adapter interface**.

### 4.3 Target Architecture (to present)

| Concept | Description |
|--------|-------------|
| **Canonical event** | Internal format: `{ eventType, transactionId, orderId, amount, status, paidAt, gatewayRef, provider, raw }`. Same shape regardless of PSP. |
| **Provider adapter** | Per-PSP module: `normalizeWebhook(rawBody, headers) → CanonicalEvent`; `fetchSettlementLines(provider, dateRange) → ProviderLedgerLine[]`. Adapters do PSP-specific parsing and API calls. |
| **Single pipeline** | One webhook router: parse provider from path or header → select adapter → `normalize` → core handler (update transaction, post journal, etc.). No PSP-specific logic in core. |
| **Adding a provider** | Implement adapter interface; register route/mapping; add config to `Settings.paymentGateways`. Core logic unchanged. |

**Implementation outline:**

- Define `CanonicalEvent` and `ProviderLedgerLine` schemas.
- `adapters/cashfree.js`, `adapters/payu.js`, etc. each export `normalizeWebhook`, `fetchSettlementLines`.
- Webhook router: `POST /webhooks/:provider` → load adapter → normalize → `handleCanonicalEvent(event)`.
- Recon: fetch provider lines via adapter; matching uses canonical `ProviderLedgerLine` format.

---

## 5. What to Do Now

### 5.1 Before the Call

1. **Confirm attendees:** Lead Architect or Lead Backend Engineer (name/title) who can screen-share and walk through code + design.
2. **Prepare demo:**  
   - **If minimal foundations are built:** Walk through `Account` / `JournalEntry` / `Posting` models, idempotency flow, recon data model, and one adapter example.  
   - **If design-only:** Use this doc + diagrams. Be explicit: “Today we have X; we’ll implement Y as per this design.”
3. **Propose 2–3 time slots:** 60–75 minutes each. Example:
   - Slot 1: [Day], [Time] [TimeZone]
   - Slot 2: [Day], [Time] [TimeZone]
   - Slot 3: [Day], [Time] [TimeZone]

### 5.2 Optional Build (Recommendation)

To **validate** foundations on the call with real code:

| Priority | Item | Effort |
|----------|------|--------|
| **P1** | Ledger: `Account`, `JournalEntry`, `Posting` models + Dr=Cr validation | 1–2 days |
| **P2** | Idempotency: `IdempotencyKey` + `ProcessedWebhookEvent`; wire into one API and one webhook | ~1 day |
| **P3** | Recon: `ReconRun`, `ReconException`, `ReconMatch` models; design doc for matching + resolution flow | ~1 day |
| **P4** | Provider adapter interface + one adapter (e.g. Cashfree) implementing it | ~0.5–1 day |

### 5.3 Reply to Client (Draft)

You can send something along these lines:

---

**Subject:** Technical deep dive – control-plane foundations

Thank you for confirming you’re open to a focused technical deep dive.

We’re comfortable covering the four areas you outlined, using NDA-safe examples (dummy data and generic entities):

1. **Ledger model:** Double-entry structure (accounts, journal entries, postings), Dr = Cr invariants, tenant scoping, and immutability conventions.  
2. **Idempotency & event handling:** Where we persist idempotency for API and webhook calls, how we deduplicate, and how we handle retries, replays, and out-of-order events.  
3. **Reconciliation internals:** How recon works at the data/model level (ledger vs provider), matching logic, state transitions, and how exceptions flow through adjustment, backfill, and re-run.  
4. **Provider abstraction:** How we normalize PSP-specific events and how we add new providers without rewriting core logic.

Our **[Title – e.g. Lead Architect / Lead Backend Engineer], [Name]**, will lead the session, screen-share, and walk through the relevant code and design.

**Proposed time slots (60–75 min):**

- Slot 1: [e.g. Tue 4 Feb, 2:00–3:15 PM IST]  
- Slot 2: [e.g. Thu 6 Feb, 10:00–11:15 AM IST]  
- Slot 3: [e.g. Mon 10 Feb, 3:30–4:45 PM IST]  

Please let us know which works best, or suggest alternatives.

Best regards,  
[Your name]

---

## 6. References

- `docs/RECON_MOCK_DATA.md` – Mock journal and recon run examples.  
- `docs/RECON_MOCK_PLAN.md` – Scope of mock reconciliation showcase.  
- `server/docs/UNIVERSAL_CALLBACK_SCHEMA.md` – Outbound webhook normalization.  
- `docs/database_schema.md` – Current DB schema (Transaction, Payout, User, etc.).
