# 04 — Folder Structure

## 1. Project Root Layout

```
bingo-management-platform/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Lint, type-check, unit tests
│       └── release.yml               # Windows build & release
├── docs/
│   └── architecture/                 # Architecture documentation (this folder)
├── electron/
│   ├── main.ts                       # Electron main process entry
│   ├── preload.ts                    # contextBridge IPC exposure
│   ├── tray.ts                       # System tray management
│   ├── tts/
│   │   ├── tts-engine.ts             # Text-to-speech abstraction
│   │   ├── windows-sapi.ts           # Windows SAPI implementation
│   │   └── voice-map.ts              # Voice type → OS voice mapping
│   ├── backup/
│   │   ├── backup-service.ts         # DB backup/restore orchestration
│   │   └── export-service.ts         # CSV/Excel/PDF export
│   ├── socket/
│   │   └── socket-server.ts          # Local Socket.IO server
│   ├── ipc/
│   │   ├── index.ts                  # IPC handler registration
│   │   ├── auth.ipc.ts
│   │   ├── agents.ipc.ts
│   │   ├── wallet.ipc.ts
│   │   ├── recharge.ipc.ts
│   │   ├── pricing.ipc.ts
│   │   ├── cards.ipc.ts
│   │   ├── games.ipc.ts
│   │   ├── reports.ipc.ts
│   │   ├── settings.ipc.ts
│   │   ├── backup.ipc.ts
│   │   └── notifications.ipc.ts
│   └── utils/
│       ├── paths.ts                  # App data directory paths
│       └── window.ts                 # Window creation & management
├── src/
│   ├── app/                          # Next.js App Router
│   ├── domain/                       # Domain layer (pure TypeScript)
│   ├── application/                  # Application layer (use cases)
│   ├── infrastructure/               # Infrastructure layer
│   ├── presentation/                 # Shared presentation utilities
│   └── shared/                       # Cross-cutting shared code
├── public/
│   ├── icons/                        # App icons (tray, window)
│   └── sounds/                       # Optional notification sounds
├── drizzle.config.ts
├── electron-builder.yml
├── next.config.ts
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.electron.json
└── vitest.config.ts
```

## 2. Domain Layer (`src/domain/`)

Pure business logic. Zero external dependencies.

```
src/domain/
├── entities/
│   ├── user.entity.ts
│   ├── agent.entity.ts
│   ├── wallet-transaction.entity.ts
│   ├── recharge-request.entity.ts
│   ├── pricing-plan.entity.ts
│   ├── bingo-card.entity.ts
│   ├── game.entity.ts
│   ├── winner.entity.ts
│   └── notification.entity.ts
├── value-objects/
│   ├── money.vo.ts                   # Currency amount with validation
│   ├── card-grid.vo.ts               # 5x5 bingo grid validation
│   ├── game-code.vo.ts               # Game code generation (BNG-XXXX)
│   ├── phone-number.vo.ts
│   └── username.vo.ts
├── enums/
│   └── index.ts                      # All enum constants
├── services/
│   ├── bingo-engine.service.ts       # Number drawing, pattern checking
│   ├── card-generator.service.ts     # Auto-generate valid bingo cards
│   ├── winner-validator.service.ts     # Pattern validation logic
│   ├── revenue-calculator.service.ts # Financial calculations
│   └── password.service.ts           # Hashing interface (domain port)
├── events/
│   ├── game-started.event.ts
│   ├── number-drawn.event.ts
│   ├── winner-declared.event.ts
│   ├── recharge-approved.event.ts
│   └── domain-event.ts               # Base event interface
├── errors/
│   ├── domain-error.ts               # Base domain error
│   ├── insufficient-balance.error.ts
│   ├── invalid-card.error.ts
│   ├── game-not-running.error.ts
│   ├── duplicate-number.error.ts
│   └── unauthorized.error.ts
└── repositories/                     # Repository interfaces (ports)
    ├── user.repository.ts
    ├── agent.repository.ts
    ├── wallet.repository.ts
    ├── recharge.repository.ts
    ├── pricing.repository.ts
    ├── card.repository.ts
    ├── game.repository.ts
    ├── winner.repository.ts
    ├── notification.repository.ts
    ├── audit.repository.ts
    └── settings.repository.ts
```

## 3. Application Layer (`src/application/`)

Orchestrates use cases. Depends only on Domain.

```
src/application/
├── auth/
│   ├── login.use-case.ts
│   ├── logout.use-case.ts
│   ├── change-password.use-case.ts
│   ├── reset-password.use-case.ts
│   └── validate-session.use-case.ts
├── agents/
│   ├── create-agent.use-case.ts
│   ├── update-agent.use-case.ts
│   ├── suspend-agent.use-case.ts
│   ├── activate-agent.use-case.ts
│   ├── list-agents.use-case.ts
│   └── get-agent-detail.use-case.ts
├── wallet/
│   ├── get-balance.use-case.ts
│   ├── get-transactions.use-case.ts
│   ├── deposit.use-case.ts
│   ├── withdraw.use-case.ts
│   └── adjust-balance.use-case.ts
├── recharge/
│   ├── submit-recharge.use-case.ts
│   ├── approve-recharge.use-case.ts
│   ├── reject-recharge.use-case.ts
│   └── list-recharge-requests.use-case.ts
├── pricing/
│   ├── create-pricing-plan.use-case.ts
│   ├── update-pricing-plan.use-case.ts
│   ├── disable-pricing-plan.use-case.ts
│   └── list-pricing-plans.use-case.ts
├── cards/
│   ├── create-card.use-case.ts
│   ├── update-card.use-case.ts
│   ├── delete-card.use-case.ts
│   ├── duplicate-card.use-case.ts
│   ├── generate-cards.use-case.ts
│   └── list-cards.use-case.ts
├── games/
│   ├── create-game.use-case.ts
│   ├── update-game.use-case.ts
│   ├── start-game.use-case.ts
│   ├── pause-game.use-case.ts
│   ├── resume-game.use-case.ts
│   ├── draw-number.use-case.ts
│   ├── auto-draw.use-case.ts
│   ├── end-game.use-case.ts
│   ├── cancel-game.use-case.ts
│   ├── assign-cards.use-case.ts
│   └── list-games.use-case.ts
├── winners/
│   ├── validate-winner.use-case.ts
│   └── list-winners.use-case.ts
├── reports/
│   ├── revenue-report.use-case.ts
│   ├── profit-report.use-case.ts
│   ├── recharge-report.use-case.ts
│   ├── agent-performance.use-case.ts
│   ├── commission-report.use-case.ts
│   ├── game-history.use-case.ts
│   └── export-report.use-case.ts
├── dashboard/
│   ├── admin-dashboard.use-case.ts
│   └── agent-dashboard.use-case.ts
├── notifications/
│   ├── list-notifications.use-case.ts
│   ├── mark-read.use-case.ts
│   └── create-notification.use-case.ts
├── audit/
│   └── list-audit-logs.use-case.ts
├── settings/
│   ├── get-settings.use-case.ts
│   └── update-settings.use-case.ts
├── backup/
│   ├── create-backup.use-case.ts
│   ├── restore-backup.use-case.ts
│   └── list-backups.use-case.ts
├── dto/                              # Data Transfer Objects
│   ├── auth.dto.ts
│   ├── agent.dto.ts
│   ├── wallet.dto.ts
│   ├── game.dto.ts
│   ├── report.dto.ts
│   └── common.dto.ts                 # Pagination, filters
├── validators/                       # Zod schemas for input validation
│   ├── auth.schema.ts
│   ├── agent.schema.ts
│   ├── wallet.schema.ts
│   ├── game.schema.ts
│   └── common.schema.ts
├── guards/
│   └── rbac.guard.ts                 # Role-based access check
├── mappers/
│   ├── agent.mapper.ts
│   ├── game.mapper.ts
│   └── report.mapper.ts
└── services/
    ├── audit.service.ts              # Cross-cutting audit logging
    └── event-bus.service.ts          # Domain event dispatcher
```

## 4. Infrastructure Layer (`src/infrastructure/`)

Implements domain ports. Handles all external I/O.

```
src/infrastructure/
├── database/
│   ├── connection.ts                 # SQLite connection (better-sqlite3)
│   ├── migrate.ts                    # Run migrations on startup
│   ├── schema/                       # Drizzle table definitions
│   │   ├── users.ts
│   │   ├── agents.ts
│   │   ├── sessions.ts
│   │   ├── wallet-transactions.ts
│   │   ├── recharge-requests.ts
│   │   ├── pricing-plans.ts
│   │   ├── agent-memberships.ts
│   │   ├── bingo-cards.ts
│   │   ├── games.ts
│   │   ├── game-cards.ts
│   │   ├── drawn-numbers.ts
│   │   ├── winners.ts
│   │   ├── game-revenue.ts
│   │   ├── notifications.ts
│   │   ├── audit-logs.ts
│   │   ├── system-settings.ts
│   │   ├── relations.ts              # Drizzle relations
│   │   └── index.ts
│   ├── migrations/                   # Generated SQL migrations
│   ├── repositories/                   # Repository implementations
│   │   ├── drizzle-user.repository.ts
│   │   ├── drizzle-agent.repository.ts
│   │   ├── drizzle-wallet.repository.ts
│   │   ├── drizzle-recharge.repository.ts
│   │   ├── drizzle-pricing.repository.ts
│   │   ├── drizzle-card.repository.ts
│   │   ├── drizzle-game.repository.ts
│   │   ├── drizzle-winner.repository.ts
│   │   ├── drizzle-notification.repository.ts
│   │   ├── drizzle-audit.repository.ts
│   │   └── drizzle-settings.repository.ts
│   └── unit-of-work.ts              # Transaction management
├── auth/
│   ├── bcrypt-password.service.ts    # Implements domain password port
│   └── session-manager.ts          # Token generation & validation
├── export/
│   ├── csv-exporter.ts
│   ├── excel-exporter.ts
│   └── pdf-exporter.ts
└── di/
    └── container.ts                    # Dependency injection container
```

## 5. Presentation Layer

### 5.1 Next.js App Router (`src/app/`)

```
src/app/
├── layout.tsx                        # Root layout (providers, theme)
├── page.tsx                          # Redirect to /login or /dashboard
├── globals.css
├── (auth)/
│   ├── layout.tsx                    # Centered auth layout
│   └── login/
│       └── page.tsx
├── (dashboard)/
│   ├── layout.tsx                    # Sidebar + topbar layout
│   ├── admin/
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── agents/
│   │   │   ├── page.tsx              # Agent list
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx          # Agent detail
│   │   │       └── edit/
│   │   │           └── page.tsx
│   │   ├── recharge/
│   │   │   └── page.tsx
│   │   ├── pricing/
│   │   │   └── page.tsx
│   │   ├── commissions/
│   │   │   └── page.tsx
│   │   ├── games/
│   │   │   └── page.tsx
│   │   ├── reports/
│   │   │   ├── page.tsx
│   │   │   ├── revenue/
│   │   │   │   └── page.tsx
│   │   │   ├── profit/
│   │   │   │   └── page.tsx
│   │   │   ├── recharge/
│   │   │   │   └── page.tsx
│   │   │   ├── agents/
│   │   │   │   └── page.tsx
│   │   │   ├── commission/
│   │   │   │   └── page.tsx
│   │   │   └── games/
│   │   │       └── page.tsx
│   │   ├── settings/
│   │   │   ├── page.tsx
│   │   │   ├── general/
│   │   │   │   └── page.tsx
│   │   │   ├── voice/
│   │   │   │   └── page.tsx
│   │   │   └── backup/
│   │   │       └── page.tsx
│   │   └── audit-logs/
│   │       └── page.tsx
│   └── agent/
│       ├── dashboard/
│       │   └── page.tsx
│       ├── wallet/
│       │   └── page.tsx
│       ├── recharge/
│       │   └── page.tsx
│       ├── cards/
│       │   ├── page.tsx
│       │   ├── new/
│       │   │   └── page.tsx
│       │   └── [id]/
│       │       └── page.tsx
│       ├── games/
│       │   ├── page.tsx
│       │   ├── new/
│       │   │   └── page.tsx
│       │   └── [id]/
│       │       ├── page.tsx          # Game detail / config
│       │       └── live/
│       │           └── page.tsx      # Live game control panel
│       ├── reports/
│       │   └── page.tsx
│       └── settings/
│           └── page.tsx
└── api/                              # Not used (IPC-based), reserved for future web migration
```

### 5.2 Shared Presentation (`src/presentation/`)

```
src/presentation/
├── components/
│   ├── ui/                           # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── table.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── badge.tsx
│   │   ├── tabs.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── toast.tsx
│   │   ├── skeleton.tsx
│   │   ├── sheet.tsx
│   │   ├── command.tsx
│   │   ├── calendar.tsx
│   │   ├── popover.tsx
│   │   ├── chart.tsx
│   │   └── ...
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── topbar.tsx
│   │   ├── page-header.tsx
│   │   └── breadcrumbs.tsx
│   ├── auth/
│   │   ├── login-form.tsx
│   │   └── change-password-dialog.tsx
│   ├── agents/
│   │   ├── agent-table.tsx
│   │   ├── agent-form.tsx
│   │   └── agent-status-badge.tsx
│   ├── wallet/
│   │   ├── balance-card.tsx
│   │   └── transaction-table.tsx
│   ├── cards/
│   │   ├── bingo-card-grid.tsx       # Visual 5x5 card renderer
│   │   ├── card-form.tsx
│   │   └── card-print-view.tsx
│   ├── games/
│   │   ├── game-form.tsx
│   │   ├── game-status-badge.tsx
│   │   ├── live-game-board.tsx       # Called numbers display
│   │   ├── number-ball.tsx           # Individual number ball UI
│   │   ├── draw-controls.tsx
│   │   └── winner-announcement.tsx
│   ├── reports/
│   │   ├── report-filters.tsx
│   │   ├── export-button.tsx
│   │   └── chart-widgets.tsx
│   ├── dashboard/
│   │   ├── stat-card.tsx
│   │   ├── revenue-chart.tsx
│   │   └── activity-feed.tsx
│   └── shared/
│       ├── data-table.tsx            # Reusable paginated table
│       ├── confirm-dialog.tsx
│       ├── loading-spinner.tsx
│       ├── empty-state.tsx
│       ├── error-boundary.tsx
│       ├── date-range-picker.tsx
│       └── search-input.tsx
├── hooks/
│   ├── use-auth.ts
│   ├── use-ipc.ts                    # Generic IPC invoke hook
│   ├── use-socket.ts                 # Socket.IO connection hook
│   ├── use-notifications.ts
│   ├── use-theme.ts
│   └── use-game-live.ts             # Live game state hook
├── providers/
│   ├── auth-provider.tsx
│   ├── theme-provider.tsx
│   ├── socket-provider.tsx
│   └── toast-provider.tsx
├── lib/
│   ├── ipc-client.ts                 # Typed IPC client wrapper
│   ├── socket-client.ts              # Socket.IO client wrapper
│   └── utils.ts                      # cn() and helpers
└── types/
    ├── ipc.types.ts                  # IPC channel type definitions
    └── socket.types.ts               # Socket event type definitions
```

## 6. Shared (`src/shared/`)

```
src/shared/
├── constants/
│   ├── ipc-channels.ts               # All IPC channel name constants
│   ├── socket-events.ts              # All Socket.IO event constants
│   └── app-config.ts                 # App-wide configuration
├── types/
│   ├── result.ts                     # Result<T, E> type for error handling
│   └── pagination.ts
└── utils/
    ├── date.ts
    ├── format.ts                     # Currency, number formatting
    └── id.ts                         # UUID generation
```

## 7. Layer Dependency Rules

```
┌──────────────┐
│  app/ (UI)   │ ──→ presentation/ ──→ application/ ──→ domain/
└──────────────┘                              ↑
                                              │
┌──────────────┐                              │
│ electron/    │ ──→ infrastructure/ ─────────┘
└──────────────┘

Allowed:
  ✅ presentation → application → domain
  ✅ infrastructure → domain (implements interfaces)
  ✅ electron → infrastructure, application
  ✅ app → presentation

Forbidden:
  ❌ domain → anything external
  ❌ application → infrastructure (uses interfaces from domain)
  ❌ presentation → infrastructure (goes through IPC)
  ❌ domain → presentation
```

## 8. IPC Channel Naming Convention

```
{module}:{action}

Examples:
  auth:login
  auth:logout
  agents:create
  agents:list
  wallet:get-balance
  wallet:get-transactions
  games:start
  games:draw-number
  reports:revenue
  backup:create
```

## 9. Configuration Files

| File | Purpose |
|------|---------|
| `drizzle.config.ts` | Drizzle Kit config (schema path, migration output) |
| `electron-builder.yml` | Windows packaging (NSIS installer) |
| `next.config.ts` | Next.js config (output: standalone for Electron) |
| `tailwind.config.ts` | Tailwind + shadcn theme tokens |
| `tsconfig.json` | Base TypeScript config with path aliases |
| `tsconfig.electron.json` | Electron main process TS config |
| `vitest.config.ts` | Test runner configuration |

### TypeScript Path Aliases

```json
{
  "paths": {
    "@/*": ["./src/*"],
    "@domain/*": ["./src/domain/*"],
    "@application/*": ["./src/application/*"],
    "@infrastructure/*": ["./src/infrastructure/*"],
    "@presentation/*": ["./src/presentation/*"],
    "@shared/*": ["./src/shared/*"],
    "@electron/*": ["./electron/*"]
  }
}
```
