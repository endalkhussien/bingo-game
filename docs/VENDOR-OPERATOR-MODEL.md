# Vendor + Operator model (commission & weekly license)

How **you (vendor)** control shops while **operators** run admin themselves.

---

## Two admin accounts

| Login | Role | Who uses it |
|-------|------|-------------|
| `vendor` / `vendor2024` | **Super Admin (vendor)** | **You only** — change password on first use |
| `admin` or `operator` / `admin123` or `operator123` | **Shop operator** | Shop owner — daily admin |

> On existing databases, `vendor` is added automatically on startup if missing.

---

## Weekly / monthly license (TOL codes)

Operators need an active **TOL-** license to use admin (agents, recharge, reports).

### Your workflow (vendor)

1. Login as **`vendor`**
2. Open **Vendor Portal**
3. See **commission due this week** (from games on their PC)
4. Shop pays you that amount
5. Click **Generate weekly TOL (7 days)** or **monthly TOL (30 days)**
6. Copy **TOL-** code → send SMS/Telegram to shop

### Shop workflow (operator)

1. Login as **`admin`** or **`operator`**
2. If license expired → **Shop License** page opens
3. See **commission due this week**
4. Pay vendor → paste **TOL-** code → **Activate license**
5. Run admin normally until expiry

---

## Commission calculation

Commission due = sum of **platform revenue** from completed games in the last 7 days.

This is the **admin share** taken from agent commission each game (`adminCommissionRate` on each agent).

Example:
- 50 games this week
- 500 ETB admin cut total → shop pays you **500 ETB** → you send weekly TOL

---

## Agent hall PCs (unchanged)

| Code | Purpose |
|------|---------|
| **TAS-** | Activate agent account on hall PC |
| **TBG-** | Recharge agent wallet |

Operator generates TAS/TBG from their licensed admin PC.

---

## Handover checklist

### Give shop

- Installer `.exe`
- `AGENTS-QUICK-GUIDE.txt`
- Operator login: `admin` / password they choose (change from `admin123` on day 1)
- First **TOL** code (weekly or monthly)

### Keep secret (you only)

- `vendor` / your password
- Never share Vendor Portal access

---

## Default passwords (change immediately)

| Account | Default | Change to |
|---------|---------|-----------|
| vendor | vendor2024 | Your secret |
| admin | admin123 | Shop chooses |
| operator | operator123 | Optional alternate |

---

## Summary

```
You (vendor)  →  weekly TOL license  →  Shop operator runs admin
Shop operator →  TAS codes  →  Agent hall PCs
Shop operator →  TBG codes  →  Agent recharge
Games run  →  commission calculated  →  you invoice weekly  →  new TOL
```
