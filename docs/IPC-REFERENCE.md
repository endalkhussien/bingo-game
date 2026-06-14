# IPC Reference

All communication between the UI (renderer) and backend (main process) uses **IPC channels**.

**How to call from UI:**

```typescript
import { ipc } from '@/presentation/lib/ipc';
const result = await ipc('channel:name', arg1, arg2);
```

**Where channels are registered:** `electron/ipc/handlers.ts`  
**Where logic lives:** `electron/services/*.ts`  
**Browser mock:** `src/presentation/lib/mock-ipc.ts`

---

## Role guards

| Guard | Who can call |
|-------|--------------|
| *(none)* | `auth:login` only |
| `requireAuth` | Any logged-in user |
| `requireAgent` | Agent role only |
| `requireAdmin` | Super Admin only |

---

## Auth

| Channel | Guard | Arguments | Returns | Service |
|---------|-------|-----------|---------|---------|
| `auth:login` | — | `username, password, rememberMe?` | `{ success, data?: { token, user, agent }, error? }` | auth-service |
| `auth:logout` | — | — | `{ success: true }` | auth-service |
| `auth:session` | — | `token?` | `{ user, agent } \| null` | auth-service |
| `auth:change-password` | Auth | `oldPassword, newPassword` | `{ success, error? }` | auth-service |

---

## Dashboard

| Channel | Guard | Arguments | Returns | Service |
|---------|-------|-----------|---------|---------|
| `dashboard:admin` | Admin | — | Admin stats object | dashboard-service |
| `dashboard:agent` | Agent | — | Agent stats object | dashboard-service |

---

## Agents (admin)

| Channel | Guard | Arguments | Returns | Service |
|---------|-------|-----------|---------|---------|
| `agents:list` | Admin | — | Agent[] | agent-admin-service |
| `agents:create` | Admin | `{ fullName, username, phone, commissionRate, initialBalance, password }` | `{ success, data? }` | agent-admin-service |
| `agents:update` | Admin | `id, data` | `{ success }` | agent-admin-service |
| `agents:suspend` | Admin | `id` | `{ success }` | agent-admin-service |
| `agents:activate` | Admin | `id` | `{ success }` | agent-admin-service |
| `agents:reset-password` | Admin | `id, newPassword` | `{ success }` | agent-admin-service |
| `agents:detail` | Admin | `id` | Agent detail object | agent-admin-service |

---

## Wallet

| Channel | Guard | Arguments | Returns | Service |
|---------|-------|-----------|---------|---------|
| `wallet:balance` | Agent | — | `number` | wallet-service |
| `wallet:transactions` | Agent | — | Transaction[] | wallet-service |
| `wallet:redeem` | Agent | `voucherCode` | `{ success, data?: { amount, newBalance } }` | wallet-service |
| `wallet:deposit` | Admin | `agentId, amount, description` | `{ success, data }` | wallet-service |
| `wallet:withdraw` | Admin | `agentId, amount, description` | `{ success, data }` | wallet-service |

---

## Recharge

| Channel | Guard | Arguments | Returns | Service |
|---------|-------|-----------|---------|---------|
| `recharge:submit` | Agent | `{ amount, paymentMethod, referenceNumber? }` | `{ success }` | recharge-service |
| `recharge:list` | Auth | `filters?` | Request[] | recharge-service |
| `recharge:approve` | Admin | `requestId` | `{ success }` | recharge-service |
| `recharge:reject` | Admin | `requestId, reason?` | `{ success }` | recharge-service |
| `recharge:pending-count` | Admin | — | `number` | recharge-service |

---

## Pricing

| Channel | Guard | Arguments | Returns | Service |
|---------|-------|-----------|---------|---------|
| `pricing:list` | Auth | — | Plan[] | pricing-service |
| `pricing:create` | Admin | plan data | `{ success }` | pricing-service |
| `pricing:update` | Admin | `id, data` | `{ success }` | pricing-service |
| `pricing:disable` | Admin | `id` | `{ success }` | pricing-service |

---

## Cards (agent)

| Channel | Guard | Arguments | Returns | Service |
|---------|-------|-----------|---------|---------|
| `cards:list` | Agent | — | Card[] with `grid` | card-service |
| `cards:create` | Agent | `grid?` (optional 5×5) | `{ id, cardNumber, grid }` | card-service |
| `cards:update` | Agent | `id, grid` | `{ success }` | card-service |
| `cards:delete` | Agent | `id` | `{ success }` | card-service |
| `cards:generate` | Agent | `count` | Card[] | card-service |

---

## Games (agent)

| Channel | Guard | Arguments | Returns | Service |
|---------|-------|-----------|---------|---------|
| `games:create` | Agent | `{ betAmount, winningPattern, drawSpeedMs, voiceType, selectedNumbers }` | `{ success, data?, error? }` | game-service |
| `games:active` | Agent | — | Active game or null | game-service |
| `games:draw` | Agent | `gameId` | `{ success, data?: { number, drawOrder, winners } }` | game-service |
| `games:end` | Agent | `gameId` | `{ success, data?: { totalBets, agentRevenue } }` | game-service |
| `games:list` | Auth | `filters?` | Game[] (agent) or report rows (admin) | game-service / reports-service |

### `games:create` config

```typescript
{
  betAmount: number;        // min 10 ETB
  winningPattern: string;   // SINGLE_LINE | DOUBLE_LINE | FOUR_CORNERS | X_PATTERN | FULL_HOUSE
  drawSpeedMs: number;      // 1000–10000
  voiceType: string;        // AMHARIC_MALE | AMHARIC_FEMALE | ENGLISH
  selectedNumbers: number[]; // card numbers 1–150 on game board
}
```

---

## Reports

| Channel | Guard | Arguments | Returns | Service |
|---------|-------|-----------|---------|---------|
| `reports:revenue` | Admin | `filters?` | Row[] | reports-service |
| `reports:profit` | Admin | `filters?` | Row[] | reports-service |
| `reports:agents` | Admin | — | Row[] | reports-service |
| `reports:recharge` | Admin | — | Row[] | reports-service |
| `reports:games` | Admin | `filters?` | Row[] | reports-service |
| `reports:wallet` | Agent | — | Transaction[] | reports-service |

---

## Settings

| Channel | Guard | Arguments | Returns | Service |
|---------|-------|-----------|---------|---------|
| `settings:get` | Auth | — | `Record<string, string>` | settings-service |
| `settings:update` | Admin | `Record<string, string>` | settings object | settings-service |

**Common setting keys:** `default_commission`, `platform_fee`, `minimum_bet`, `maximum_bet`, `currency`, `timezone`, `default_voice`, `default_language`, `number_range_max`

---

## Backup (admin)

| Channel | Guard | Arguments | Returns | Service |
|---------|-------|-----------|---------|---------|
| `backup:create` | Admin | — | `{ success, data?: { filename } }` | backup-service |
| `backup:list` | Admin | — | Backup file[] | backup-service |
| `backup:restore` | Admin | `filename` | `{ success, message? }` | backup-service |

---

## Notifications

| Channel | Guard | Arguments | Returns | Service |
|---------|-------|-----------|---------|---------|
| `notifications:list` | Auth | — | Notification[] | notification-service |
| `notifications:unread-count` | Auth | — | `number` | notification-service |
| `notifications:mark-read` | Auth | `id` | — | notification-service |
| `notifications:mark-all-read` | Auth | — | — | notification-service |

---

## Audit (admin)

| Channel | Guard | Arguments | Returns | Service |
|---------|-------|-----------|---------|---------|
| `audit:list` | Admin | `filters?` | AuditLog[] | audit-service |

---

## Adding a new channel

1. Implement function in `electron/services/`
2. Register in `electron/ipc/handlers.ts` with correct guard
3. Add mock in `src/presentation/lib/mock-ipc.ts`
4. Document in this file
5. Call from UI via `ipc()`

**Naming convention:** `{module}:{action}` — e.g. `games:pause`, `reports:export`
