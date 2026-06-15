# TEBIB-Bingo — Real business workflow

How to run **admin + agents on separate PCs** (offline, production).

---

## Important: each PC has its own database

Every installed copy keeps data **locally**. Admin and agents do **not** share one database over the network.

| Works across PCs | Does NOT work across PCs |
|------------------|--------------------------|
| **TBG- recharge codes** (with org key) | Recharge requests + approve |
| Same username/password you create on each PC | Admin “deposit” on agent detail |

---

## One-time setup (you — operator)

### 1. Your admin PC

1. Install `TEBIB-Bingo-Setup-1.0.0.exe`
2. Login **`admin`** / **`admin123`** → change password
3. **Agents** → **Create Agent** for each hall worker:
   - Full name, **username** (e.g. `abebe`), password, admin commission %
   - Write down username + password for each agent
4. **Recharge Codes** → copy **Organization key** (same on fresh installs by default)
5. Keep this PC for generating recharge codes and reports

### 2. Each agent PC

1. Install the **same** `.exe` on the hall PC
2. Login **`admin`** / **`admin123`** (first time only)
3. **Agents** → **Create Agent** with the **same username** as on your admin PC (e.g. `abebe`, same password)
4. Organization key is **pre-configured** on fresh install — recharge should work immediately
5. If recharge fails: **Settings** → paste organization key from admin PC → Save
6. Agent logs in as `abebe` (not `agent` demo) and changes password

> **Demo account** `agent` / `agent123` is for testing one PC only. For real shops, create a named agent on **both** admin PC and agent PC.

---

## Daily recharge (agent pays you)

```
Agent pays cash/Telebirr  →  You (admin) generate TBG code  →  SMS to agent  →  Agent redeems on their PC
```

### Admin (after payment)

1. **Recharge Codes**
2. Amount (e.g. 500 ETB)
3. Select **agent username** (must match exactly)
4. **Generate secure code** → copy `TBG-500-…`
5. Send via SMS / phone

### Agent

1. **Recharge** → paste `TBG-…` code → **Recharge**
2. Balance updates on **their PC only**

---

## Daily game (agent hall)

1. **Game Board** → select cartella numbers → set bet → **Start Game**
2. Press green **Start** → numbers 1–75 call automatically with voice
3. **Stop** → pause · **Resume** → continue
4. **BINGO!** → verify cartella → End game when done

---

## Send `.exe` to agents — checklist

| # | Item |
|---|------|
| 1 | `TEBIB-Bingo-Setup-1.0.0.exe` |
| 2 | `AGENTS-QUICK-GUIDE.txt` |
| 3 | Agent **username + password** (you created on admin PC) |
| 4 | Tell them: create same user on their PC if you didn’t set up the PC for them |

---

## Fix “Invalid recharge code or wrong organization key”

| Cause | Fix |
|-------|-----|
| Org key missing on agent PC | Settings → paste key from Admin → Recharge Codes |
| Code for wrong username | Admin must generate for the logged-in username |
| Typo in code | Copy-paste full `TBG-…` code |
| Admin used different org key | Use same key on all PCs (default works on fresh installs) |

---

## Quick test (one PC)

1. Login `agent` / `agent123`
2. Recharge → `VOUCHER500` (demo code, same PC only)
3. Game Board → Start Game → **Start** → hear calls

For multi-PC test: create agent `test1` on admin, generate TBG code for `test1`, create `test1` on second PC, redeem code.
