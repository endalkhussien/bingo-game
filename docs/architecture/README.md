# Bingo Management Platform — Architecture Documentation

> **Status:** Architecture Phase (Pre-Implementation)  
> **Version:** 1.0.0  
> **Last Updated:** 2026-06-11

This directory contains the complete system architecture for the Bingo Management Platform — an offline-first, enterprise-grade desktop application built with Electron, Next.js 15, SQLite, and Drizzle ORM.

## Document Index

| # | Document | Description |
|---|----------|-------------|
| 01 | [System Overview](./01-system-overview.md) | High-level architecture, technology stack, deployment model |
| 02 | [Entity Relationship Diagram](./02-erd.md) | ERD with Mermaid diagrams and relationship definitions |
| 03 | [Database Schema](./03-database-schema.md) | Complete Drizzle-ready schema definitions |
| 04 | [Folder Structure](./04-folder-structure.md) | Project layout and clean architecture layers |
| 05 | [RBAC Permission Matrix](./05-rbac-permission-matrix.md) | Role-based access control for all features |
| 06 | [Page Map](./06-page-map.md) | Route structure, navigation, and UI layout |
| 07 | [Service Architecture](./07-service-architecture.md) | Application services, use cases, and domain logic |
| 08 | [Repository Architecture](./08-repository-architecture.md) | Data access layer, repositories, and unit of work |
| 09 | [Design Decisions](./09-design-decisions.md) | ADRs, trade-offs, and future migration strategy |

## Implementation Order (Post-Approval)

After architecture review and approval, modules will be implemented in this order:

1. Database Schema & Drizzle Models
2. Authentication & Session Management
3. RBAC Middleware
4. Agent Management
5. Wallet System
6. Recharge Management
7. Pricing Management
8. Card Management
9. Bingo Engine (Live Game)
10. Winner Validation
11. Reporting Module
12. Dashboard (Admin & Agent)
13. Notifications
14. Audit Logs
15. Backup & Restore
16. Electron Integration
17. Testing
18. Windows Packaging

## Quick Reference

```
┌─────────────────────────────────────────────────────────────┐
│                    ELECTRON MAIN PROCESS                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │ SQLite   │  │ Socket.IO│  │ TTS      │  │ Backup/    │  │
│  │ Database │  │ Server   │  │ Engine   │  │ File I/O   │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬──────┘  │
│       │             │             │               │          │
│  ┌────┴─────────────┴─────────────┴───────────────┴──────┐  │
│  │                    IPC Bridge (contextBridge)          │  │
│  └────────────────────────┬───────────────────────────────┘  │
└───────────────────────────┼──────────────────────────────────┘
                            │
┌───────────────────────────┼──────────────────────────────────┐
│                    ELECTRON RENDERER                          │
│  ┌────────────────────────┴───────────────────────────────┐  │
│  │              Next.js 15 App Router (React)              │  │
│  │  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │  │
│  │  │ Pages   │  │ Services │  │ Hooks    │  │ UI     │  │  │
│  │  │ (App)   │  │ (Client) │  │          │  │ shadcn │  │  │
│  │  └─────────┘  └──────────┘  └──────────┘  └────────┘  │  │
│  └─────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## Approval Checklist

- [ ] System overview reviewed
- [ ] ERD validated against business requirements
- [ ] Database schema approved
- [ ] Folder structure agreed upon
- [ ] RBAC matrix confirmed
- [ ] Page map confirmed
- [ ] Service architecture approved
- [ ] Repository architecture approved
- [ ] Design decisions accepted

**Architecture approval required before implementation begins.**
