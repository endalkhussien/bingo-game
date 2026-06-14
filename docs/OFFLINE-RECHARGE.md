# Offline recharge — 5 agents on separate PCs

When agents and admin are **not on the same network**, use **signed offline recharge codes**.

---

## The problem

Each agent PC has its own local database. Admin cannot approve a “recharge request” from another computer unless they share the same database.

**Recharge requests** only work on **one shared PC**.

---

## Best solution: offline recharge codes

Admin generates a **one-time signed code** after receiving real money (cash, Telebirr, bank). Agent enters the code on **their own PC** — no internet, no connection to admin.

```
Agent pays admin (cash / Telebirr)     Admin PC                    Agent PC #2
        │                                   │                            │
        └──────── SMS / phone call ────────►│ Generate code (500 ETB)    │
                                            │ Send: TBG-500-ABC12-...    │
                                            └──────── SMS / call ───────►│
                                                                         │ Recharge → paste code
                                                                         │ Balance +500 ETB ✓
```

### Why this works offline

- Code is **cryptographically signed** in the app
- **Any** installed copy of TEBIB-Bingo can verify it (same secret built into the app)
- Code is marked **used** on the agent PC so it cannot be entered twice on that machine
- Optional: bind code to **one agent username** so only that login can redeem it

---

## Step-by-step

### Admin (after agent pays you)

1. Open **Recharge Codes** in the sidebar
2. Enter amount (e.g. 500 ETB)
3. Optionally select **which agent** (recommended for 5 separate agents)
4. Click **Generate recharge code**
5. Copy code and send by **SMS, phone call, or paper**

### Agent (on their own PC)

1. **Recharge** → **Voucher Code**
2. Paste the code from admin
3. Click **Recharge** — balance updates immediately

---

## Compare options for 5 disconnected agents

| Method | Works offline? | Separate PCs? | Best for |
|--------|----------------|---------------|----------|
| **Offline recharge code** | Yes | **Yes** | **Your setup (recommended)** |
| Admin visits PC and deposits | Yes | Yes (manual) | Admin in same town |
| Recharge request + approve | Yes | **No** (same DB only) | One shared computer |
| Seeded demo vouchers | Yes | **No** (same DB only) | Testing only |
| Telebirr in app | No | Yes | Needs internet + API (not built) |

---

## Security notes

- **One code = one payment** — generate a new code for each top-up
- **Bind to agent username** when possible — stops Agent B using Agent A’s code
- Code **expires** after 30 days (configurable in code generation)
- If the same code is redeemed on **two different PCs** before either marks it used, both could credit once (rare if you send unique codes per agent). Binding to username + one agent per code reduces this risk.

---

## Daily workflow example (5 agents)

1. Agent Abebe runs out of balance → calls admin, pays 500 ETB cash
2. Admin generates `TBG-500-…` for username `abebe` → texts code
3. Abebe redeems on his PC → plays again
4. Repeat for agents 2–5 independently

No internet required at any step.

---

## Where to find it in the app

| Role | Menu |
|------|------|
| Admin | **Recharge Codes** → generate |
| Agent | **Recharge** → **Voucher Code** → paste |
