# 03 — Database Schema

Complete Drizzle ORM schema definitions. All timestamps are Unix epoch (integer). All IDs are UUID v4 (text).

## 1. Schema Overview

```
bingo.db (SQLite)
├── users
├── agents
├── sessions
├── wallet_transactions
├── recharge_requests
├── pricing_plans
├── agent_memberships
├── bingo_cards
├── games
├── game_cards
├── drawn_numbers
├── winners
├── game_revenue
├── notifications
├── audit_logs
└── system_settings
```

## 2. Drizzle Schema Definitions

### 2.1 Enums (SQLite stored as TEXT with Zod validation)

```typescript
// src/domain/enums/index.ts

export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  AGENT: 'AGENT',
} as const;

export const UserStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const;

export const TransactionType = {
  DEPOSIT: 'DEPOSIT',
  WITHDRAWAL: 'WITHDRAWAL',
  RECHARGE: 'RECHARGE',
  GAME_COST: 'GAME_COST',
  COMMISSION: 'COMMISSION',
  BONUS: 'BONUS',
  ADJUSTMENT: 'ADJUSTMENT',
} as const;

export const RechargeStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export const PlanType = {
  CARD_PACK: 'CARD_PACK',
  MEMBERSHIP: 'MEMBERSHIP',
} as const;

export const GameStatus = {
  DRAFT: 'DRAFT',
  SCHEDULED: 'SCHEDULED',
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export const WinningPattern = {
  SINGLE_LINE: 'SINGLE_LINE',
  DOUBLE_LINE: 'DOUBLE_LINE',
  FOUR_CORNERS: 'FOUR_CORNERS',
  X_PATTERN: 'X_PATTERN',
  FULL_HOUSE: 'FULL_HOUSE',
} as const;

export const BallType = {
  BALL_75: 'BALL_75',
  BALL_80: 'BALL_80',
} as const;

export const VoiceType = {
  AMHARIC_MALE: 'AMHARIC_MALE',
  AMHARIC_FEMALE: 'AMHARIC_FEMALE',
  ENGLISH: 'ENGLISH',
} as const;

export const NotificationType = {
  RECHARGE_APPROVED: 'RECHARGE_APPROVED',
  RECHARGE_REJECTED: 'RECHARGE_REJECTED',
  GAME_STARTED: 'GAME_STARTED',
  GAME_COMPLETED: 'GAME_COMPLETED',
  WINNER_DECLARED: 'WINNER_DECLARED',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  LOW_BALANCE: 'LOW_BALANCE',
  SYSTEM: 'SYSTEM',
} as const;

export const MembershipStatus = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
} as const;
```

### 2.2 Table Definitions

```typescript
// src/infrastructure/database/schema/users.ts
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  fullName: text('full_name').notNull(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull(),           // UserRole
  status: text('status').notNull().default('ACTIVE'), // UserStatus
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
```

```typescript
// src/infrastructure/database/schema/agents.ts
export const agents = sqliteTable('agents', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().unique().references(() => users.id),
  phone: text('phone'),
  commissionRate: real('commission_rate').notNull().default(0),
  walletBalance: real('wallet_balance').notNull().default(0),
  status: text('status').notNull().default('ACTIVE'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [
  index('idx_agents_user_id').on(table.userId),
]);
```

```typescript
// src/infrastructure/database/schema/sessions.ts
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  tokenHash: text('token_hash').notNull(),
  expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => [
  index('idx_sessions_token').on(table.tokenHash),
  index('idx_sessions_user_expires').on(table.userId, table.expiresAt),
]);
```

```typescript
// src/infrastructure/database/schema/wallet-transactions.ts
export const walletTransactions = sqliteTable('wallet_transactions', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull().references(() => agents.id),
  amount: real('amount').notNull(),          // positive = credit, negative = debit
  transactionType: text('transaction_type').notNull(),
  referenceType: text('reference_type'),     // 'game', 'recharge_request', etc.
  referenceId: text('reference_id'),
  description: text('description').notNull(),
  balanceAfter: real('balance_after').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => [
  index('idx_wallet_agent_date').on(table.agentId, table.createdAt),
  index('idx_wallet_reference').on(table.referenceType, table.referenceId),
]);
```

```typescript
// src/infrastructure/database/schema/recharge-requests.ts
export const rechargeRequests = sqliteTable('recharge_requests', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull().references(() => agents.id),
  amount: real('amount').notNull(),
  paymentMethod: text('payment_method').notNull(),
  referenceNumber: text('reference_number'),
  status: text('status').notNull().default('PENDING'),
  reviewedBy: text('reviewed_by').references(() => users.id),
  rejectionReason: text('rejection_reason'),
  requestedAt: integer('requested_at').notNull(),
  reviewedAt: integer('reviewed_at'),
}, (table) => [
  index('idx_recharge_status').on(table.status, table.requestedAt),
  index('idx_recharge_agent').on(table.agentId),
]);
```

```typescript
// src/infrastructure/database/schema/pricing-plans.ts
export const pricingPlans = sqliteTable('pricing_plans', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  planType: text('plan_type').notNull(),     // PlanType
  price: real('price').notNull(),
  cardLimit: integer('card_limit'),            // for CARD_PACK type
  duration: text('duration'),                  // 'DAILY' | 'WEEKLY' | 'MONTHLY'
  durationDays: integer('duration_days'),    // computed days for membership
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  isPromotional: integer('is_promotional', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
```

```typescript
// src/infrastructure/database/schema/agent-memberships.ts
export const agentMemberships = sqliteTable('agent_memberships', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull().references(() => agents.id),
  pricingPlanId: text('pricing_plan_id').notNull().references(() => pricingPlans.id),
  startsAt: integer('starts_at').notNull(),
  expiresAt: integer('expires_at').notNull(),
  status: text('status').notNull().default('ACTIVE'),
  createdAt: integer('created_at').notNull(),
}, (table) => [
  index('idx_membership_agent').on(table.agentId, table.status),
]);
```

```typescript
// src/infrastructure/database/schema/bingo-cards.ts
export const bingoCards = sqliteTable('bingo_cards', {
  id: text('id').primaryKey(),
  cardNumber: text('card_number').notNull(),
  agentId: text('agent_id').notNull().references(() => agents.id),
  cardData: text('card_data').notNull(),     // JSON: 5x5 grid
  ballType: text('ball_type').notNull().default('BALL_75'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [
  index('idx_cards_agent').on(table.agentId),
  index('idx_cards_number_agent').on(table.agentId, table.cardNumber),
]);
```

**cardData JSON structure:**
```json
{
  "grid": [
    [3, 18, 32, 47, 62],
    [7, 22, 0, 51, 68],
    [12, 25, -1, 55, 71],
    [1, 29, 38, 49, 65],
    [14, 20, 41, 58, 74]
  ],
  "freeCell": { "row": 2, "col": 2 }
}
```
> `-1` represents the FREE center cell. Column ranges validated per ball type.

```typescript
// src/infrastructure/database/schema/games.ts
export const games = sqliteTable('games', {
  id: text('id').primaryKey(),
  gameCode: text('game_code').notNull().unique(),
  agentId: text('agent_id').notNull().references(() => agents.id),
  gameName: text('game_name').notNull(),
  betAmount: real('bet_amount').notNull(),
  winningPattern: text('winning_pattern').notNull(),
  drawSpeedMs: integer('draw_speed_ms').notNull().default(5000),
  voiceType: text('voice_type').notNull().default('ENGLISH'),
  language: text('language').notNull().default('en'),
  ballType: text('ball_type').notNull().default('BALL_75'),
  numberRangeMin: integer('number_range_min').notNull().default(1),
  numberRangeMax: integer('number_range_max').notNull().default(75),
  maxPlayers: integer('max_players').notNull().default(100),
  status: text('status').notNull().default('DRAFT'),
  startedAt: integer('started_at'),
  completedAt: integer('completed_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [
  index('idx_games_agent_status').on(table.agentId, table.status),
  index('idx_games_code').on(table.gameCode),
]);
```

```typescript
// src/infrastructure/database/schema/game-cards.ts
export const gameCards = sqliteTable('game_cards', {
  id: text('id').primaryKey(),
  gameId: text('game_id').notNull().references(() => games.id),
  cardId: text('card_id').notNull().references(() => bingoCards.id),
  playerName: text('player_name'),
  joinedAt: integer('joined_at').notNull(),
}, (table) => [
  index('idx_game_cards_game').on(table.gameId),
  index('idx_game_cards_unique').on(table.gameId, table.cardId),
]);
```

```typescript
// src/infrastructure/database/schema/drawn-numbers.ts
export const drawnNumbers = sqliteTable('drawn_numbers', {
  id: text('id').primaryKey(),
  gameId: text('game_id').notNull().references(() => games.id),
  number: integer('number').notNull(),
  drawOrder: integer('draw_order').notNull(),
  drawnAt: integer('drawn_at').notNull(),
}, (table) => [
  index('idx_drawn_game').on(table.gameId, table.drawOrder),
  index('idx_drawn_unique').on(table.gameId, table.number),
]);
```

```typescript
// src/infrastructure/database/schema/winners.ts
export const winners = sqliteTable('winners', {
  id: text('id').primaryKey(),
  gameId: text('game_id').notNull().references(() => games.id),
  cardId: text('card_id').notNull().references(() => bingoCards.id),
  gameCardId: text('game_card_id').notNull().references(() => gameCards.id),
  winningPattern: text('winning_pattern').notNull(),
  prizeAmount: real('prize_amount').notNull(),
  wonAt: integer('won_at').notNull(),
  isValidated: integer('is_validated', { mode: 'boolean' }).notNull().default(false),
}, (table) => [
  index('idx_winners_game').on(table.gameId),
  index('idx_winners_unique').on(table.gameId, table.cardId),
]);
```

```typescript
// src/infrastructure/database/schema/game-revenue.ts
export const gameRevenue = sqliteTable('game_revenue', {
  id: text('id').primaryKey(),
  gameId: text('game_id').notNull().unique().references(() => games.id),
  totalPlayers: integer('total_players').notNull(),
  totalBets: real('total_bets').notNull(),
  totalPayouts: real('total_payouts').notNull(),
  platformRevenue: real('platform_revenue').notNull(),
  agentRevenue: real('agent_revenue').notNull(),
  commissionRevenue: real('commission_revenue').notNull(),
  calculatedAt: integer('calculated_at').notNull(),
});
```

```typescript
// src/infrastructure/database/schema/notifications.ts
export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  referenceType: text('reference_type'),
  referenceId: text('reference_id'),
  isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
}, (table) => [
  index('idx_notifications_user').on(table.userId, table.isRead),
]);
```

```typescript
// src/infrastructure/database/schema/audit-logs.ts
export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  oldValue: text('old_value'),    // JSON
  newValue: text('new_value'),    // JSON
  ipAddress: text('ip_address').default('127.0.0.1'),
  createdAt: integer('created_at').notNull(),
}, (table) => [
  index('idx_audit_user_date').on(table.userId, table.createdAt),
  index('idx_audit_entity').on(table.entityType, table.entityId),
]);
```

```typescript
// src/infrastructure/database/schema/system-settings.ts
export const systemSettings = sqliteTable('system_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  valueType: text('value_type').notNull(),   // 'string' | 'number' | 'boolean' | 'json'
  category: text('category').notNull(),
  description: text('description'),
  updatedAt: integer('updated_at').notNull(),
  updatedBy: text('updated_by').references(() => users.id),
});
```

## 3. Default System Settings (Seed Data)

| Key | Default Value | Type | Category |
|-----|--------------|------|----------|
| `default_commission` | `20` | number | commission |
| `platform_fee` | `0` | number | commission |
| `minimum_bet` | `5` | number | betting |
| `maximum_bet` | `100` | number | betting |
| `currency` | `ETB` | string | general |
| `currency_symbol` | `ETB` | string | general |
| `timezone` | `Africa/Addis_Ababa` | string | general |
| `default_voice` | `ENGLISH` | string | voice |
| `default_language` | `en` | string | voice |
| `low_balance_threshold` | `50` | number | wallet |
| `game_code_prefix` | `BNG` | string | game |
| `auto_draw_enabled` | `false` | boolean | game |
| `winner_auto_validate` | `true` | boolean | game |
| `max_cards_per_game` | `200` | number | game |
| `backup_retention_days` | `30` | number | system |

## 4. Default Super Admin Seed

```typescript
// Seeded on first run only
{
  id: crypto.randomUUID(),
  fullName: 'System Administrator',
  username: 'admin',
  passwordHash: bcrypt('admin123', 12),  // Must change on first login
  role: 'SUPER_ADMIN',
  status: 'ACTIVE',
}
```

## 5. Migration Strategy

```
src/infrastructure/database/
├── migrations/
│   ├── 0000_initial_schema.sql
│   ├── 0001_seed_settings.sql
│   └── meta/
├── schema/          # Drizzle schema files (one per entity)
├── index.ts         # Schema barrel export
└── migrate.ts       # Migration runner
```

- Use `drizzle-kit generate` to create SQL migrations from schema changes.
- Migrations run automatically on app startup in the Electron main process.
- Schema version tracked in `__drizzle_migrations` table.

## 6. Revenue Calculation Formula

```
totalBets       = game_cards.count × game.betAmount
commissionRate  = agent.commissionRate || systemSettings.default_commission
commissionAmt   = totalBets × (commissionRate / 100)
winnerPool      = totalBets - commissionAmt - platformFee
totalPayouts    = sum(winners.prizeAmount)
platformRevenue = commissionAmt + platformFee
agentRevenue    = totalBets - totalPayouts - platformRevenue
commissionRevenue = commissionAmt
```

**Prize distribution (single winner):**
```
prizeAmount = winnerPool
```

**Prize distribution (multiple winners, same pattern):**
```
prizeAmount = winnerPool / winnerCount
```
