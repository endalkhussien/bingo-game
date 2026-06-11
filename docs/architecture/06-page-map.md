# 06 — Page Map

## 1. Navigation Structure

### 1.1 Super Admin Sidebar

```
┌─────────────────────────────┐
│  🎯 Bingo Management        │
│─────────────────────────────│
│  📊 Dashboard               │
│  👥 Agents                  │
│  💰 Recharge Requests  (3)  │  ← badge: pending count
│  💲 Pricing Plans           │
│  📈 Commissions             │
│  🎮 Games                   │
│  📋 Reports              ▾  │
│     ├ Revenue               │
│     ├ Profit                │
│     ├ Recharge              │
│     ├ Agent Performance     │
│     ├ Commission            │
│     └ Game History          │
│  ⚙️ Settings             ▾  │
│     ├ General               │
│     ├ Voice                 │
│     └ Backup & Restore      │
│  📝 Audit Logs              │
│─────────────────────────────│
│  🔔 Notifications      (5)  │
│  🌙 Dark Mode               │
│  👤 Admin ▾                 │
│     ├ Change Password       │
│     └ Logout                │
└─────────────────────────────┘
```

### 1.2 Agent Sidebar

```
┌─────────────────────────────┐
│  🎯 Bingo Management        │
│─────────────────────────────│
│  📊 Dashboard               │
│  💳 Wallet                  │
│  🔄 Recharge                │
│  🃏 Cards                   │
│  🎮 Games                   │
│  📋 Reports                 │
│  ⚙️ Settings                │
│─────────────────────────────│
│  🔔 Notifications      (2)  │
│  🌙 Dark Mode               │
│  👤 Agent Name ▾            │
│     ├ Change Password       │
│     └ Logout                │
└─────────────────────────────┘
```

## 2. Complete Route Map

### 2.1 Public Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Redirect | → `/login` or role-based dashboard |
| `/login` | Login Page | Username/password form with Remember Me |

### 2.2 Super Admin Routes

| Route | Page | Key Components | Actions |
|-------|------|---------------|---------|
| `/admin/dashboard` | Admin Dashboard | Stat cards, revenue chart, agent growth chart, profit trend, pending recharges, running games | View summaries |
| `/admin/agents` | Agent List | Data table with search, filters (status), pagination | Create, view, suspend, activate |
| `/admin/agents/new` | Create Agent | Agent form (name, username, phone, commission rate, password) | Submit |
| `/admin/agents/[id]` | Agent Detail | Profile card, wallet balance, profit stats, recent games, transaction history | Edit, suspend, reset password |
| `/admin/agents/[id]/edit` | Edit Agent | Pre-filled agent form | Update |
| `/admin/recharge` | Recharge Requests | Tabbed: Pending / Approved / Rejected. Table with agent, amount, method, date | Approve, reject |
| `/admin/pricing` | Pricing Plans | Two sections: Card Packs + Memberships. Table with name, price, limits | Create, edit, disable |
| `/admin/commissions` | Commission Settings | Form: commission %, platform fee, min/max bet. Example calculator | Save settings |
| `/admin/games` | All Games | Table: game code, agent, name, status, bet, players, date. Filters by status, agent, date | View detail |
| `/admin/reports` | Reports Hub | Card grid linking to individual reports | Navigate |
| `/admin/reports/revenue` | Revenue Report | Date range filter, agent filter, revenue chart, data table | Export Excel/CSV/PDF |
| `/admin/reports/profit` | Profit Report | Date range, profit chart, breakdown table | Export |
| `/admin/reports/recharge` | Recharge Report | Date range, status filter, totals | Export |
| `/admin/reports/agents` | Agent Performance | Agent comparison table, performance chart | Export |
| `/admin/reports/commission` | Commission Report | Commission breakdown by agent, period | Export |
| `/admin/reports/games` | Game History | Full game log with filters | Export |
| `/admin/settings` | Settings Hub | Links to sub-settings | Navigate |
| `/admin/settings/general` | General Settings | Currency, timezone, bet limits | Save |
| `/admin/settings/voice` | Voice Settings | Default voice, language, test button | Save, test TTS |
| `/admin/settings/backup` | Backup & Restore | Backup list, create backup, restore, import/export | Create, restore, export |
| `/admin/audit-logs` | Audit Logs | Searchable table: user, action, entity, timestamp. Filters by user, action, date | Export |

### 2.3 Agent Routes

| Route | Page | Key Components | Actions |
|-------|------|---------------|---------|
| `/agent/dashboard` | Agent Dashboard | Wallet balance card, active games, total games, revenue, profit, recent transactions, daily revenue chart, game activity chart | View summaries |
| `/agent/wallet` | Wallet | Balance card, transaction history table with type filters | View history |
| `/agent/recharge` | Recharge | Submit form (amount, payment method, reference). Request history table | Submit request |
| `/agent/cards` | Card List | Card grid/table with card number, preview. Search, pagination | Create, edit, delete, duplicate, print, bulk generate |
| `/agent/cards/new` | Create Card | Card editor (5x5 grid), auto-generate button, ball type selector | Save, generate |
| `/agent/cards/[id]` | Card Detail | Full card view, edit form, print preview | Edit, duplicate, delete, print |
| `/agent/games` | Game List | Table: game code, name, status, bet, players, date. Status filters | Create, view, run |
| `/agent/games/new` | Create Game | Game config form: name, bet, pattern, speed, voice, language, ball type, max players. Card assignment | Save as draft, start |
| `/agent/games/[id]` | Game Detail | Game info, assigned cards, status, winners (if completed), revenue summary | Edit (draft), start, cancel |
| `/agent/games/[id]/live` | Live Game | **Full-screen game control panel** (see §3) | Draw, pause, resume, end, validate winner |
| `/agent/reports` | Agent Reports | Tabs: Games Played, Games Won, Wallet History, Revenue Summary, Daily Profit. Date range filter | Export |
| `/agent/settings` | Agent Settings | Change password, theme toggle | Save |

## 3. Live Game Page Layout

The live game page (`/agent/games/[id]/live`) is the most critical UI. Full-screen layout:

```
┌──────────────────────────────────────────────────────────────────┐
│  TOP BAR: Game Code · Game Name · Status Badge · Timer           │
│  [Pause] [Resume] [End Game]                        [Exit Live]  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────┐  ┌─────────────────────────────┐  │
│  │   CURRENT NUMBER         │  │   CALLED NUMBERS BOARD      │  │
│  │                          │  │                             │  │
│  │        ┌──────┐          │  │  B: 3  7  12 14             │  │
│  │        │  42  │          │  │  I: 18 22 25 29             │  │
│  │        │  G   │          │  │  N: 32 38 41                │  │
│  │        └──────┘          │  │  G: 47 49 51 55 58          │  │
│  │                          │  │  O: 62 65 68 71 74            │  │
│  │   Draw #15 of 75         │  │                             │  │
│  │                          │  │  Total Called: 15/75        │  │
│  └─────────────────────────┘  └─────────────────────────────┘  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  CONTROLS                                                   │  │
│  │  [🎱 Draw Next]  [⏩ Auto Draw: OFF]  [✋ Manual Entry]     │  │
│  │  Speed: [5s] [3s] [1s]                                      │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  WINNER VALIDATION                                          │  │
│  │  Card #: [________]  [Validate]                             │  │
│  │  ┌─────────────────────────────────────────────────────┐    │  │
│  │  │ Winner: Card #1042 · Pattern: Single Line · 800 ETB│    │  │
│  │  └─────────────────────────────────────────────────────┘    │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  PLAYERS (42)                              [View All Cards] │  │
│  │  Card #1001 · Card #1002 · Card #1003 · ...                 │  │
│  └─────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

## 4. Page Wireframe Patterns

### 4.1 List Page Pattern

Used for: Agents, Cards, Games, Recharge, Audit Logs

```
┌─────────────────────────────────────────────────┐
│  Page Title                    [+ Create New]   │
│─────────────────────────────────────────────────│
│  [🔍 Search...]  [Filter ▾]  [Date Range]      │
│─────────────────────────────────────────────────│
│  ┌───────────────────────────────────────────┐  │
│  │  Data Table                               │  │
│  │  Column 1 │ Column 2 │ Column 3 │ Actions│  │
│  │  ─────────┼──────────┼──────────┼────────│  │
│  │  Row 1    │ ...      │ ...      │ ⋮ menu │  │
│  │  Row 2    │ ...      │ ...      │ ⋮ menu │  │
│  └───────────────────────────────────────────┘  │
│  Showing 1-10 of 45        [< 1 2 3 4 5 >]   │
└─────────────────────────────────────────────────┘
```

### 4.2 Dashboard Pattern

```
┌─────────────────────────────────────────────────┐
│  Dashboard                                       │
│─────────────────────────────────────────────────│
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │
│  │ Stat 1 │ │ Stat 2 │ │ Stat 3 │ │ Stat 4 │   │
│  │  125   │ │  45    │ │ 12,500 │ │  3     │   │
│  │ Agents │ │ Active │ │ Revenue│ │ Pending│   │
│  └────────┘ └────────┘ └────────┘ └────────┘   │
│─────────────────────────────────────────────────│
│  ┌─────────────────────┐ ┌──────────────────┐   │
│  │  Revenue Trend      │ │  Recent Activity │   │
│  │  📈 Chart           │ │  • Game started  │   │
│  │                     │ │  • Recharge app. │   │
│  └─────────────────────┘ └──────────────────┘   │
└─────────────────────────────────────────────────┘
```

### 4.3 Form Page Pattern

```
┌─────────────────────────────────────────────────┐
│  ← Back    Create Agent                          │
│─────────────────────────────────────────────────│
│  ┌───────────────────────────────────────────┐  │
│  │  Full Name *        [________________]    │  │
│  │  Username *         [________________]    │  │
│  │  Phone              [________________]    │  │
│  │  Commission Rate *  [____] %              │  │
│  │  Password *         [________________]    │  │
│  │                                           │  │
│  │              [Cancel]  [Create Agent]     │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## 5. UI State Management

| State | Handling |
|-------|----------|
| Loading | Skeleton components via shadcn/ui |
| Empty | Empty state component with illustration + CTA |
| Error | Toast notifications + inline error messages |
| Success | Toast notifications |
| Confirmation | Alert dialog before destructive actions |
| Form validation | React Hook Form + Zod, inline field errors |
| Pagination | Server-side via IPC (offset + limit) |
| Search | Debounced IPC query (300ms) |
| Filters | URL search params for shareable state |
| Theme | next-themes provider, persisted in electron-store |
| Real-time | Socket.IO events update local React state |

## 6. Responsive Breakpoints

Designed primarily for desktop (1280px+). Minimum supported width: 1024px.

| Breakpoint | Layout |
|-----------|--------|
| ≥ 1280px | Full sidebar + content |
| 1024–1279px | Collapsible sidebar + content |
| < 1024px | Not supported (desktop app) |

## 7. Print Views

| View | Trigger | Content |
|------|---------|---------|
| Bingo Card Print | Print button on card detail | Single card, formatted for paper |
| Bulk Card Print | Print selected cards | Multiple cards per page |
| Report Print | Export → PDF | Formatted report with headers/footers |
| Game Summary Print | Print on completed game | Game results, winners, revenue |
