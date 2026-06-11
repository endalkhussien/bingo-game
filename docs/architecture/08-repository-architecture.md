# 08 — Repository Architecture

## 1. Repository Pattern Overview

Repositories abstract data access behind interfaces defined in the Domain layer. Infrastructure provides Drizzle-based implementations.

```
┌──────────────────────────────────────────────┐
│           Application Layer                   │
│   Use Cases call Repository Interfaces        │
├──────────────────────────────────────────────┤
│           Domain Layer                        │
│   Repository Interfaces (Ports)               │
├──────────────────────────────────────────────┤
│           Infrastructure Layer                │
│   Drizzle Repository Implementations (Adapters)│
├──────────────────────────────────────────────┤
│           SQLite Database                     │
└──────────────────────────────────────────────┘
```

## 2. Repository Interfaces

### 2.1 IUserRepository

```typescript
// src/domain/repositories/user.repository.ts
interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  create(user: CreateUserInput): Promise<User>;
  update(id: string, data: UpdateUserInput): Promise<User>;
  updatePassword(id: string, passwordHash: string): Promise<void>;
  updateStatus(id: string, status: UserStatus): Promise<void>;
}
```

### 2.2 IAgentRepository

```typescript
interface IAgentRepository {
  findById(id: string): Promise<Agent | null>;
  findByUserId(userId: string): Promise<Agent | null>;
  create(agent: CreateAgentInput): Promise<Agent>;
  update(id: string, data: UpdateAgentInput): Promise<void>;
  updateStatus(id: string, status: UserStatus): Promise<void>;
  updateBalance(id: string, balance: number, tx?: Transaction): Promise<void>;
  findByIdForUpdate(id: string, tx: Transaction): Promise<Agent>;
  list(filters: AgentFilters, pagination: Pagination): Promise<PaginatedResult<Agent>>;
  countByStatus(status: UserStatus): Promise<number>;
  getTotalWalletBalances(): Promise<number>;
}
```

### 2.3 IWalletRepository

```typescript
interface IWalletRepository {
  create(transaction: CreateWalletTransactionInput, tx?: Transaction): Promise<WalletTransaction>;
  findByAgentId(agentId: string, filters: TransactionFilters, pagination: Pagination): Promise<PaginatedResult<WalletTransaction>>;
  getBalance(agentId: string): Promise<number>;
  sumByType(agentId: string, type: TransactionType, dateRange: DateRange): Promise<number>;
}
```

### 2.4 IRechargeRepository

```typescript
interface IRechargeRepository {
  create(request: CreateRechargeInput): Promise<RechargeRequest>;
  findById(id: string): Promise<RechargeRequest | null>;
  updateStatus(id: string, status: RechargeStatus, reviewedBy: string, reason?: string): Promise<void>;
  list(filters: RechargeFilters, pagination: Pagination): Promise<PaginatedResult<RechargeRequest>>;
  countByStatus(status: RechargeStatus): Promise<number>;
  sumByStatus(status: RechargeStatus, dateRange: DateRange): Promise<number>;
}
```

### 2.5 IPricingRepository

```typescript
interface IPricingRepository {
  create(plan: CreatePricingPlanInput): Promise<PricingPlan>;
  update(id: string, data: UpdatePricingPlanInput): Promise<void>;
  findById(id: string): Promise<PricingPlan | null>;
  list(filters: PricingFilters): Promise<PricingPlan[]>;
  setActive(id: string, isActive: boolean): Promise<void>;
}
```

### 2.6 ICardRepository

```typescript
interface ICardRepository {
  create(card: CreateCardInput): Promise<BingoCard>;
  createBulk(cards: CreateCardInput[]): Promise<BingoCard[]>;
  findById(id: string): Promise<BingoCard | null>;
  update(id: string, data: UpdateCardInput): Promise<void>;
  delete(id: string): Promise<void>;
  listByAgent(agentId: string, filters: CardFilters, pagination: Pagination): Promise<PaginatedResult<BingoCard>>;
  getNextCardNumber(agentId: string): Promise<string>;
  existsByNumber(agentId: string, cardNumber: string): Promise<boolean>;
}
```

### 2.7 IGameRepository

```typescript
interface IGameRepository {
  create(game: CreateGameInput): Promise<Game>;
  findById(id: string): Promise<Game | null>;
  findByCode(code: string): Promise<Game | null>;
  update(id: string, data: UpdateGameInput): Promise<void>;
  updateStatus(id: string, status: GameStatus, timestamps?: GameTimestamps): Promise<void>;
  list(filters: GameFilters, pagination: Pagination): Promise<PaginatedResult<Game>>;
  countByStatus(status: GameStatus, agentId?: string): Promise<number>;

  // Game Cards
  assignCards(gameId: string, cards: AssignCardInput[]): Promise<void>;
  getGameCards(gameId: string): Promise<GameCard[]>;
  countPlayers(gameId: string): Promise<number>;

  // Drawn Numbers
  addDrawnNumber(gameId: string, number: number, drawOrder: number): Promise<DrawnNumber>;
  getDrawnNumbers(gameId: string): Promise<DrawnNumber[]>;
  isNumberDrawn(gameId: string, number: number): Promise<boolean>;

  // Revenue
  saveRevenue(revenue: CreateGameRevenueInput): Promise<GameRevenue>;
  getRevenue(gameId: string): Promise<GameRevenue | null>;
}
```

### 2.8 IWinnerRepository

```typescript
interface IWinnerRepository {
  create(winner: CreateWinnerInput): Promise<Winner>;
  findByGame(gameId: string): Promise<Winner[]>;
  existsForCard(gameId: string, cardId: string): Promise<boolean>;
  countByGame(gameId: string): Promise<number>;
  countByAgent(agentId: string, dateRange?: DateRange): Promise<number>;
}
```

### 2.9 INotificationRepository

```typescript
interface INotificationRepository {
  create(notification: CreateNotificationInput): Promise<Notification>;
  findByUser(userId: string, pagination: Pagination): Promise<PaginatedResult<Notification>>;
  countUnread(userId: string): Promise<number>;
  markAsRead(id: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
}
```

### 2.10 IAuditRepository

```typescript
interface IAuditRepository {
  create(log: CreateAuditLogInput): Promise<void>;
  list(filters: AuditFilters, pagination: Pagination): Promise<PaginatedResult<AuditLog>>;
}
```

### 2.11 ISettingsRepository

```typescript
interface ISettingsRepository {
  get(key: string): Promise<string | null>;
  getAll(): Promise<Record<string, string>>;
  getByCategory(category: string): Promise<Record<string, string>>;
  set(key: string, value: string, updatedBy: string): Promise<void>;
  setBulk(settings: Record<string, string>, updatedBy: string): Promise<void>;
}
```

### 2.12 ISessionRepository

```typescript
interface ISessionRepository {
  create(session: CreateSessionInput): Promise<Session>;
  findByTokenHash(tokenHash: string): Promise<Session | null>;
  deleteById(id: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
  deleteExpired(): Promise<number>;
}
```

## 3. Unit of Work

Manages SQLite transactions across multiple repository operations.

```typescript
// src/infrastructure/database/unit-of-work.ts
interface IUnitOfWork {
  transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>;
}

class DrizzleUnitOfWork implements IUnitOfWork {
  constructor(private db: BetterSQLite3Database) {}

  async transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
    return this.db.transaction((tx) => fn(tx));
  }
}
```

**Usage in wallet operations:**
```typescript
// Approve recharge = update request + credit wallet (must be atomic)
await unitOfWork.transaction(async (tx) => {
  await rechargeRepo.updateStatus(requestId, 'APPROVED', adminId, undefined, tx);
  await walletRepo.create({
    agentId, amount, type: 'RECHARGE',
    referenceType: 'recharge_request', referenceId: requestId,
    description: 'Recharge approved', balanceAfter: newBalance,
  }, tx);
  await agentRepo.updateBalance(agentId, newBalance, tx);
});
```

## 4. Drizzle Implementation Pattern

### 4.1 Standard Repository Implementation

```typescript
// src/infrastructure/database/repositories/drizzle-agent.repository.ts
export class DrizzleAgentRepository implements IAgentRepository {
  constructor(private db: BetterSQLite3Database) {}

  async findById(id: string): Promise<Agent | null> {
    const row = await this.db
      .select()
      .from(agents)
      .where(eq(agents.id, id))
      .get();
    return row ? this.toDomain(row) : null;
  }

  async list(filters: AgentFilters, pagination: Pagination): Promise<PaginatedResult<Agent>> {
    const conditions = this.buildConditions(filters);
    const [rows, countResult] = await Promise.all([
      this.db.select().from(agents)
        .where(and(...conditions))
        .orderBy(desc(agents.createdAt))
        .limit(pagination.limit)
        .offset(pagination.offset),
      this.db.select({ count: sql<number>`count(*)` }).from(agents)
        .where(and(...conditions)),
    ]);
    return {
      data: rows.map(this.toDomain),
      total: countResult[0].count,
      page: pagination.page,
      limit: pagination.limit,
    };
  }

  private toDomain(row: typeof agents.$inferSelect): Agent {
    return {
      id: row.id,
      userId: row.userId,
      phone: row.phone,
      commissionRate: row.commissionRate,
      walletBalance: row.walletBalance,
      status: row.status as UserStatus,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
```

### 4.2 Mapper Pattern

Domain entities are never coupled to Drizzle row types. Every repository has a `toDomain()` mapper.

```
Drizzle Row → toDomain() → Domain Entity → toDTO() → DTO (for IPC response)
```

## 5. Query Patterns

### 5.1 Pagination

All list queries use offset-based pagination:

```typescript
interface Pagination {
  page: number;    // 1-based
  limit: number;   // default 20, max 100
  offset: number;  // computed: (page - 1) * limit
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### 5.2 Filtering

```typescript
interface DateRange {
  from: number;  // Unix timestamp
  to: number;
}

// Common filter pattern
interface BaseFilters {
  search?: string;
  dateRange?: DateRange;
  status?: string;
}
```

### 5.3 Report Queries

Report repositories use aggregation queries:

```typescript
// Revenue by day
async getRevenueByDay(dateRange: DateRange, agentId?: string) {
  return this.db
    .select({
      date: sql<string>`date(${gameRevenue.calculatedAt}, 'unixepoch')`,
      totalBets: sql<number>`sum(${gameRevenue.totalBets})`,
      platformRevenue: sql<number>`sum(${gameRevenue.platformRevenue})`,
      agentRevenue: sql<number>`sum(${gameRevenue.agentRevenue})`,
    })
    .from(gameRevenue)
    .innerJoin(games, eq(games.id, gameRevenue.gameId))
    .where(and(
      gte(gameRevenue.calculatedAt, dateRange.from),
      lte(gameRevenue.calculatedAt, dateRange.to),
      agentId ? eq(games.agentId, agentId) : undefined,
    ))
    .groupBy(sql`date(${gameRevenue.calculatedAt}, 'unixepoch')`)
    .orderBy(sql`date(${gameRevenue.calculatedAt}, 'unixepoch')`);
}
```

## 6. Dependency Injection Container

```typescript
// src/infrastructure/di/container.ts
class Container {
  private instances = new Map<string, unknown>();

  // Database
  get db() { return this.singleton('db', () => createDatabase()); }
  get unitOfWork() { return this.singleton('uow', () => new DrizzleUnitOfWork(this.db)); }

  // Repositories
  get userRepo() { return this.singleton('userRepo', () => new DrizzleUserRepository(this.db)); }
  get agentRepo() { return this.singleton('agentRepo', () => new DrizzleAgentRepository(this.db)); }
  get walletRepo() { return this.singleton('walletRepo', () => new DrizzleWalletRepository(this.db)); }
  // ... all repositories

  // Domain Services
  get bingoEngine() { return this.singleton('bingoEngine', () => new BingoEngineService()); }
  get winnerValidator() { return this.singleton('winnerValidator', () => new WinnerValidatorService()); }
  get cardGenerator() { return this.singleton('cardGenerator', () => new CardGeneratorService()); }
  get revenueCalculator() { return this.singleton('revenueCalculator', () => new RevenueCalculatorService()); }

  // Application Services (use cases wired with dependencies)
  get authService() { return this.singleton('authService', () => new AuthService(
    this.userRepo, this.sessionRepo, this.passwordService, this.auditService
  )); }
  // ... all services
}

export const container = new Container();
```

## 7. Error Handling Strategy

```typescript
// src/shared/types/result.ts
type Result<T, E = AppError> =
  | { success: true; data: T }
  | { success: false; error: E };

// Error hierarchy
AppError
├── DomainError (business rule violations)
│   ├── InsufficientBalanceError
│   ├── InvalidCardError
│   ├── GameNotRunningError
│   ├── DuplicateNumberError
│   └── InvalidPatternError
├── NotFoundError (entity not found)
├── UnauthorizedError (auth/permission failures)
├── ValidationError (input validation failures)
└── InfrastructureError (DB, file system failures)
```

**IPC error propagation:**
```typescript
ipcMain.handle('games:draw-number', async (event, gameId) => {
  try {
    const result = await gameService.drawNumber(gameId);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, error: { code: error.code, message: error.message } };
    }
    logger.error('Unexpected error', error);
    return { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } };
  }
});
```

## 8. Caching Strategy

| Data | Cache | TTL | Invalidation |
|------|-------|-----|-------------|
| System settings | In-memory Map | Until app restart | On settings update |
| Active sessions | In-memory Map | Session lifetime | On logout/expiry |
| Agent balance | Denormalized in DB | N/A (always from DB) | — |
| Dashboard stats | None (real-time query) | — | — |

No external cache (Redis, etc.) — SQLite is fast enough for single-user desktop operations.

## 9. Database Connection Management

```typescript
// src/infrastructure/database/connection.ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

export function createDatabase(dbPath: string) {
  const sqlite = new Database(dbPath);

  // Performance pragmas
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('busy_timeout = 5000');

  return drizzle(sqlite, { schema });
}
```

**Connection lifecycle:**
- Single connection opened in Electron main process on app start
- Shared across all IPC handlers via DI container
- Closed on app quit
- WAL mode for concurrent read during writes
