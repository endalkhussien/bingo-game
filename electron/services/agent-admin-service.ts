import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { eq, desc, sql } from 'drizzle-orm';
import { getDb } from './database-service';
import { users, agents, games, gameRevenue } from '../../src/infrastructure/database/schema';
import { logAudit } from './audit-service';
import { createNotification } from './notification-service';
import { generateAgentSetupCode, parseAgentSetupCode } from '../../src/shared/voucher/agent-setup-code';
import { getOrganizationVoucherSecret } from './voucher-secret-service';
import { setOrganizationVoucherSecret } from './voucher-secret-service';
import { ensureFullDeck } from './card-service';
import { normalizeUsername, isValidAgentUsername } from '../../src/shared/auth/normalize-username';

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
      adminCommissionRate: agent.adminCommissionRate,
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
  phone?: string; commissionRate?: number; adminCommissionRate: number; initialBalance?: number;
}) {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const username = normalizeUsername(data.username);
  if (!isValidAgentUsername(username)) {
    return { success: false, error: 'Username must be 2–32 characters: lowercase letters, numbers, underscore' };
  }

  const existing = await db.select().from(users)
    .where(sql`lower(${users.username}) = ${username}`)
    .get();
  if (existing) return { success: false, error: 'Username already exists' };

  const userId = uuid();
  const agentId = uuid();
  const passwordHash = await bcrypt.hash(data.password, 12);

  await db.insert(users).values({
    id: userId, fullName: data.fullName, username,
    passwordHash, role: 'AGENT', status: 'ACTIVE', createdAt: now, updatedAt: now,
  });
  await db.insert(agents).values({
    id: agentId, userId, phone: data.phone ?? null,
    commissionRate: data.commissionRate ?? 20,
    adminCommissionRate: data.adminCommissionRate,
    walletBalance: data.initialBalance ?? 0,
    status: 'ACTIVE', createdAt: now, updatedAt: now,
  });

  await logAudit({ userId: adminId, action: 'CREATE', entityType: 'agent', entityId: agentId, newValue: data });

  const orgKey = await getOrganizationVoucherSecret();
  const setup = generateAgentSetupCode({
    username,
    password: data.password,
    fullName: data.fullName,
    adminCommissionRate: data.adminCommissionRate,
    orgKey,
  });

  return {
    success: true,
    data: {
      id: agentId,
      userId,
      setupCode: setup.code,
      username: setup.username,
    },
  };
}

/** Activate agent account on a hall PC from admin setup code (no login required). */
export async function activateAgentFromSetup(setupCode: string) {
  const parsed = parseAgentSetupCode(setupCode);
  if (!parsed.valid || !parsed.payload) {
    return { success: false, error: parsed.error ?? 'Invalid setup code' };
  }

  const { username, password, fullName, adminCommissionRate, orgKey } = parsed.payload;
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  await setOrganizationVoucherSecret(orgKey);

  const existing = await db.select().from(users)
    .where(sql`lower(${users.username}) = ${username}`)
    .get();
  const passwordHash = await bcrypt.hash(password, 12);

  if (existing) {
    if (existing.role !== 'AGENT') {
      return { success: false, error: 'Username already used by a non-agent account' };
    }
    await db.update(users).set({
      fullName,
      passwordHash,
      status: 'ACTIVE',
      updatedAt: now,
    }).where(eq(users.id, existing.id));

    const agent = await db.select().from(agents).where(eq(agents.userId, existing.id)).get();
    if (agent) {
      await db.update(agents).set({
        adminCommissionRate,
        status: 'ACTIVE',
        updatedAt: now,
      }).where(eq(agents.id, agent.id));
      await ensureFullDeck(agent.id);
      return { success: true, data: { username, message: 'Agent account updated on this PC. You can log in now.' } };
    }
  }

  const userId = uuid();
  const agentId = uuid();

  await db.insert(users).values({
    id: userId,
    fullName,
    username,
    passwordHash,
    role: 'AGENT',
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(agents).values({
    id: agentId,
    userId,
    phone: null,
    commissionRate: 20,
    adminCommissionRate,
    walletBalance: 0,
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  });

  await ensureFullDeck(agentId);

  return {
    success: true,
    data: {
      username,
      message: 'Agent account activated on this PC. Log in with your username and password.',
    },
  };
}

/** Admin regenerates TAS setup code for an existing agent (e.g. hall PC not activated yet). */
export async function regenerateAgentSetupCode(adminId: string, agentId: string, password: string) {
  const db = getDb();
  const agent = await db.select().from(agents).where(eq(agents.id, agentId)).get();
  if (!agent) return { success: false, error: 'Agent not found' };

  const user = await db.select().from(users).where(eq(users.id, agent.userId)).get();
  if (!user || user.role !== 'AGENT') return { success: false, error: 'Agent not found' };

  if (!password || password.length < 4) {
    return { success: false, error: 'Enter the agent password (or a new password to set)' };
  }

  const now = Math.floor(Date.now() / 1000);
  const passwordHash = await bcrypt.hash(password, 12);
  await db.update(users).set({ passwordHash, updatedAt: now }).where(eq(users.id, user.id));

  const orgKey = await getOrganizationVoucherSecret();
  const setup = generateAgentSetupCode({
    username: user.username,
    password,
    fullName: user.fullName,
    adminCommissionRate: agent.adminCommissionRate,
    orgKey,
  });

  await logAudit({
    userId: adminId,
    action: 'REGENERATE_SETUP',
    entityType: 'agent',
    entityId: agentId,
    newValue: { username: user.username },
  });

  return {
    success: true,
    data: {
      username: user.username,
      setupCode: setup.code,
      message: 'Send this TAS code to the hall PC. Agent pastes it under Activate PC, then logs in.',
    },
  };
}

export async function updateAgent(adminId: string, agentId: string, data: {
  fullName?: string; phone?: string; commissionRate?: number; adminCommissionRate?: number;
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
    adminCommissionRate: data.adminCommissionRate ?? agent.adminCommissionRate,
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
