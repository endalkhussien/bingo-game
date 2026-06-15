# TEBIB-Bingo — Real business workflow

How to run **admin + agents on separate PCs** (offline, production).

---

## Critical: each PC has its own database

Every installed copy keeps data **locally**. Admin and agents do **not** share one database over the network.

| Works across PCs | Does NOT work across PCs |
|------------------|--------------------------|
| **TAS- setup codes** (agent account activation) | Creating agent on admin PC alone |
| **TBG- recharge codes** (after TAS activation) | Recharge requests + approve |
| Same username/password after TAS activation | Admin “deposit” on agent detail |

---

## One-time setup (operator / admin)

### 1. Your admin PC

1. Install `TEBIB-Bingo-Setup-1.0.0.exe`
2. Login **`admin`** / **`admin123`** → change password
3. **Agents** → **Create Agent** for each hall worker:
   - Username: lowercase letters/numbers (e.g. `abebe`)
   - Password, admin commission %
   - **Copy the TAS- setup code** shown after create
4. Send each agent: **username + password + TAS code**
5. **Recharge Codes** — generate TBG codes after agents pay

### 2. Each agent hall PC

1. Install the **same** `.exe` on the hall PC
2. Login screen → **Activate PC** → paste **TAS-** code from admin
3. Click **Sign in** → use username + password from admin
4. **Recharge** → paste **TBG-** code from admin

> **Do not** expect login to work before TAS activation on a new PC.
> Demo account `agent` / `agent123` is for testing one PC only.

### 3. Agents created before TAS codes existed

1. Admin → **Agents** → **Deposit** (agent detail)
2. Enter agent password → **Generate TAS setup code**
3. Send new TAS code to hall PC

---

## Daily recharge (agent pays you)

```
Agent pays cash/Telebirr  →  You generate TBG code  →  SMS to agent  →  Agent redeems
```

### Admin (after payment)

1. **Recharge Codes**
2. Amount (e.g. 500 ETB)
3. Select **agent username**
4. **Generate secure code** → copy `TBG-500-…`
5. Send via SMS / phone

### Agent

1. Must have completed **Activate PC** with TAS code first
2. **Recharge** → paste `TBG-…` code → **Recharge**
3. Balance updates on **their PC only**

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
| 3 | Agent **username + password** |
| 4 | **TAS- setup code** (from admin after create) |

---

## Fix “Invalid recharge code or wrong organization key”

| Cause | Fix |
|-------|-----|
| Hall PC never activated | Login → **Activate PC** → paste TAS code |
| Code for wrong username | Admin must generate for the logged-in username |
| Old TBG code before activation | Ask admin for a **new** TBG code after TAS activation |
| Typo in code | Copy-paste full `TBG-…` code |

---

## Fix “Invalid username or password” on hall PC

| Cause | Fix |
|-------|-----|
| Agent never activated this PC | Use **Activate PC** with TAS code first |
| Wrong password | Ask admin to reset password and send new TAS code |
| Using demo `agent` account | Use the real username admin created |

---

## Quick test (one PC)

1. Login `agent` / `agent123`
2. Recharge → `VOUCHER500` (demo code, same PC only)
3. Game Board → Start Game → **Start** → hear calls

For multi-PC test: create agent `test1` on admin → copy TAS code → on second install Activate PC → login → generate TBG for `test1` → redeem.
