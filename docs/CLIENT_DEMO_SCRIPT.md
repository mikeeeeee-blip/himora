# Client Demo Script – Ledger & Reconciliation

Use this runbook when showing the **double-entry ledger** and **reconciliation** features to the client. It covers setup, what to show on the **frontend**, and what to point out in **server logs**.

---

## Quick start

```bash
# 1. From project root
chmod +x scripts/run-demo.sh
./scripts/run-demo.sh

# 2. In another terminal (to watch server logs during demo)
tail -f demo-server.log

# 3. Browser: http://localhost:3000 → Login as Superadmin
# 4. Follow Section 3–6 below.
```

For local API, ensure `client/.env.local` has `VITE_API_URL=http://localhost:5000/api` and restart client.

---

## 1. Prerequisites

- **Node.js** (v18+)
- **MongoDB** running (local or remote)
- **Superadmin** login credentials

---

## 2. Start Server & Client

### Option A: Two terminals (recommended for demo)

**Terminal 1 – Server**

```bash
cd server
cp .env.example .env   # if needed; set MONGO_URI / MONGODB_URI
npm run dev            # or: node index.js
```

Keep this terminal visible. You’ll use it to show **server logs** (`[LEDGER]`, `[RECON]`).

**Terminal 2 – Client**

```bash
cd client
# Optional: point to local API
# echo "VITE_API_URL=http://localhost:5000/api" > .env.local
npm run dev
```

Open **http://localhost:3000** (or the URL Vite prints).

### Option B: Use `scripts/run-demo.sh`

From project root:

```bash
chmod +x scripts/run-demo.sh
./scripts/run-demo.sh
```

This starts the server in the background (logs → `demo-server.log`) and the client in the foreground. To watch **server logs** during the demo, open a **second terminal** and run:

```bash
tail -f demo-server.log
```

Look for `📒 [LEDGER]` and `📋 [RECON]` lines as you use the Ledger and Reconciliation UIs. See Section 7.

---

## 3. Login & Dashboard

1. Go to **http://localhost:3000/login**.
2. Log in as **Superadmin**.
3. You should land on **Superadmin Dashboard** (or **Superadmin** home).

**Point out:**

- Platform stats (payin, payout, etc.).
- **Double-Entry Ledger** card:
  - Accounts, journal entries, postings counts.
  - **“Dr = Cr enforced”**.
  - **“Posted journals immutable · Tenant-scoped”**.
  - **View Ledger** button.

**Server logs to show (Terminal 1):**

- When the dashboard loads, ledger overview is fetched:
  - `📒 [LEDGER] ... GET /api/ledger/overview`
  - `📒 [LEDGER] ... Ledger overview served { accountCount, journalCount, postingCount, allBalanced }`

---

## 4. Ledger (Double-Entry)

1. Click **Ledger** in the nav (or **View Ledger** on the dashboard).
2. On the Ledger page, show:
   - **Control-plane invariants** strip:
     - Dr = Cr enforced at write time.
     - Tenant-scoped (merchantId).
     - Immutability – posted journals cannot be edited.
   - **Overview cards**: Accounts, Journal entries, Postings, **All balanced**.
   - **Chart of accounts**: Code, name, type, tenant.
   - **Journal entries** table: ID, type, order/txn, **Immutable** badge, **View**.

3. Click **View** on a row (e.g. **JE_001**).
4. On the **journal detail** page, show:
   - **Account | Dr | Cr | Reference** table.
   - **Total** row (Dr = Cr).
   - **“Dr = Cr”** and **“Immutable”** badges.

**Server logs to show:**

- `📒 [LEDGER] ... GET /api/ledger/overview`
- `📒 [LEDGER] ... GET /api/ledger/accounts`
- `📒 [LEDGER] ... GET /api/ledger/journal`
- `📒 [LEDGER] ... Ledger accounts served { count: 3 }`
- `📒 [LEDGER] ... Ledger journal list served { count: 3 }`
- When opening a journal:  
  `📒 [LEDGER] ... GET /api/ledger/journal/:id`  
  `📒 [LEDGER] ... Ledger journal detail served { id: 'JE_001', type: 'capture', balanced: true }`

---

## 5. Reconciliation

1. Click **Reconciliation** in the nav.
2. On **Overview**, show the **“Partner review – what you asked for”** panel:
   - **(1) Balanced journal / postings**: Capture+fee, partial refund, dispute+reversal. Links to **View Journal**, **JE_001**, **JE_002**, **JE_003**.
   - **(2) Sample recon run**: Matched items, one exception, resolution path. **View sample run** → `RECON_20260127_001`.

3. Click **View sample run**.
4. On the run detail page, show:
   - **Matched items** table (ledger ↔ bank).
   - **Exception** (e.g. AMOUNT_MISMATCH, delta ₹4.50).
   - **Resolution path**: Flag → Investigate → Adjustment → Backfill → Re-run.

5. Go back to Reconciliation → **Server Logs** tab.
6. Show recent **recon logs** (timestamp, level, message, runId, id, type, etc.).

**Server logs to show (Terminal 1):**

- When you open Reconciliation (overview):
  - `📋 [RECON] ... GET /api/recon/overview`
  - `📋 [RECON] ... Recon overview served { ... }`
- When you open **Server Logs** tab:
  - `📋 [RECON] ... GET /api/recon/logs`
  - `📋 [RECON] ... Recon logs fetched { requested, returned }`
- When you open runs, journal, or exceptions:
  - `📋 [RECON] ... GET /api/recon/runs` / `.../journal` / `.../exceptions` etc.
  - Corresponding “served” log lines with counts, ids, types.

**Optional:** Scroll in the **Server Logs** tab and point out:
- Recon run started, matched ledger ↔ bank, exception raised, exception resolved, journal posted, run completed.

---

## 6. Quick Checklist (During Demo)

| Step | Frontend | Server logs (Terminal 1) |
|------|----------|---------------------------|
| 1 | Login → Superadmin dashboard | — |
| 2 | **Double-Entry Ledger** card; **View Ledger** | `[LEDGER]` overview + served |
| 3 | Ledger page: invariants, accounts, journals | `[LEDGER]` accounts, journal list |
| 4 | **View** a journal (e.g. JE_001); Dr/Cr totals | `[LEDGER]` journal detail |
| 5 | **Reconciliation** → Partner review panel | `[RECON]` overview |
| 6 | **View sample run** → matched + exception + resolution | `[RECON]` run detail |
| 7 | **Server Logs** tab in Reconciliation | `[RECON]` logs fetched; show log entries |

---

## 7. Run Script (Optional)

**`scripts/run-demo.sh`** starts the server (background, logs → `demo-server.log`) and the client (foreground).

**From project root:**

```bash
chmod +x scripts/run-demo.sh
./scripts/run-demo.sh
```

**To see server logs during the demo:** in a **second terminal**, run:

```bash
tail -f demo-server.log
```

You’ll see `📒 [LEDGER]` and `📋 [RECON]` lines as you use the Ledger and Reconciliation pages.

**Manual alternative:** Use **Terminal 1** for `cd server && npm run dev` and **Terminal 2** for `cd client && npm run dev`. Keep Terminal 1 visible for logs.

---

## 8. Troubleshooting

| Issue | What to do |
|-------|------------|
| **Ledger card shows “Ledger not available”** | Ensure MongoDB is running; check server logs for errors. Ledger seed runs on first overview request. |
| **Reconciliation or Ledger 401** | Log in as **Superadmin**. Both features require superadmin. |
| **Client can’t reach API** | Set `VITE_API_URL=http://localhost:5000/api` in `client/.env.local` and restart `npm run dev`. |
| **No `[LEDGER]` / `[RECON]` logs** | Hit Ledger/Reconciliation pages and tabs; logs appear when those APIs are called. |
| **Server fails on startup** | Check `MONGO_URI` / `MONGODB_URI` in `server/.env`. |

---

## 9. Summary

- **Ledger**: Show **dashboard card** → **Ledger page** (invariants, accounts, journals) → **journal detail** (Dr/Cr). Use **server terminal** or `tail -f demo-server.log` to show `📒 [LEDGER]` logs for each API call.
- **Reconciliation**: Show **Partner review** → **sample run** (matched, exception, resolution) → **Server Logs** tab. Use **server terminal** to show `📋 [RECON]` logs.
- **Logs**: Frontend **Server Logs** tab (Reconciliation) shows recon activity; **Terminal 1** or `tail -f demo-server.log` shows both `📒 [LEDGER]` and `📋 [RECON]` in real time.

---

## 10. What to display – frontend vs server logs

| Where | What to show |
|-------|----------------|
| **Frontend – Dashboard** | Double-Entry Ledger card (accounts, journals, postings, Dr=Cr, immutable, tenant-scoped); **View Ledger** button. |
| **Frontend – Ledger** | Invariants strip; overview counts; chart of accounts; journal list with **View**; **View** → journal detail with Dr/Cr table and **Total** row. |
| **Frontend – Reconciliation** | Partner review panel (1) journal rows + (2) sample run; **View sample run** → matched items, exception, resolution path; **Server Logs** tab with recon entries. |
| **Server logs** (`tail -f demo-server.log` or Terminal 1) | `📒 [LEDGER]` for overview, accounts, journal list, journal detail; `📋 [RECON]` for overview, runs, journal, exceptions, logs. Point these out when navigating Ledger/Reconciliation to show live API activity. |
