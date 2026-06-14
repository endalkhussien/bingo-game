import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { generateBingoCard, serializeCardData } from '../../domain/services/card-generator';
import { CARTELLA_MAX } from '../../shared/constants';

export async function seedDatabase(db: BetterSQLite3Database<typeof schema>) {
  const now = Math.floor(Date.now() / 1000);

  const existing = await db.select().from(schema.users).where(eq(schema.users.username, 'admin')).get();
  if (existing) return;

  const adminId = uuid();
  const agentUserId = uuid();
  const agentId = uuid();

  await db.insert(schema.users).values([
    {
      id: adminId,
      fullName: 'System Administrator',
      username: 'admin',
      passwordHash: await bcrypt.hash('admin123', 12),
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: agentUserId,
      fullName: 'Demo Agent',
      username: 'agent',
      passwordHash: await bcrypt.hash('agent123', 12),
      role: 'AGENT',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
  ]);

  await db.insert(schema.agents).values({
    id: agentId,
    userId: agentUserId,
    phone: '+251900000000',
    commissionRate: 20,
    adminCommissionRate: 20,
    walletBalance: 500,
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  });

  for (let n = 1; n <= CARTELLA_MAX; n++) {
    await db.insert(schema.bingoCards).values({
      id: uuid(),
      cardNumber: String(n),
      agentId,
      cardData: serializeCardData(generateBingoCard()),
      createdAt: now,
      updatedAt: now,
    });
  }

  const vouchers = [
    { code: 'VOUCHER100', amount: 100 },
    { code: 'VOUCHER500', amount: 500 },
    { code: 'VOUCHER1000', amount: 1000 },
    { code: 'DEMO2024', amount: 250 },
  ];

  for (const v of vouchers) {
    await db.insert(schema.rechargeVouchers).values({
      id: uuid(),
      code: v.code,
      amount: v.amount,
      isUsed: false,
      createdAt: now,
    });
  }

  const settings = [
    { key: 'default_commission', value: '20' },
    { key: 'minimum_bet', value: '10' },
    { key: 'maximum_bet', value: '1000' },
    { key: 'currency', value: 'ETB' },
    { key: 'number_range_max', value: '75' },
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
