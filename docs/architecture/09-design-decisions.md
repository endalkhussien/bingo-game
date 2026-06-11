# 09 — Design Decisions (Architecture Decision Records)

## ADR-001: Electron + Next.js for Desktop

**Status:** Accepted

**Context:** Need a modern, professional UI with offline capability deployable as a Windows desktop app.

**Decision:** Use Electron as the desktop shell with Next.js 15 (App Router) as the UI framework.

**Rationale:**
- Next.js provides excellent developer experience, routing, and React ecosystem
- Electron provides native desktop features (tray, notifications, file system, print)
- Same React codebase can migrate to web deployment later
- Large community, well-documented patterns for electron-next integration

**Alternatives considered:**
- Tauri + React: Smaller binary but less mature ecosystem for complex apps
- WPF/.NET: Windows-only, no web migration path
- Pure Electron + React (no Next.js): Loses App Router benefits, more manual setup

**Consequences:**
- Two-process architecture (main + renderer) adds IPC complexity
- Next.js standalone build required for production packaging
- Slightly larger app bundle (~150-200MB)

---

## ADR-002: SQLite for Local Database

**Status:** Accepted

**Context:** All data must be stored locally with no internet dependency. Need ACID transactions for wallet operations.

**Decision:** Use SQLite via better-sqlite3 with Drizzle ORM.

**Rationale:**
- Zero configuration, embedded, single-file database
- ACID-compliant transactions critical for wallet operations
- WAL mode provides good concurrent read performance
- Drizzle provides type-safe schema and migrations
- Direct migration path to PostgreSQL (Drizzle supports both)

**Alternatives considered:**
- IndexedDB: No SQL, poor for relational data and reports
- LevelDB: Key-value only, no relational queries
- SQL.js: WebAssembly SQLite, slower than native better-sqlite3

**Consequences:**
- Single-writer limitation (acceptable for desktop single-user)
- Backup = file copy (simple and reliable)
- Future web migration requires PostgreSQL adapter

---

## ADR-003: IPC over HTTP for Renderer-Main Communication

**Status:** Accepted

**Context:** Renderer process (Next.js) needs to access database and system services in the main process.

**Decision:** Use Electron IPC (contextBridge + ipcMain/ipcRenderer) with typed channels.

**Rationale:**
- Native Electron pattern, no network overhead
- Type-safe channel definitions
- contextBridge provides security sandbox
- No HTTP server needed in production

**Alternatives considered:**
- Local HTTP API (Express/Fastify): Unnecessary network layer for same-machine communication
- tRPC over IPC: Added complexity without significant benefit
- Shared memory: Too low-level, error-prone

**Consequences:**
- Every data operation needs an IPC handler
- Cannot use Next.js API routes (not available in Electron static build)
- Future web migration swaps IPC for HTTP/tRPC (application layer unchanged)

---

## ADR-004: Separate Users and Agents Tables

**Status:** Accepted

**Context:** System has two roles (SUPER_ADMIN, AGENT). Agents have additional business fields (wallet, commission, phone).

**Decision:** `users` table for authentication identity. `agents` table with 1:1 FK to users for agent-specific data.

**Rationale:**
- Clean separation of auth concerns from business data
- Super Admin doesn't need agent fields
- Agent table can be queried independently for business operations
- Wallet balance on agent table avoids joins for frequent balance checks

**Alternatives considered:**
- Single users table with nullable agent fields: Pollutes admin records with null columns
- Agents as standalone (no user FK): Duplicates auth fields, complicates login

**Consequences:**
- Agent creation requires transaction (user + agent + initial wallet)
- Joins needed for agent list with user info (acceptable, infrequent query)

---

## ADR-005: Denormalized Wallet Balance

**Status:** Accepted

**Context:** Wallet balance is checked frequently (before game creation, dashboard display). Transaction history is append-only.

**Decision:** Store `walletBalance` on the `agents` table. Update atomically with every transaction.

**Rationale:**
- O(1) balance lookup vs O(n) sum of transactions
- Transaction record is the audit trail (source of truth for history)
- Balance field is a cache, reconcilable from transactions
- SQLite transaction ensures consistency

**Alternatives considered:**
- Computed balance (SUM of transactions): Too slow for frequent checks at scale
- Event sourcing: Over-engineered for desktop single-user app

**Consequences:**
- Must always update balance within the same transaction as inserting wallet_transaction
- Periodic reconciliation job recommended (future enhancement)

---

## ADR-006: Domain Services as Pure Functions

**Status:** Accepted

**Context:** Bingo engine, winner validation, and card generation contain complex business rules that must be testable.

**Decision:** Domain services are stateless classes with pure methods. No database access, no side effects.

**Rationale:**
- 100% unit testable without database mocks
- Business rules are explicit and centralized
- Same logic works in desktop and future web deployment
- Card validation rules enforced in one place

**Consequences:**
- Application services orchestrate domain services + repositories
- Slightly more classes, but clear responsibility boundaries

---

## ADR-007: Local Socket.IO for Real-Time Game Updates

**Status:** Accepted

**Context:** Live game page needs real-time number draw updates. Multiple windows/viewers may watch the same game.

**Decision:** Socket.IO server in Electron main process, bound to `127.0.0.1` only.

**Rationale:**
- Proven real-time protocol with room support
- Works offline (localhost only)
- Supports multiple renderer windows watching same game
- Same library works for future web deployment

**Alternatives considered:**
- IPC events only: Doesn't support multiple windows cleanly
- WebSocket raw: No room abstraction, more manual work
- React state only: No cross-window communication

**Consequences:**
- Additional dependency and server management
- Must start/stop server with app lifecycle
- Port conflict handling needed (default: 3001)

---

## ADR-008: OS-Native TTS for Voice Announcements

**Status:** Accepted

**Context:** Voice announcements must work completely offline in Amharic and English.

**Decision:** Use Windows SAPI (Speech API) via PowerShell/Node native module. Bundle espeak-ng as fallback.

**Rationale:**
- Windows SAPI includes Amharic voices on Windows 10+ with language pack
- No cloud API dependency
- Zero network latency
- Acceptable quality for number announcements

**Alternatives considered:**
- Pre-recorded audio files: 75+ numbers × 3 languages = 225+ files, inflexible
- Cloud TTS (Google, Azure): Requires internet, violates offline requirement
- Web Speech API: Limited Amharic support, inconsistent across systems

**Consequences:**
- Voice quality depends on OS language packs installed
- Need fallback chain for systems without Amharic voices
- Testing requires Windows environment

---

## ADR-009: Append-Only Wallet Transactions

**Status:** Accepted

**Context:** Financial audit trail must be tamper-evident.

**Decision:** Wallet transactions are never updated or deleted. Corrections use ADJUSTMENT type.

**Rationale:**
- Complete financial audit trail
- Balance at any point in time is reconstructible
- Industry standard for ledger systems
- Supports dispute resolution

**Consequences:**
- Table grows over time (acceptable for desktop scale)
- No transaction editing in UI
- Admin corrections create new ADJUSTMENT entries

---

## ADR-010: UUID v4 for Primary Keys

**Status:** Accepted

**Context:** Need globally unique IDs for entities, especially important for future sync/migration.

**Decision:** Use UUID v4 (text) for all primary keys.

**Rationale:**
- No auto-increment coordination needed
- Safe for offline creation (no central ID server)
- Future-proof for data sync between devices
- Drizzle supports text PKs natively

**Alternatives considered:**
- Auto-increment integers: Simpler but not offline-safe for future sync
- ULID: Sortable but less common, marginal benefit for desktop app

**Consequences:**
- Slightly larger storage and index size (negligible for desktop scale)
- IDs not human-readable (game codes serve that purpose)

---

## ADR-011: Zod Validation at Application Layer

**Status:** Accepted

**Context:** Input validation needed at UI forms and IPC boundaries.

**Decision:** Zod schemas in `src/application/validators/`. Validated in use cases before domain logic.

**Rationale:**
- Single source of truth for validation rules
- TypeScript type inference from schemas
- Works with React Hook Form on UI side
- Same schemas validate IPC input in main process

**Consequences:**
- Validation schemas separate from Drizzle schema (intentional — different concerns)
- Domain layer has its own business rule validation beyond input validation

---

## ADR-012: Unix Timestamps for All Dates

**Status:** Accepted

**Context:** Need consistent date handling across layers.

**Decision:** Store all timestamps as Unix epoch integers (seconds). Format for display in presentation layer.

**Rationale:**
- SQLite has no native date type
- Integer comparison is fast for range queries
- Timezone handling deferred to presentation layer
- Drizzle integer type is simple and portable

**Consequences:**
- Display formatting uses system settings timezone
- Date range filters convert to Unix timestamps at query boundary

---

## ADR-013: Game Code as Human-Readable Identifier

**Status:** Accepted

**Context:** Agents and players reference games by a short, memorable code (like commercial bingo systems).

**Decision:** Auto-generate game codes in format `BNG-XXXX` (e.g., `BNG-4729`). Separate from UUID primary key.

**Rationale:**
- Human-readable for verbal communication
- Unique constraint on game_code column
- Prefix configurable via system settings
- 4-digit numeric suffix = 10,000 unique codes (sufficient)

**Consequences:**
- Code generation must check uniqueness
- Codes are not sequential (random) to avoid guessing

---

## ADR-014: No Authentication Server — Offline bcrypt

**Status:** Accepted

**Context:** Authentication must work without internet.

**Decision:** bcrypt password hashing stored in SQLite. Session tokens generated locally with HMAC signing.

**Rationale:**
- Industry-standard password hashing
- No OAuth/SSO dependency
- Sessions stored in both SQLite and electron-store
- "Remember Me" extends session TTL via electron-store

**Consequences:**
- No MFA (acceptable for controlled desktop deployment)
- Password reset only by admin (no email-based reset)
- Default admin password must be changed on first login

---

## ADR-015: Monorepo Single Package Structure

**Status:** Accepted

**Context:** Electron + Next.js + shared domain code needs organized structure.

**Decision:** Single package.json monorepo with TypeScript path aliases. Not a turborepo/nx workspace.

**Rationale:**
- Simpler dependency management for a single application
- Path aliases provide clean imports across layers
- Electron and Next.js build from same codebase
- Avoid unnecessary complexity for a single deployable app

**Alternatives considered:**
- Turborepo monorepo: Over-engineered for single app
- Separate packages per layer: Complicates Electron bundling

**Consequences:**
- Single build pipeline
- All code in one repository
- tsconfig path aliases for layer separation

---

## Future Migration Strategy

### Phase 1: Desktop (Current)
```
Electron → IPC → SQLite → Local Socket.IO → OS TTS
```

### Phase 2: Hybrid (Optional)
```
Electron/Desktop + Web Dashboard (read-only reports)
Desktop: full operations
Web: admin reports via local network API
```

### Phase 3: Full Cloud
```
Web App → REST/tRPC API → PostgreSQL → Cloud Socket.IO → Cloud TTS
```

### Migration Effort by Layer

| Layer | Migration Effort | Changes Required |
|-------|-----------------|-----------------|
| Domain | None | Pure TypeScript, no changes |
| Application | Low | Use case interfaces unchanged, DI wiring changes |
| Infrastructure | High | New DB adapter, new auth adapter, new TTS adapter |
| Presentation (Desktop) | N/A | Replaced by web UI |
| Presentation (Web) | High | New Next.js deployment with API routes instead of IPC |

### Key Interfaces That Enable Migration

```typescript
// These ports remain unchanged:
IUserRepository, IAgentRepository, IWalletRepository, ...
IPasswordService, IUnitOfWork
BingoEngineService, WinnerValidatorService, CardGeneratorService

// These adapters get swapped:
DrizzleSqliteRepository → DrizzlePostgresRepository
IpcClient → ApiClient (REST/tRPC)
LocalSocketServer → CloudSocketServer
WindowsSAPI → CloudTTS or WebSpeechAPI
ElectronStore → Cookies/Redis
```

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Amharic TTS unavailable on target Windows | Medium | espeak-ng fallback, test voice on install |
| SQLite corruption on power loss | High | WAL mode, auto-backup on schedule, backup before restore |
| Large card bulk generation memory | Low | Batch generation in chunks of 100 |
| Electron app size | Low | Tree-shaking, exclude dev dependencies from build |
| Concurrent game operations | Low | Single-writer SQLite, game-level locking in service |
| Default admin password security | High | Force password change on first login, audit log |
| Wallet balance inconsistency | High | Atomic transactions, balance_after on every transaction |
