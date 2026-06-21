import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { and, eq, inArray } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { DEFAULT_OPERATOR_ORG_KEY } from '../../shared/voucher/default-org-key';

const SEEDED_DEMO_USERNAME = 'agent';
const SEEDED_DEMO_FULL_NAME = 'Demo Agent';

export async function seedDatabase(db: BetterSQLite3Database<typeof schema>) {
  const now = Math.floor(Date.now() / 1000);

  const existing = await db.select().from(schema.users).where(eq(schema.users.username, 'admin')).get();
  if (existing) return;

  const vendorId = uuid();
  const adminId = uuid();

  await db.insert(schema.users).values([
    {
      id: vendorId,
      fullName: 'Waliya Vendor',
      username: 'vendor',
      passwordHash: await bcrypt.hash('vendor2024', 12),
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: adminId,
      fullName: 'Shop Admin',
      username: 'admin',
      passwordHash: await bcrypt.hash('admin123', 12),
      role: 'OPERATOR',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
  ]);

  const settings = [
    { key: 'default_commission', value: '20' },
    { key: 'minimum_bet', value: '10' },
    { key: 'maximum_bet', value: '1000' },
    { key: 'currency', value: 'ETB' },
    { key: 'number_range_max', value: '75' },
    { key: 'offline_voucher_org_key', value: DEFAULT_OPERATOR_ORG_KEY },
  ];

  for (const s of settings) {
    await db.insert(schema.systemSettings).values({
      key: s.key,
      value: s.value,
      updatedAt: now,
    });
  }

  const pricingPlans = [
    { name: '1 Card', planType: 'CARD_PACK', price: 5, cardLimit: 1 },
    { name: '10 Cards', planType: 'CARD_PACK', price: 40, cardLimit: 10 },
    { name: '50 Cards', planType: 'CARD_PACK', price: 180, cardLimit: 50 },
    { name: 'Daily', planType: 'MEMBERSHIP', price: 100, duration: 'DAILY', durationDays: 1 },
    { name: 'Weekly', planType: 'MEMBERSHIP', price: 500, duration: 'WEEKLY', durationDays: 7 },
    { name: 'Monthly', planType: 'MEMBERSHIP', price: 1500, duration: 'MONTHLY', durationDays: 30 },
  ];
  for (const p of pricingPlans) {
    await db.insert(schema.pricingPlans).values({
      id: uuid(), name: p.name, planType: p.planType, price: p.price,
      cardLimit: p.cardLimit ?? null, duration: p.duration ?? null,
      durationDays: p.durationDays ?? null, isActive: true, isPromotional: false,
      createdAt: now, updatedAt: now,
    });
  }
}

/** Remove the old seeded demo agent account from upgrades (no demo agent in production). */
export async function removeSeededDemoAgent(db: BetterSQLite3Database<typeof schema>) {
  const user = await db.select().from(schema.users).where(eq(schema.users.username, SEEDED_DEMO_USERNAME)).get();
  if (!user || user.fullName !== SEEDED_DEMO_FULL_NAME) return;

  const agent = await db.select().from(schema.agents).where(eq(schema.agents.userId, user.id)).get();
  if (!agent) {
    await db.delete(schema.users).where(eq(schema.users.id, user.id));
    return;
  }

  const activeGames = await db.select().from(schema.games).where(
    and(eq(schema.games.agentId, agent.id), inArray(schema.games.status, ['RUNNING', 'PAUSED'])),
  ).all();
  if (activeGames.length > 0) return;

  const agentGames = await db.select().from(schema.games).where(eq(schema.games.agentId, agent.id)).all();
  for (const game of agentGames) {
    await db.delete(schema.drawnNumbers).where(eq(schema.drawnNumbers.gameId, game.id));
    await db.delete(schema.winners).where(eq(schema.winners.gameId, game.id));
    await db.delete(schema.gameCards).where(eq(schema.gameCards.gameId, game.id));
    await db.delete(schema.gameRevenue).where(eq(schema.gameRevenue.gameId, game.id));
    await db.delete(schema.games).where(eq(schema.games.id, game.id));
  }

  await db.delete(schema.bingoCards).where(eq(schema.bingoCards.agentId, agent.id));
  await db.delete(schema.walletTransactions).where(eq(schema.walletTransactions.agentId, agent.id));
  await db.delete(schema.rechargeRequests).where(eq(schema.rechargeRequests.agentId, agent.id));
  await db.delete(schema.usedOfflineVouchers).where(eq(schema.usedOfflineVouchers.agentId, agent.id));
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, user.id));
  await db.delete(schema.notifications).where(eq(schema.notifications.userId, user.id));
  await db.update(schema.rechargeVouchers).set({ usedByAgentId: null }).where(eq(schema.rechargeVouchers.usedByAgentId, agent.id));
  await db.delete(schema.agents).where(eq(schema.agents.id, agent.id));
  await db.delete(schema.users).where(eq(schema.users.id, user.id));
}

/** Ensure shop admin account exists with OPERATOR role (fixes old installs). */
export async function ensureShopAdminUser(db: BetterSQLite3Database<typeof schema>) {
  const now = Math.floor(Date.now() / 1000);
  const admin = await db.select().from(schema.users).where(eq(schema.users.username, 'admin')).get();
  if (admin) {
    if (admin.role !== 'OPERATOR') {
      await db.update(schema.users).set({
        role: 'OPERATOR',
        fullName: 'Shop Admin',
        updatedAt: now,
      }).where(eq(schema.users.id, admin.id));
    }
    return;
  }
  await db.insert(schema.users).values({
    id: uuid(),
    fullName: 'Shop Admin',
    username: 'admin',
    passwordHash: await bcrypt.hash('admin123', 12),
    role: 'OPERATOR',
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  });
}

/** Add vendor super-admin on existing installs (safe to run every startup). */
export async function ensureVendorUser(db: BetterSQLite3Database<typeof schema>) {
  const now = Math.floor(Date.now() / 1000);
  const vendor = await db.select().from(schema.users).where(eq(schema.users.username, 'vendor')).get();
  if (!vendor) {
    await db.insert(schema.users).values({
      id: uuid(),
      fullName: 'Waliya Vendor',
      username: 'vendor',
      passwordHash: await bcrypt.hash('vendor2024', 12),
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    });
  }
}
