import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

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
    walletBalance: 500,
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  });

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
    { key: 'number_range_max', value: '150' },
  ];

  for (const s of settings) {
    await db.insert(schema.systemSettings).values({
      key: s.key,
      value: s.value,
      updatedAt: now,
    });
  }
}
