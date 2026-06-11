# Bingo Management Platform

Enterprise-grade, offline-first desktop application for bingo operators and agents. Built with Electron, Next.js 15, SQLite, and Drizzle ORM.

## Status

**Architecture Phase** — System design is complete and awaiting review before implementation begins.

## Architecture Documentation

All architecture documents are in [`docs/architecture/`](./docs/architecture/):

| Document | Description |
|----------|-------------|
| [Overview](./docs/architecture/01-system-overview.md) | High-level architecture and technology stack |
| [ERD](./docs/architecture/02-erd.md) | Entity relationship diagram |
| [Database Schema](./docs/architecture/03-database-schema.md) | Complete Drizzle-ready schema |
| [Folder Structure](./docs/architecture/04-folder-structure.md) | Project layout and clean architecture layers |
| [RBAC Matrix](./docs/architecture/05-rbac-permission-matrix.md) | Role-based access control |
| [Page Map](./docs/architecture/06-page-map.md) | Routes, navigation, and UI layouts |
| [Service Architecture](./docs/architecture/07-service-architecture.md) | Application and domain services |
| [Repository Architecture](./docs/architecture/08-repository-architecture.md) | Data access layer design |
| [Design Decisions](./docs/architecture/09-design-decisions.md) | ADRs and migration strategy |

## Tech Stack

- **Desktop:** Electron
- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Database:** SQLite + Drizzle ORM
- **Forms:** React Hook Form + Zod
- **Real-time:** Socket.IO (local)
- **Settings:** electron-store

## User Roles

- **Super Admin** — Manages agents, pricing, commissions, settings, reports, backup
- **Agent** — Manages wallet, cards, games, and views own reports

## License

Proprietary
