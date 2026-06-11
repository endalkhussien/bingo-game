# 05 — RBAC Permission Matrix

## 1. Roles Overview

| Role | Code | Description |
|------|------|-------------|
| Super Admin | `SUPER_ADMIN` | Full system access. Manages agents, settings, pricing, and platform operations. |
| Agent | `AGENT` | Operates bingo games, manages cards, wallet, and views own reports. |

## 2. Permission Matrix

### Legend
- ✅ Allowed
- ❌ Denied
- 🔒 Own data only
- 👁️ Read-only

### 2.1 Authentication

| Permission | SUPER_ADMIN | AGENT |
|-----------|:-----------:|:-----:|
| Login | ✅ | ✅ |
| Logout | ✅ | ✅ |
| Remember Me | ✅ | ✅ |
| Change Own Password | ✅ | ✅ |
| Reset Agent Password | ✅ | ❌ |
| View Own Session | ✅ | ✅ |

### 2.2 Agent Management

| Permission | SUPER_ADMIN | AGENT |
|-----------|:-----------:|:-----:|
| Create Agent | ✅ | ❌ |
| Edit Agent | ✅ | ❌ |
| Suspend Agent | ✅ | ❌ |
| Activate Agent | ✅ | ❌ |
| Reset Agent Password | ✅ | ❌ |
| List All Agents | ✅ | ❌ |
| View Agent Detail | ✅ | ❌ |
| View Agent Wallet | ✅ | ❌ |
| View Agent Profit | ✅ | ❌ |
| View Agent Games | ✅ | ❌ |
| View Own Profile | ✅ | 🔒 |

### 2.3 Wallet

| Permission | SUPER_ADMIN | AGENT |
|-----------|:-----------:|:-----:|
| View Any Agent Balance | ✅ | ❌ |
| View Own Balance | ✅ | 🔒 |
| Deposit to Agent Wallet | ✅ | ❌ |
| Withdraw from Agent Wallet | ✅ | ❌ |
| Adjust Agent Balance | ✅ | ❌ |
| View Any Transaction History | ✅ | ❌ |
| View Own Transaction History | ✅ | 🔒 |

### 2.4 Recharge Management

| Permission | SUPER_ADMIN | AGENT |
|-----------|:-----------:|:-----:|
| Submit Recharge Request | ❌ | ✅ |
| View Own Recharge Requests | ✅ | 🔒 |
| View All Recharge Requests | ✅ | ❌ |
| Approve Recharge Request | ✅ | ❌ |
| Reject Recharge Request | ✅ | ❌ |
| View Recharge History (all) | ✅ | ❌ |

### 2.5 Pricing Management

| Permission | SUPER_ADMIN | AGENT |
|-----------|:-----------:|:-----:|
| Create Pricing Plan | ✅ | ❌ |
| Edit Pricing Plan | ✅ | ❌ |
| Disable Pricing Plan | ✅ | ❌ |
| Create Promotional Plan | ✅ | ❌ |
| View Active Pricing Plans | ✅ | 👁️ |
| Purchase Card Pack | ❌ | ✅ |
| Purchase Membership | ❌ | ✅ |

### 2.6 Commission Management

| Permission | SUPER_ADMIN | AGENT |
|-----------|:-----------:|:-----:|
| Configure Commission % | ✅ | ❌ |
| Configure Platform Fee | ✅ | ❌ |
| Configure Min/Max Bet | ✅ | ❌ |
| Set Agent Commission Rate | ✅ | ❌ |
| View Own Commission Rate | ✅ | 👁️ |
| View Commission Report | ✅ | 👁️ |

### 2.7 Bingo Card Management

| Permission | SUPER_ADMIN | AGENT |
|-----------|:-----------:|:-----:|
| Create Card | ❌ | ✅ |
| Edit Card | ❌ | 🔒 |
| Delete Card | ❌ | 🔒 |
| Duplicate Card | ❌ | ✅ |
| Print Card | ❌ | ✅ |
| Auto Generate Cards | ❌ | ✅ |
| View Own Cards | ✅ | 🔒 |
| View All Cards | ✅ | ❌ |

### 2.8 Game Management

| Permission | SUPER_ADMIN | AGENT |
|-----------|:-----------:|:-----:|
| Create Game | ❌ | ✅ |
| Edit Game (DRAFT) | ❌ | 🔒 |
| Delete Game (DRAFT) | ❌ | 🔒 |
| Start Game | ❌ | 🔒 |
| Pause Game | ❌ | 🔒 |
| Resume Game | ❌ | 🔒 |
| Draw Number (Manual) | ❌ | 🔒 |
| Auto Draw | ❌ | 🔒 |
| End Game | ❌ | 🔒 |
| Cancel Game | ❌ | 🔒 |
| View Own Games | ✅ | 🔒 |
| View All Games | ✅ | ❌ |
| View Live Game Board | ✅ | 🔒 |

### 2.9 Winner Validation

| Permission | SUPER_ADMIN | AGENT |
|-----------|:-----------:|:-----:|
| Auto Validate Winners | System | System |
| Manual Validate Winner | ❌ | 🔒 |
| View Game Winners | ✅ | 🔒 |
| Declare Winner | ❌ | 🔒 |

### 2.10 Reports

| Permission | SUPER_ADMIN | AGENT |
|-----------|:-----------:|:-----:|
| Revenue Report (all) | ✅ | ❌ |
| Profit Report (all) | ✅ | ❌ |
| Recharge Report | ✅ | ❌ |
| Agent Performance Report | ✅ | ❌ |
| Commission Report (all) | ✅ | ❌ |
| Game History (all) | ✅ | ❌ |
| Own Games Played | ✅ | 🔒 |
| Own Games Won | ✅ | 🔒 |
| Own Wallet History | ✅ | 🔒 |
| Own Revenue Summary | ✅ | 🔒 |
| Own Daily Profit | ✅ | 🔒 |
| Export Reports (Excel/CSV/PDF) | ✅ | 🔒 |

### 2.11 Dashboard

| Permission | SUPER_ADMIN | AGENT |
|-----------|:-----------:|:-----:|
| Admin Dashboard | ✅ | ❌ |
| Agent Dashboard | ✅ | ✅ |
| View Platform Revenue | ✅ | ❌ |
| View Running Games (all) | ✅ | ❌ |
| View Own Running Games | ✅ | 🔒 |

### 2.12 Notifications

| Permission | SUPER_ADMIN | AGENT |
|-----------|:-----------:|:-----:|
| View Own Notifications | ✅ | ✅ |
| Mark as Read | ✅ | ✅ |
| Send System Notification | ✅ | ❌ |

### 2.13 Audit Logs

| Permission | SUPER_ADMIN | AGENT |
|-----------|:-----------:|:-----:|
| View Audit Logs | ✅ | ❌ |
| Export Audit Logs | ✅ | ❌ |

### 2.14 Settings

| Permission | SUPER_ADMIN | AGENT |
|-----------|:-----------:|:-----:|
| Configure System Settings | ✅ | ❌ |
| Configure Voice Settings | ✅ | ❌ |
| Configure Commission Settings | ✅ | ❌ |
| Change Own Password | ✅ | ✅ |
| Change Theme (Dark/Light) | ✅ | ✅ |

### 2.15 Backup & Restore

| Permission | SUPER_ADMIN | AGENT |
|-----------|:-----------:|:-----:|
| Create Backup | ✅ | ❌ |
| Restore Backup | ✅ | ❌ |
| Export Database | ✅ | ❌ |
| Import Database | ✅ | ❌ |
| View Backup History | ✅ | ❌ |

## 3. RBAC Implementation

### 3.1 Permission Definition

```typescript
// src/domain/enums/permissions.ts
export const Permission = {
  // Agents
  AGENTS_CREATE: 'agents:create',
  AGENTS_READ: 'agents:read',
  AGENTS_UPDATE: 'agents:update',
  AGENTS_SUSPEND: 'agents:suspend',
  AGENTS_RESET_PASSWORD: 'agents:reset-password',

  // Wallet
  WALLET_READ_OWN: 'wallet:read:own',
  WALLET_READ_ALL: 'wallet:read:all',
  WALLET_DEPOSIT: 'wallet:deposit',
  WALLET_WITHDRAW: 'wallet:withdraw',
  WALLET_ADJUST: 'wallet:adjust',

  // ... (all permissions)
} as const;
```

### 3.2 Role-Permission Mapping

```typescript
// src/application/guards/rbac.guard.ts
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    // All permissions
    ...Object.values(Permission),
  ],
  AGENT: [
    Permission.WALLET_READ_OWN,
    Permission.RECHARGE_CREATE,
    Permission.RECHARGE_READ_OWN,
    Permission.PRICING_READ,
    Permission.CARDS_CREATE,
    Permission.CARDS_READ_OWN,
    Permission.CARDS_UPDATE_OWN,
    Permission.CARDS_DELETE_OWN,
    Permission.GAMES_CREATE,
    Permission.GAMES_READ_OWN,
    Permission.GAMES_UPDATE_OWN,
    Permission.GAMES_RUN_OWN,
    Permission.WINNERS_READ_OWN,
    Permission.WINNERS_VALIDATE_OWN,
    Permission.REPORTS_READ_OWN,
    Permission.REPORTS_EXPORT_OWN,
    Permission.DASHBOARD_AGENT,
    Permission.NOTIFICATIONS_READ_OWN,
    Permission.SETTINGS_PASSWORD,
    Permission.SETTINGS_THEME,
  ],
};
```

### 3.3 Enforcement Points

RBAC is enforced at **three layers**:

```
1. IPC Layer (electron/ipc/*.ipc.ts)
   └── Every handler checks session + role before executing

2. Application Layer (use cases)
   └── RBAC guard called at start of each use case

3. UI Layer (presentation)
   └── Navigation items and action buttons hidden/disabled
       based on role (UX only — not security boundary)
```

**Security boundary:** IPC + Application layers. UI layer is for UX only.

### 3.4 Ownership Checks

For 🔒 (own data only) permissions, the system validates:

```typescript
// Example: Agent viewing a game
async function getGame(userId: string, role: UserRole, gameId: string) {
  rbacGuard.require(role, Permission.GAMES_READ_OWN);

  const game = await gameRepo.findById(gameId);
  if (!game) throw new NotFoundError('Game');

  if (role === 'AGENT') {
    const agent = await agentRepo.findByUserId(userId);
    if (game.agentId !== agent.id) {
      throw new UnauthorizedError('Cannot access another agent\'s game');
    }
  }

  return game;
}
```

## 4. Route Protection

| Route Pattern | Required Role | Required Permission |
|--------------|---------------|-------------------|
| `/login` | None (public) | — |
| `/admin/**` | SUPER_ADMIN | Auto (all admin perms) |
| `/agent/**` | AGENT | Auto (all agent perms) |
| `/agent/games/[id]/live` | AGENT | GAMES_RUN_OWN + ownership |

### Route Guard Flow

```
User navigates to /admin/agents
  → AuthProvider checks session validity
  → RoleGuard checks role === SUPER_ADMIN
  → If fail → redirect to /login
  → If pass → render page
  → Page components check specific permissions for actions
```
