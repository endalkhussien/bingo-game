# 01 — System Overview

## 1. Purpose

The Bingo Management Platform is an offline-first desktop application for bingo operators and agents. It manages the full lifecycle of bingo operations: agent onboarding, wallet management, card creation, live game execution, winner validation, revenue tracking, and reporting.

The system is designed for deployment on Windows desktops in environments with unreliable or no internet connectivity.

## 2. Architecture Style

The application follows **Clean Architecture** (Hexagonal / Ports & Adapters) with four distinct layers:

```
┌─────────────────────────────────────────────────────────┐
│                  PRESENTATION LAYER                      │
│   Electron Shell · Next.js Pages · React Components      │
│   IPC Handlers · Socket.IO Client · Desktop APIs         │
├─────────────────────────────────────────────────────────┤
│                  APPLICATION LAYER                       │
│   Use Cases · Application Services · DTOs · Validators   │
│   RBAC Guards · Event Bus · Command/Query Handlers       │
├─────────────────────────────────────────────────────────┤
│                    DOMAIN LAYER                          │
│   Entities · Value Objects · Domain Services             │
│   Domain Events · Business Rules · Enums                 │
├─────────────────────────────────────────────────────────┤
│                 INFRASTRUCTURE LAYER                     │
│   Drizzle ORM · SQLite · Repositories · Socket.IO Server │
│   TTS Engine · File System · Electron Store · Backup     │
└─────────────────────────────────────────────────────────┘
```

**Dependency Rule:** Dependencies point inward. Domain has zero external dependencies. Infrastructure implements interfaces defined in Domain/Application layers.

## 3. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Desktop Shell | Electron 33+ | Native window, system tray, notifications, IPC |
| Frontend | Next.js 15 (App Router) | UI routing, SSR/SSG where applicable |
| Language | TypeScript 5.x | Type safety across all layers |
| Database | SQLite 3 | Local embedded database |
| ORM | Drizzle ORM | Type-safe schema, migrations, queries |
| Styling | Tailwind CSS 4 | Utility-first styling |
| UI Components | shadcn/ui | Accessible, composable component library |
| Forms | React Hook Form + Zod | Form state and schema validation |
| Real-time | Socket.IO | Local WebSocket for live game events |
| Settings | electron-store | Desktop preferences persistence |
| Charts | Recharts | Dashboard visualizations |
| Export | exceljs, pdfkit, csv-stringify | Report exports |
| Auth | bcryptjs | Password hashing (offline) |
| Testing | Vitest + Playwright | Unit/integration + E2E |
| Packaging | electron-builder | Windows installer (.exe / NSIS) |

## 4. Process Architecture

### 4.1 Electron Main Process

Runs in Node.js context. Owns all privileged operations:

- SQLite database connection and transactions
- Socket.IO server (bound to `127.0.0.1`)
- Text-to-Speech engine invocation
- File system operations (backup, restore, export)
- System tray and native notifications
- Auto-update hooks (future)
- Print dialog integration

### 4.2 Electron Renderer Process

Runs the Next.js application. All data access goes through IPC:

```
Renderer (React) → IPC invoke → Main Process → Service → Repository → SQLite
Renderer (React) ← IPC response ← Main Process ← Service ← Repository ← SQLite
```

### 4.3 Socket.IO (Local)

A Socket.IO server runs in the Electron main process on `localhost`. Used exclusively for:

- Live number draw broadcasts
- Game state changes (pause, resume, end)
- Winner declarations
- Real-time dashboard updates during active games

No external network traffic. Clients connect only to `127.0.0.1`.

## 5. Data Flow Patterns

### 5.1 Command Flow (Write Operations)

```
UI Form → Zod Validation → IPC Command → Application Service
  → Domain Validation → Repository → SQLite Transaction
  → Audit Log → Domain Event → Notification → Socket.IO Broadcast
  → IPC Response → UI Update
```

### 5.2 Query Flow (Read Operations)

```
UI Request → IPC Query → Application Service → Repository → SQLite
  → DTO Mapping → IPC Response → UI Render
```

### 5.3 Live Game Flow

```
Agent clicks "Draw" → IPC → GameEngineService.drawNumber()
  → Validate (no duplicates) → Persist drawn_number
  → Check winners → TTS announce → Socket.IO emit "number:drawn"
  → All connected clients update UI
```

## 6. Security Model

| Concern | Approach |
|---------|----------|
| Authentication | Username + bcrypt password hash, offline session tokens |
| Session | JWT-like signed tokens stored in electron-store (renderer) + session table (DB) |
| Authorization | RBAC middleware on every IPC channel and route |
| Password Storage | bcrypt (cost factor 12) |
| Data at Rest | SQLite file on local disk (optional SQLCipher for future) |
| IPC Security | contextBridge with whitelisted channels only |
| Audit | All privileged actions logged to audit_logs table |

## 7. Offline-First Guarantees

| Feature | Offline Strategy |
|---------|-----------------|
| Authentication | Local bcrypt verification against SQLite |
| Wallet | Local SQLite transactions with ACID guarantees |
| Game Engine | In-process random generation + local persistence |
| Voice | OS-native TTS (Windows SAPI / espeak fallback) |
| Reports | Local SQL aggregation queries |
| Backup | Local file copy + optional CSV/Excel export |
| Real-time | Localhost Socket.IO only |
| Settings | electron-store + SQLite system_settings |

## 8. Deployment Model

```
Development:
  electron . → spawns Next.js dev server → hot reload

Production:
  electron-builder packages:
    ├── Electron runtime
    ├── Next.js static/standalone build
    ├── SQLite database (created on first run)
    ├── TTS voice assets (if bundled)
    └── NSIS installer for Windows
```

**Install location:** `%LOCALAPPDATA%/BingoManagementPlatform/`  
**Database location:** `%LOCALAPPDATA%/BingoManagementPlatform/data/bingo.db`  
**Backups location:** `%LOCALAPPDATA%/BingoManagementPlatform/backups/`  
**Logs location:** `%LOCALAPPDATA%/BingoManagementPlatform/logs/`

## 9. Scalability & Future Migration Path

The clean architecture enables future migration to a web/cloud deployment:

| Desktop (Current) | Web/Cloud (Future) |
|-------------------|-------------------|
| SQLite | PostgreSQL |
| IPC channels | REST API / tRPC |
| Localhost Socket.IO | Cloud Socket.IO / WebSocket |
| electron-store | Redis / cookies |
| Local file backup | S3 / cloud storage |
| OS TTS | Server-side TTS or client Web Speech API |

**Key principle:** Domain and Application layers remain unchanged. Only Infrastructure and Presentation adapters are swapped.

## 10. Module Dependency Graph

```
                    ┌──────────────┐
                    │   Electron   │
                    │  Integration │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼─────┐ ┌───▼───┐ ┌─────▼─────┐
        │ Dashboard │ │Reports│ │  Backup   │
        └─────┬─────┘ └───┬───┘ └─────┬─────┘
              │            │            │
        ┌─────▼────────────▼────────────▼─────┐
        │         Bingo Engine + Winners       │
        └─────────────────┬───────────────────┘
                          │
        ┌─────────────────▼───────────────────┐
        │    Cards · Games · Pricing          │
        └─────────────────┬───────────────────┘
                          │
        ┌─────────────────▼───────────────────┐
        │  Wallet · Recharge · Commission     │
        └─────────────────┬───────────────────┘
                          │
        ┌─────────────────▼───────────────────┐
        │   Agents · Auth · RBAC · Audit      │
        └─────────────────┬───────────────────┘
                          │
        ┌─────────────────▼───────────────────┐
        │     Database Schema (SQLite)        │
        └─────────────────────────────────────┘
```
