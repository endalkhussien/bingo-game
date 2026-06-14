# Desktop Guide

## How it works

```
┌─────────────────────────────────────────┐
│  Electron Window (Minch Bingo)          │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  Next.js UI (React pages)         │  │
│  │  Login → Agent/Admin dashboards   │  │
│  └──────────────┬────────────────────┘  │
│                 │ IPC                   │
│  ┌──────────────▼────────────────────┐  │
│  │  SQLite database (offline)        │  │
│  │  Auth, games, wallet, agents...   │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## Run commands

| What you want | Command |
|---------------|---------|
| **Develop desktop app** | `npm start` |
| **Production desktop** | `npm run desktop` |
| **Browser UI only** | `npm run dev:next` |
| **Run tests** | `npm test` |
| **Quick smoke test** | `npm run test:smoke` |
| **Build Windows .exe** | `npm run dist:win` |

## Windows double-click

| File | Action |
|------|--------|
| `Start Minch Bingo.bat` | Install (if needed) + launch desktop app |
| `Run Tests.bat` | Run automated smoke tests |

## Testing

### Automated (recommended)

```bash
# Full Playwright test suite (starts dev server automatically)
npm test

# Quick 6-check smoke test
npm run test:smoke

# Interactive test UI
npm run test:ui
```

### Manual test checklist

**Agent (`agent` / `agent123`):**
1. Login → Dashboard shows wallet balance
2. Game Board → select numbers → Create Game → Draw
3. Cards → Create New Card
4. Recharge → enter `VOUCHER100`
5. Reports → see game history

**Admin (`admin` / `admin123`):**
1. Login → Dashboard shows agent stats
2. Agents → view list, create agent
3. Recharge → approve a pending request
4. Pricing → view card packs and memberships
5. Settings → Backup → Create Backup

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `better-sqlite3` error on install | Run `npm run setup` again |
| Blank window | Run `npm run build` then `npm run desktop` |
| Port 3000 in use | Kill other apps on port 3000, or set `UI_URL=http://localhost:3001` |
| Browser shows mock data | Use `npm start` for real desktop with SQLite |

## Data location

Database is stored at:
- **Windows:** `%APPDATA%/bingo-management-platform/data/bingo.db`
- **Linux:** `~/.config/bingo-management-platform/data/bingo.db`
