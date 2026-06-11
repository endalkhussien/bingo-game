import { v4 as uuid } from 'uuid';
import { eq, desc, and } from 'drizzle-orm';
import { getDb } from './database-service';
import { rechargeRequests, agents, users, walletTransactions } from '../../src/infrastructure/database/schema';
import { logAudit } from './audit-service';
import { createNotification } from './notification-service';

export async function submitRechargeRequest(agentId: string, data: {
  amount: number; paymentMethod: string; referenceNumber?: string;
}) {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const id = uuid();
  await db.insert(rechargeRequests).values({
    id, agentId, amount: data.amount, paymentMethod: data.paymentMethod,
    referenceNumber: data.referenceNumber ?? null, status: 'PENDING', requestedAt: now,
  });

  const admins = await db.select().from(users).where(eq(users.role, 'SUPER_ADMIN')).all();
  for (const admin of admins) {
    await createNotification({
      userId: admin.id, type: 'RECHARGE_PENDING',
      title: 'New Recharge Request', message: `Agent requested ${data.amount} ETB recharge.`,
      referenceType: 'recharge_request', referenceId: id,
    });
  }
  return { success: true, data: { id } };
}

export async function listRechargeRequests(filters?: { status?: string; agentId?: string }) {
  const db = getDb();
  let rows = await db.select().from(rechargeRequests).orderBy(desc(rechargeRequests.requestedAt)).all();
  if (filters?.status && filters.status !== 'ALL') {
    rows = rows.filter((r) => r.status === filters.status);
  }
  if (filters?.agentId) rows = rows.filter((r) => r.agentId === filters.agentId);

  const result = [];
  for (const req of rows) {
    const agent = await db.select().from(agents).where(eq(agents.id, req.agentId)).get();
    const user = agent ? await db.select().from(users).where(eq(users.id, agent.userId)).get() : null;
    result.push({ ...req, agentName: user?.fullName ?? '', agentUsername: user?.username ?? '' });
  }
  return result;
}

export async function approveRecharge(adminId: string, requestId: string) {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const req = await db.select().from(rechargeRequests).where(eq(rechargeRequests.id, requestId)).get();
  if (!req || req.status !== 'PENDING') return { success: false, error: 'Request not found or already processed' };

  const agent = await db.select().from(agents).where(eq(agents.id, req.agentId)).get();
  if (!agent) return { success: false, error: 'Agent not found' };

  const newBalance = agent.walletBalance + req.amount;
  await db.update(rechargeRequests).set({ status: 'APPROVED', reviewedBy: adminId, reviewedAt: now })
    .where(eq(rechargeRequests.id, requestId));
  await db.update(agents).set({ walletBalance: newBalance, updatedAt: now }).where(eq(agents.id, req.agentId));
  await db.insert(walletTransactions).values({
    id: uuid(), agentId: req.agentId, amount: req.amount, transactionType: 'RECHARGE',
    referenceType: 'recharge_request', referenceId: requestId,
    description: `Recharge approved: ${req.amount} ETB`, balanceAfter: newBalance, createdAt: now,
  });

  const agentUser = await db.select().from(users).where(eq(users.id, agent.userId)).get();
  if (agentUser) {
    await createNotification({
      userId: agentUser.id, type: 'RECHARGE_APPROVED',
      title: 'Recharge Approved', message: `Your recharge of ${req.amount} ETB has been approved.`,
    });
  }
  await logAudit({ userId: adminId, action: 'APPROVE', entityType: 'recharge_request', entityId: requestId });
  return { success: true };
}

export async function rejectRecharge(adminId: string, requestId: string, reason?: string) {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const req = await db.select().from(rechargeRequests).where(eq(rechargeRequests.id, requestId)).get();
  if (!req || req.status !== 'PENDING') return { success: false, error: 'Request not found or already processed' };

  await db.update(rechargeRequests).set({
    status: 'REJECTED', reviewedBy: adminId, reviewedAt: now, rejectionReason: reason ?? null,
  }).where(eq(rechargeRequests.id, requestId));

  const agent = await db.select().from(agents).where(eq(agents.id, req.agentId)).get();
  if (agent) {
    const agentUser = await db.select().from(users).where(eq(users.id, agent.userId)).get();
    if (agentUser) {
      await createNotification({
        userId: agentUser.id, type: 'RECHARGE_REJECTED',
        title: 'Recharge Rejected', message: reason ?? 'Your recharge request was rejected.',
      });
    }
  }
  await logAudit({ userId: adminId, action: 'REJECT', entityType: 'recharge_request', entityId: requestId });
  return { success: true };
}

export async function countPendingRecharges() {
  const db = getDb();
  const all = await db.select().from(rechargeRequests).where(eq(rechargeRequests.status, 'PENDING')).all();
  return all.length;
}
