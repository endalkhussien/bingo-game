# Three-party model — Vendor · Shop Admin · Agent

## The three parties

| Party | Login | Code they use | Role |
|-------|-------|---------------|------|
| **1. Vendor (you)** | `vendor` | Generates **TOL** for shop admin | Distribute `.exe` + weekly/monthly TOL |
| **2. Shop admin** | `admin` | Pastes **TOL**, issues **TAS** + **TBG** | Runs the shop after TOL activation |
| **3. Agent** | custom name | Pastes **TAS** on hall PC | Runs games on hall computers |

> **TOL** = shop admin license (weekly/monthly) — from vendor only  
> **TAS** = agent hall PC activation — from shop admin only  
> **TBG** = agent wallet recharge — from shop admin only  

---

## Step-by-step workflow

### Vendor (your PC)

1. Login as **`vendor`** → opens **`/vendor`** (dark Vendor Board — not shop admin UI)
2. Enter shop name → **Weekly TOL** or **Monthly TOL**
3. Copy TOL code
4. Send shop: **installer `.exe` + TOL code + admin login** (`admin` / password they choose)

Vendor does **not** create agents or TAS codes.

### Shop admin (shop PC)

1. Install `.exe`
2. Login as **`admin`** → paste **TOL** on **Activate Shop Admin (TOL)**
3. **Agents** → create agent → copy **TAS** code + username + password
4. Send each agent their credentials + TAS
5. **Recharge Codes** → generate **TBG** when agents pay

### Agent (hall PC)

1. Install `.exe`
2. **Activate PC** → paste **TAS** from shop admin
3. **Sign in** with username + password
4. **Recharge** with **TBG** code from shop admin
5. **Game Board** → run games

---

## Default passwords (change on day 1)

| Account | Default | Who |
|---------|---------|-----|
| `vendor` | `vendor2024` | You only — never share |
| `admin` | `admin123` | Shop owner — change immediately |
| `agent` | `agent123` | Demo on one PC only |

---

## Summary

```
Vendor     →  TOL (weekly/monthly)  →  Shop admin activates
Shop admin →  TAS (one-time per hall PC)  →  Agent activates
Shop admin →  TBG (recharge)  →  Agent wallet
```
