# Three-party model — Vendor · Shop Admin · Agent

## The three parties

| Party | Login | Codes | Role |
|-------|-------|-------|------|
| **1. Vendor** | `vendor` | **TOL** (license) + **TVP** (prepaid balance) | `/vendor` portal |
| **2. Shop admin** | `admin` | Pastes TOL + TVP, issues **TAS** + **TBG** | `/admin` portal |
| **3. Agent** | custom name | Pastes **TAS**, recharges with **TBG** | `/agent` portal |

| Code | Purpose | Who generates | Who uses |
|------|---------|---------------|----------|
| **TOL** | Weekly/monthly shop license | Vendor | Shop admin |
| **TVP** | Prepaid ETB for shop admin balance | Vendor | Shop admin |
| **TAS** | One-time hall PC activation | Shop admin | Agent |
| **TBG** | Agent wallet recharge | Shop admin (uses balance) | Agent |

---

## Step-by-step workflow

### Vendor (`/vendor`)

1. Login **`vendor`** / `vendor2024`
2. **TOL Licenses** — generate weekly/monthly license for shop
3. **Shop Top-up (TVP)** — generate prepaid balance codes (e.g. 1000 ETB)
4. **Revenue & Reports** — commission summary + TVP issuance ledger
5. Send shop: **installer + admin login + TOL + TVP**

### Shop admin (`/admin`)

1. Install `.exe`, login **`admin`** / `admin123`
2. **Activate Shop Admin (TOL)** — paste TOL from vendor
3. **Shop Balance (TVP)** — paste TVP from vendor to fund balance
4. **Agents** — create agent → copy **TAS** + credentials
5. **Recharge (TBG)** — generate TBG for agents (deducts shop balance)
6. All other admin features: games, reports, settings, etc.

### Agent (hall PC)

1. **Activate PC** → paste **TAS** from shop admin
2. **Sign in** with username + password
3. **Recharge** with **TBG** from shop admin
4. **Game Board** → run games

---

## Money flow

```
Vendor  →  TVP  →  Shop admin balance
Shop admin balance  →  TBG  →  Agent wallet
Agent wallet  →  game stakes
```

When shop admin balance is low, vendor generates a new **TVP** code.

---

## Default passwords

| Account | Default | Who |
|---------|---------|-----|
| `vendor` | `vendor2024` | Vendor only |
| `admin` | `admin123` | Shop owner |
| `agent` | `agent123` | Demo agent |
