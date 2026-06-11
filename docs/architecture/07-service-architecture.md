# 07 — Service Architecture

## 1. Service Layer Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION SERVICES                       │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │   Auth   │ │  Agent   │ │  Wallet  │ │   Recharge   │  │
│  │ Service  │ │ Service  │ │ Service  │ │   Service    │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │ Pricing  │ │   Card   │ │   Game   │ │   Report     │  │
│  │ Service  │ │ Service  │ │ Service  │ │   Service    │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │Dashboard │ │ Notifi-  │ │  Audit   │ │   Backup     │  │
│  │ Service  │ │ cation   │ │ Service  │ │   Service    │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    DOMAIN SERVICES                           │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────────┐  │
│  │ Bingo Engine │ │   Winner     │ │    Revenue         │  │
│  │              │ │  Validator   │ │   Calculator       │  │
│  └──────────────┘ └──────────────┘ └────────────────────┘  │
│  ┌──────────────┐ ┌──────────────┐                          │
│  │    Card      │ │   Password   │                          │
│  │  Generator   │ │   (port)     │                          │
│  └──────────────┘ └──────────────┘                          │
├─────────────────────────────────────────────────────────────┤
│                    CROSS-CUTTING                             │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────────┐  │
│  │  RBAC Guard  │ │  Event Bus   │ │   Audit Logger     │  │
│  └──────────────┘ └──────────────┘ └────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 2. Domain Services (Pure Business Logic)

### 2.1 BingoEngineService

**Location:** `src/domain/services/bingo-engine.service.ts`

Core game engine. Stateless — receives game state, returns results.

```typescript
interface BingoEngineService {
  // Generate a random number not yet drawn
  drawNumber(
    ballType: BallType,
    alreadyDrawn: number[],
    rangeMin: number,
    rangeMax: number
  ): number;

  // Get column letter for a number (75-ball)
  getColumnLetter(number: number): 'B' | 'I' | 'N' | 'G' | 'O';

  // Check if all numbers have been drawn
  isGameComplete(ballType: BallType, drawnCount: number): boolean;

  // Get ball label (e.g., "G-42")
  formatBallLabel(number: number, ballType: BallType): string;
}
```

**Number ranges (75-ball):**
| Column | Range |
|--------|-------|
| B | 1–15 |
| I | 16–30 |
| N | 31–45 |
| G | 46–60 |
| O | 61–75 |

**Number ranges (80-ball):** 1–80 (no column restriction)

### 2.2 WinnerValidatorService

**Location:** `src/domain/services/winner-validator.service.ts`

```typescript
interface WinnerValidatorService {
  // Check if a card matches the winning pattern given drawn numbers
  validatePattern(
    cardData: CardGrid,
    drawnNumbers: number[],
    pattern: WinningPattern
  ): boolean;

  // Check all patterns and return matched ones
  checkAllPatterns(
    cardData: CardGrid,
    drawnNumbers: number[]
  ): WinningPattern[];

  // Get the cells that form the winning pattern (for UI highlight)
  getWinningCells(
    cardData: CardGrid,
    drawnNumbers: number[],
    pattern: WinningPattern
  ): { row: number; col: number }[];
}
```

**Pattern validation logic:**

| Pattern | Rule |
|---------|------|
| SINGLE_LINE | Any complete row, column, or diagonal (including free cell) |
| DOUBLE_LINE | Any two complete lines simultaneously |
| FOUR_CORNERS | All four corner cells marked |
| X_PATTERN | Both diagonals complete |
| FULL_HOUSE | All 25 cells marked (24 numbers + free) |

### 2.3 CardGeneratorService

**Location:** `src/domain/services/card-generator.service.ts`

```typescript
interface CardGeneratorService {
  // Generate a single valid card
  generateCard(ballType: BallType): CardGrid;

  // Generate N unique cards
  generateBulk(ballType: BallType, count: number): CardGrid[];

  // Validate an existing card grid
  validateCard(cardData: CardGrid, ballType: BallType): ValidationResult;
}
```

**Generation rules:**
- 5 columns × 5 rows
- Center cell (2,2) is always FREE (-1)
- Each column has numbers from its designated range
- No duplicate numbers within a card
- 5 numbers per column (4 for N column excluding free)

### 2.4 RevenueCalculatorService

**Location:** `src/domain/services/revenue-calculator.service.ts`

```typescript
interface RevenueCalculatorService {
  calculateGameRevenue(params: {
    playerCount: number;
    betAmount: number;
    commissionRate: number;
    platformFee: number;
    totalPayouts: number;
  }): GameRevenueResult;
}
```

## 3. Application Services (Use Case Orchestration)

### 3.1 AuthService

| Use Case | Input | Output | Side Effects |
|----------|-------|--------|-------------|
| Login | username, password, rememberMe | session token, user DTO | Create session, audit log |
| Logout | session token | void | Delete session, audit log |
| ChangePassword | userId, oldPassword, newPassword | void | Update hash, audit log |
| ResetPassword | adminId, agentUserId, newPassword | void | Update hash, notification, audit log |
| ValidateSession | token | user DTO or null | — |

### 3.2 AgentService

| Use Case | Input | Output | Side Effects |
|----------|-------|--------|-------------|
| CreateAgent | agent form data | agent DTO | Create user + agent, audit log |
| UpdateAgent | agentId, update data | agent DTO | Update records, audit log |
| SuspendAgent | agentId | void | Set status SUSPENDED (user + agent), notification, audit log |
| ActivateAgent | agentId | void | Set status ACTIVE, notification, audit log |
| ListAgents | filters, pagination | paginated agents | — |
| GetAgentDetail | agentId | agent DTO + stats | — |

### 3.3 WalletService

| Use Case | Input | Output | Side Effects |
|----------|-------|--------|-------------|
| GetBalance | agentId | balance | — |
| GetTransactions | agentId, filters, pagination | paginated transactions | — |
| Deposit | agentId, amount, description | transaction DTO | Transaction + balance update (atomic) |
| Withdraw | agentId, amount, description | transaction DTO | Transaction + balance update (atomic) |
| AdjustBalance | agentId, amount, description | transaction DTO | Transaction + balance update (atomic) |
| DeductGameCost | agentId, gameId, amount | transaction DTO | Check balance → deduct (atomic) |
| CreditCommission | agentId, gameId, amount | transaction DTO | Transaction + balance update (atomic) |

**Atomic transaction pattern:**
```typescript
async function executeWalletTransaction(params) {
  return unitOfWork.transaction(async (tx) => {
    const agent = await agentRepo.findByIdForUpdate(params.agentId, tx);
    const newBalance = agent.walletBalance + params.amount;

    if (newBalance < 0) throw new InsufficientBalanceError();

    const transaction = await walletRepo.create({ ...params, balanceAfter: newBalance }, tx);
    await agentRepo.updateBalance(params.agentId, newBalance, tx);

    return transaction;
  });
}
```

### 3.4 RechargeService

| Use Case | Input | Output | Side Effects |
|----------|-------|--------|-------------|
| SubmitRequest | agentId, amount, method, ref | request DTO | Create request, notification to admin |
| ApproveRequest | requestId, adminId | request DTO | Update status, wallet credit, notification, audit |
| RejectRequest | requestId, adminId, reason | request DTO | Update status, notification, audit |
| ListRequests | filters, pagination | paginated requests | — |

### 3.5 GameService

| Use Case | Input | Output | Side Effects |
|----------|-------|--------|-------------|
| CreateGame | agentId, config | game DTO | Validate balance, deduct cost, audit |
| StartGame | gameId | game DTO | Set RUNNING, socket emit, TTS, notification |
| DrawNumber | gameId | drawn number DTO | Engine draw, persist, check winners, TTS, socket emit |
| AutoDraw | gameId, intervalMs | void | Start interval timer for automatic draws |
| PauseGame | gameId | game DTO | Set PAUSED, stop auto-draw, socket emit |
| ResumeGame | gameId | game DTO | Set RUNNING, socket emit |
| EndGame | gameId | game DTO + revenue | Set COMPLETED, calculate revenue, socket emit |
| CancelGame | gameId | game DTO | Set CANCELLED, refund if applicable |
| AssignCards | gameId, cardIds[] | void | Create game_cards records |

**Game lifecycle state machine:**

```
                    ┌──────────┐
         ┌─────────│  DRAFT   │─────────┐
         │         └────┬─────┘         │
         │              │ start         │ cancel
         │              ▼               │
         │         ┌──────────┐         │
         │    ┌───│ SCHEDULED │───┐     │
         │    │   └──────────┘   │     │
         │    │ start            │     │
         │    ▼                  │     │
         │  ┌──────────┐  pause │     │
         │  │ RUNNING  │────────┤     │
         │  └────┬─────┘        │     │
         │       │ resume       │     │
         │       ▼              │     │
         │  ┌──────────┐        │     │
         │  │  PAUSED  │────────┘     │
         │  └────┬─────┘              │
         │       │ end                │
         │       ▼                    ▼
         │  ┌──────────┐       ┌───────────┐
         └──│COMPLETED │       │ CANCELLED │
            └──────────┘       └───────────┘
```

### 3.6 ReportService

| Use Case | Input | Output |
|----------|-------|--------|
| RevenueReport | dateRange, agentId? | revenue data + chart points |
| ProfitReport | dateRange, agentId? | profit data + chart points |
| RechargeReport | dateRange, status? | recharge data |
| AgentPerformance | dateRange | per-agent metrics |
| CommissionReport | dateRange | commission breakdown |
| GameHistory | dateRange, filters | game list with revenue |
| ExportReport | reportType, format, filters | file path |

### 3.7 BackupService

| Use Case | Input | Output | Side Effects |
|----------|-------|--------|-------------|
| CreateBackup | adminId | backup metadata | Copy SQLite file, audit log |
| RestoreBackup | backupId, adminId | void | Replace DB file, restart app |
| ListBackups | — | backup list | — |
| ExportDatabase | format (csv/excel) | file path | Generate export file |

## 4. Cross-Cutting Services

### 4.1 EventBus

Dispatches domain events to registered handlers.

```typescript
// Events and their handlers
GameStarted    → [NotificationHandler, SocketHandler, AuditHandler]
NumberDrawn      → [SocketHandler, TTSHandler]
WinnerDeclared   → [NotificationHandler, SocketHandler, AuditHandler]
RechargeApproved → [NotificationHandler, WalletHandler, AuditHandler]
GameCompleted    → [RevenueHandler, NotificationHandler, SocketHandler]
AgentSuspended   → [NotificationHandler, AuditHandler]
```

### 4.2 AuditService

Called by every write operation. Never throws — audit failure should not block business operations.

```typescript
async function log(params: {
  userId: string;
  action: string;        // 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', etc.
  entityType: string;    // 'agent', 'game', 'wallet_transaction', etc.
  entityId?: string;
  oldValue?: object;
  newValue?: object;
}): Promise<void>
```

### 4.3 NotificationService

```typescript
async function notify(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  referenceType?: string;
  referenceId?: string;
}): Promise<void>
// Also triggers Electron native notification if app is in background
```

## 5. IPC Service Bridge

Each application service is exposed to the renderer via IPC handlers:

```typescript
// electron/ipc/games.ipc.ts
export function registerGameIpc(gameService: GameService, rbac: RbacGuard) {
  ipcMain.handle('games:create', async (event, input) => {
    const session = await validateSession(event);
    rbac.require(session.role, Permission.GAMES_CREATE);
    return gameService.createGame(session.agentId, input);
  });

  ipcMain.handle('games:draw-number', async (event, gameId) => {
    const session = await validateSession(event);
    rbac.require(session.role, Permission.GAMES_RUN_OWN);
    await rbac.requireOwnership(session, 'game', gameId);
    return gameService.drawNumber(gameId);
  });

  // ... other handlers
}
```

## 6. Socket.IO Event Architecture

### Server → Client Events

| Event | Payload | Trigger |
|-------|---------|---------|
| `game:state` | `{ gameId, status, drawnNumbers, winners }` | Game state change |
| `game:number-drawn` | `{ gameId, number, drawOrder, label }` | Number drawn |
| `game:winner` | `{ gameId, cardId, pattern, prize }` | Winner declared |
| `game:completed` | `{ gameId, revenue }` | Game ended |
| `dashboard:update` | `{ runningGames, pendingRecharges }` | Periodic refresh |

### Client → Server Events

| Event | Payload | Action |
|-------|---------|--------|
| `game:join` | `{ gameId }` | Subscribe to game room |
| `game:leave` | `{ gameId }` | Unsubscribe from game room |

### Room Strategy

```
Socket Rooms:
  game:{gameId}     — All clients watching a specific game
  agent:{agentId}   — Agent-specific notifications
  admin             — Admin dashboard updates
```

## 7. TTS Service Architecture

```
GameService.drawNumber()
  → TTSHandler.on(NumberDrawn)
    → TTSEngine.announce(number, voiceType, language)
      → WindowsSAPI.speak(formattedText, voiceId)
```

**Voice mapping:**

| VoiceType | Windows SAPI Voice | Announcement Format |
|-----------|-------------------|-------------------|
| AMHARIC_MALE | am-ET male voice | Amharic number word |
| AMHARIC_FEMALE | am-ET female voice | Amharic number word |
| ENGLISH | en-US voice | "G forty-two" |

**Fallback chain:** Windows SAPI → espeak-ng → console log (dev only)
