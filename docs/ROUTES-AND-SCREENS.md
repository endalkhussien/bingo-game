# Routes and Screens

Every screen in the app is a Next.js page under `src/app/`.

**Layouts:** `src/app/agent/layout.tsx` and `src/app/admin/layout.tsx` provide the sidebar navigation.

---

## Public routes

| Route | File | Purpose |
|-------|------|---------|
| `/` | `src/app/page.tsx` | Redirect to login or dashboard |
| `/login` | `src/app/login/page.tsx` | Login form |

**IPC used:** `auth:login`

---

## Agent routes (`/agent/*`)

Role required: `AGENT`

| Route | File | Purpose | Main IPC channels |
|-------|------|---------|-------------------|
| `/agent/dashboard` | `agent/dashboard/page.tsx` | Wallet, stats, quick links | `dashboard:agent`, `wallet:balance` |
| `/agent/game-board` | `agent/game-board/page.tsx` | **Live game** — select numbers, create game, draw, auto-draw, end | `games:create`, `games:active`, `games:draw`, `games:end` |
| `/agent/cards` | `agent/cards/page.tsx` | Bingo card list, create, update, delete | `cards:list`, `cards:create`, `cards:update`, `cards:delete` |
| `/agent/games` | `agent/games/page.tsx` | Past games list | `games:list` |
| `/agent/wallet` | `agent/wallet/page.tsx` | Balance + transaction history | `wallet:balance`, `wallet:transactions` |
| `/agent/recharge` | `agent/recharge/page.tsx` | Submit recharge + redeem voucher | `recharge:submit`, `wallet:redeem` |
| `/agent/reports` | `agent/reports/page.tsx` | Game history with filters | `games:list` |
| `/agent/settings` | `agent/settings/page.tsx` | Change password | `auth:change-password` |
| `/agent/notifications` | `agent/notifications/page.tsx` | Notification inbox | `notifications:list`, `notifications:mark-read` |

### Agent sidebar order

Dashboard → Game Board → Cards → Games → Wallet → Recharge → Reports → Settings → Notifications

---

## Admin routes (`/admin/*`)

Role required: `SUPER_ADMIN`

| Route | File | Purpose | Main IPC channels |
|-------|------|---------|-------------------|
| `/admin/dashboard` | `admin/dashboard/page.tsx` | Platform stats, charts | `dashboard:admin` |
| `/admin/agents` | `admin/agents/page.tsx` | Agent list | `agents:list` |
| `/admin/agents/new` | `admin/agents/new/page.tsx` | Create agent | `agents:create` |
| `/admin/agents/detail` | `admin/agents/detail/page.tsx` | Agent detail (`?id=`) | `agents:detail`, `wallet:deposit`, `wallet:withdraw` |
| `/admin/recharge` | `admin/recharge/page.tsx` | Approve/reject recharges | `recharge:list`, `recharge:approve`, `recharge:reject` |
| `/admin/pricing` | `admin/pricing/page.tsx` | Pricing plans CRUD | `pricing:list`, `pricing:create`, `pricing:update` |
| `/admin/commissions` | `admin/commissions/page.tsx` | Commission & bet limits | `settings:get`, `settings:update` |
| `/admin/games` | `admin/games/page.tsx` | All games (read-only) | `games:list` |
| `/admin/reports` | `admin/reports/page.tsx` | Reports hub (links) | — |
| `/admin/reports/revenue` | `admin/reports/revenue/page.tsx` | Revenue table | `reports:revenue` |
| `/admin/reports/profit` | `admin/reports/profit/page.tsx` | Profit table | `reports:profit` |
| `/admin/reports/agents` | `admin/reports/agents/page.tsx` | Agent performance | `reports:agents` |
| `/admin/reports/recharge` | `admin/reports/recharge/page.tsx` | Recharge history | `reports:recharge` |
| `/admin/reports/games` | `admin/reports/games/page.tsx` | Game history | `reports:games` |
| `/admin/settings` | `admin/settings/page.tsx` | Settings hub | — |
| `/admin/settings/general` | `admin/settings/general/page.tsx` | Currency, timezone, bets | `settings:get`, `settings:update` |
| `/admin/settings/voice` | `admin/settings/voice/page.tsx` | Default voice/language | `settings:get`, `settings:update` |
| `/admin/settings/backup` | `admin/settings/backup/page.tsx` | Backup & restore | `backup:create`, `backup:list`, `backup:restore` |
| `/admin/audit-logs` | `admin/audit-logs/page.tsx` | Audit log table | `audit:list` |
| `/admin/notifications` | `admin/notifications/page.tsx` | Notifications | `notifications:list` |

### Admin sidebar order

Dashboard → Agents → Recharge → Pricing → Commissions → Games → Reports → Settings → Audit Logs → Notifications

---

## Key UI components

| Component | Path | Used on |
|-----------|------|---------|
| `NumberGrid` | `presentation/components/bingo/number-grid.tsx` | Game board (1–150 number picker) |
| `BingoCardView` | `presentation/components/bingo/bingo-card-view.tsx` | Cards page |
| `PageHeader` | `presentation/components/shared/page-header.tsx` | Admin pages |
| Agent layout sidebar | `agent/layout.tsx` | All agent pages |
| Admin layout sidebar | `admin/layout.tsx` | All admin pages |

---

## Route vs architecture docs

The original design (`docs/architecture/06-page-map.md`) planned routes like:

- `/agent/games/[id]/live` — separate live game page
- `/agent/cards/[id]` — card detail page

**Current implementation** uses simplified routes:

- Live game = `/agent/game-board` (all-in-one)
- Agent detail = `/admin/agents/detail?id=xxx` (query param, not dynamic route)

When adding features, follow **existing patterns** in this codebase unless explicitly refactoring.

---

## Adding a new screen

1. Create `src/app/{agent|admin}/your-page/page.tsx`
2. Add link in `layout.tsx` sidebar
3. Protect route: layouts already check auth via `AuthProvider`
4. Use `ipc()` for all data — see [IPC-REFERENCE.md](./IPC-REFERENCE.md)
5. Add mock handler in `mock-ipc.ts` for browser dev
