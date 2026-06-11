import { v4 as uuid } from 'uuid';
import { eq, desc, and } from 'drizzle-orm';
import { getDb } from './database-service';
import { agents, walletTransactions, rechargeVouchers } from '../../src/infrastructure/database/schema';

export async function getBalance(agentId: string) {
  const db = getDb();
  const agent = await db.select().from(agents).where(eq(agents.id, agentId)).get();
  return agent?.walletBalance ?? 0;
}

export async function getTransactions(agentId: string, limit = 50) {
  const db = getDb();
  return db.select().from(walletTransactions)
    .where(eq(walletTransactions.agentId, agentId))
    .orderBy(desc(walletTransactions.createdAt))
    .limit(limit)
    .all();
}

export async function redeemVoucher(agentId: string, code: string) {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  const voucher = await db.select().from(rechargeVouchers)
    .where(and(eq(rechargeVouchers.code, code.toUpperCase()), eq(rechargeVouchers.isUsed, false)))
    .get();

  if (!voucher) return { success: false, error: 'Invalid or already used voucher code' };

  const agent = await db.select().from(agents).where(eq(agents.id, agentId)).get();
  if (!agent) return { success: false, error: 'Agent not found' };

  const newBalance = agent.walletBalance + voucher.amount;

  await db.update(rechargeVouchers).set({
    isUsed: true,
    usedByAgentId: agentId,
    usedAt: now,
  }).where(eq(rechargeVouchers.id, voucher.id));

  await db.update(agents).set({ walletBalance: newBalance, updatedAt: now })
    .where(eq(agents.id, agentId));

  await db.insert(walletTransactions).values({
    id: uuid(),
    agentId,
    amount: voucher.amount,
    transactionType: 'RECHARGE',
    referenceType: 'voucher',
    referenceId: voucher.id,
    description: `Voucher recharge: ${code}`,
    balanceAfter: newBalance,
    createdAt: now,
  });

  return { success: true, data: { amount: voucher.amount, newBalance } };
}
