import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { eq, desc } from 'drizzle-orm';
import { getDb } from './database-service';
import { users, agents, games, gameRevenue } from '../../src/infrastructure/database/schema';
import { logAudit } from './audit-service';
import { createNotification } from './notification-service';

export async function listAgents() {
  const db = getDb();
  const allAgents = await db.select().from(agents).orderBy(desc(agents.createdAt)).all();
  const result = [];
  for (const agent of allAgents) {
    const user = await db.select().from(users).where(eq(users.id, agent.userId)).get();
    const agentGames = await db.select().from(games).where(eq(games.agentId, agent.id)).all();
    let totalProfit = 0;
    for (const g of agentGames) {
      const rev = await db.select().from(gameRevenue).where(eq(gameRevenue.gameId, g.id)).get();
      if (rev) totalProfit += rev.agentRevenue;
    }
    result.push({
      id: agent.id,
      userId: agent.userId,
      fullName: user?.fullName ?? '',
      username: user?.username ?? '',
      phone: agent.phone,
      commissionRate: agent.commissionRate,
      walletBalance: agent.walletBalance,
      status: agent.status,
      userStatus: user?.status,
      totalGames: agentGames.length,
      totalProfit,
      createdAt: agent.createdAt,
    });
  }
  return result;
}

export async function createAgent(adminId: string, data: {
  fullName: string; username: string; password: string;
  phone?: string; commissionRate: number; initialBalance?: number;
}) {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const existing = await db.select().from(users).where(eq(users.username, data.username)).get();
  if (existing) return { success: false, error: 'Username already exists' };

  const userId = uuid();
  const agentId = uuid();
  const passwordHash = await bcrypt.hash(data.password, 12);

  await db.insert(users).values({
    id: userId, fullName: data.fullName, username: data.username,
    passwordHash, role: 'AGENT', status: 'ACTIVE', createdAt: now, updatedAt: now,
  });
  await db.insert(agents).values({
    id: agentId, userId, phone: data.phone ?? null,
    commissionRate: data.commissionRate, walletBalance: data.initialBalance ?? 0,
    status: 'ACTIVE', createdAt: now, updatedAt: now,
  });

  await logAudit({ userId: adminId, action: 'CREATE', entityType: 'agent', entityId: agentId, newValue: data });
  return { success: true, data: { id: agentId, userId } };
}

export async function updateAgent(adminId: string, agentId: string, data: {
  fullName?: string; phone?: string; commissionRate?: number;
}) {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const agent = await db.select().from(agents).where(eq(agents.id, agentId)).get();
  if (!agent) return { success: false, error: 'Agent not found' };

  if (data.fullName) {
    await db.update(users).set({ fullName: data.fullName, updatedAt: now }).where(eq(users.id, agent.userId));
  }
  await db.update(agents).set({
    phone: data.phone ?? agent.phone,
    commissionRate: data.commissionRate ?? agent.commissionRate,
    updatedAt: now,
  }).where(eq(agents.id, agentId));

  await logAudit({ userId: adminId, action: 'UPDATE', entityType: 'agent', entityId: agentId, newValue: data });
  return { success: true };
}

export async function setAgentStatus(adminId: string, agentId: string, status: 'ACTIVE' | 'SUSPENDED') {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const agent = await db.select().from(agents).where(eq(agents.id, agentId)).get();
  if (!agent) return { success: false, error: 'Agent not found' };

  await db.update(agents).set({ status, updatedAt: now }).where(eq(agents.id, agentId));
  await db.update(users).set({ status, updatedAt: now }).where(eq(users.id, agent.userId));

  if (status === 'SUSPENDED') {
    await createNotification({
      userId: agent.userId, type: 'ACCOUNT_SUSPENDED',
      title: 'Account Suspended', message: 'Your account has been suspended by admin.',
    });
  }
  await logAudit({ userId: adminId, action: status, entityType: 'agent', entityId: agentId });
  return { success: true };
}

export async function resetAgentPassword(adminId: string, agentId: string, newPassword: string) {
  const db = getDb();
  const agent = await db.select().from(agents).where(eq(agents.id, agentId)).get();
  if (!agent) return { success: false, error: 'Agent not found' };
  const hash = await bcrypt.hash(newPassword, 12);
  await db.update(users).set({ passwordHash: hash, updatedAt: Math.floor(Date.now() / 1000) })
    .where(eq(users.id, agent.userId));
  await logAudit({ userId: adminId, action: 'RESET_PASSWORD', entityType: 'agent', entityId: agentId });
  return { success: true };
}

export async function getAgentDetail(agentId: string) {
  const agents = await listAgents();
  return agents.find((a) => a.id === agentId) ?? null;
}
