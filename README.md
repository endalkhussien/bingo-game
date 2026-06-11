# Minch Bingo — Bingo Management Platform

Offline-first desktop bingo management application built with Electron, Next.js 15, SQLite, and Drizzle ORM.

## Features

- **Game Board** — 150-number grid, bet configuration, auto/manual draw, live game control
- **Bingo Cards** — Create, update, delete 5×5 bingo cards with B-I-N-G-O layout
- **Reports** — Game history, profit tracking, date/status filters
- **Recharge Balance** — Voucher-based wallet recharge
- **Agent Dashboard** — Wallet balance, commission tracking

## Tech Stack

Electron · Next.js 15 · TypeScript · SQLite · Drizzle ORM · Tailwind CSS

## Quick Start

```bash
# Install dependencies
npm install

# Development (browser UI — mock data)
npm run dev:next
# Open http://localhost:3000

# Development (full Electron app)
npm run dev

# Production build
npm run build
npm start
```

## Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| Agent | `agent` | `agent123` |
| Admin | `admin` | `admin123` |

## Demo Voucher Codes

| Code | Amount |
|------|--------|
| VOUCHER100 | 100 ETB |
| VOUCHER500 | 500 ETB |
| VOUCHER1000 | 1000 ETB |
| DEMO2024 | 250 ETB |

## Architecture

See [`docs/architecture/`](./docs/architecture/) for full system design documentation.

## Project Structure

```
electron/          # Electron main process, IPC, services
src/
  app/             # Next.js pages (agent, admin, login)
  domain/          # Business logic (bingo engine, card generator)
  infrastructure/  # Database schema, connection, seed
  presentation/    # UI components, hooks, providers
  shared/          # Constants and utilities
```
