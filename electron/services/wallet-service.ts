import { v4 as uuid } from 'uuid';
import { eq, desc, and } from 'drizzle-orm';
import { getDb } from './database-service';
import {
  agents, users, walletTransactions, rechargeVouchers,
  usedOfflineVouchers, issuedOfflineVouchers,
} from '../../src/infrastructure/database/schema';
import {
  generateOfflineVoucher,
  verifyOfflineVoucher,
  offlineVoucherNonceKey,
} from '../../src/shared/voucher/offline-voucher';

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

async function creditAgentWallet(
  agentId: string,
  amount: number,
  description: string,
  referenceType: string,
  referenceId: string,
) {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const agent = await db.select().from(agents).where(eq(agents.id, agentId)).get();
  if (!agent) return { success: false as const, error: 'Agent not found' };

  const newBalance = agent.walletBalance + amount;
  await db.update(agents).set({ walletBalance: newBalance, updatedAt: now })
    .where(eq(agents.id, agentId));

  await db.insert(walletTransactions).values({
    id: uuid(),
    agentId,
    amount,
    transactionType: 'RECHARGE',
    referenceType,
    referenceId,
    description,
    balanceAfter: newBalance,
    createdAt: now,
  });

  return { success: true as const, data: { amount, newBalance } };
}

export async function redeemVoucher(agentId: string, code: string) {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const normalized = code.trim().toUpperCase();

  const agent = await db.select().from(agents).where(eq(agents.id, agentId)).get();
  if (!agent) return { success: false, error: 'Agent not found' };

  const agentUser = await db.select().from(users).where(eq(users.id, agent.userId)).get();
  const agentUsername = agentUser?.username ?? '';

  // 1) Legacy DB voucher (same PC / seeded codes)
  const voucher = await db.select().from(rechargeVouchers)
    .where(and(eq(rechargeVouchers.code, normalized), eq(rechargeVouchers.isUsed, false)))
    .get();

  if (voucher) {
    await db.update(rechargeVouchers).set({
      isUsed: true,
      usedByAgentId: agentId,
      usedAt: now,
    }).where(eq(rechargeVouchers.id, voucher.id));

    return creditAgentWallet(
      agentId,
      voucher.amount,
      `Voucher recharge: ${normalized}`,
      'voucher',
      voucher.id,
    );
  }

  // 2) Signed offline code (works on any agent PC — no admin connection)
  const verification = verifyOfflineVoucher(code, agentUsername);
  if (!verification.valid || !verification.payload) {
    return { success: false, error: verification.error ?? 'Invalid or already used recharge code' };
  }

  const { amount, nonce } = verification.payload;
  const nonceKey = offlineVoucherNonceKey(nonce);

  const alreadyUsed = await db.select().from(usedOfflineVouchers)
    .where(eq(usedOfflineVouchers.nonce, nonceKey))
    .get();

  if (alreadyUsed) {
    return { success: false, error: 'This recharge code was already used on this computer' };
  }

  const usedId = uuid();
  await db.insert(usedOfflineVouchers).values({
    id: usedId,
    nonce: nonceKey,
    amount,
    agentId,
    redeemedAt: now,
  });

  return creditAgentWallet(
    agentId,
    amount,
    `Offline recharge code: ${normalized.slice(0, 24)}…`,
    'offline_voucher',
    usedId,
  );
}

export async function createOfflineRechargeCode(
  adminUserId: string,
  amount: number,
  forUsername?: string,
) {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  if (forUsername) {
    const target = await db.select().from(users)
      .where(eq(users.username, forUsername.trim().toLowerCase()))
      .get();
    if (!target || target.role !== 'AGENT') {
      return { success: false, error: `Agent username "${forUsername}" not found` };
    }
  }

  const generated = generateOfflineVoucher(amount, { forUsername });
  const id = uuid();

  await db.insert(issuedOfflineVouchers).values({
    id,
    code: generated.code,
    amount: generated.amount,
    forUsername: generated.forUsername || null,
    nonce: offlineVoucherNonceKey(generated.nonce),
    expiresAt: generated.expiresAt,
    issuedBy: adminUserId,
    issuedAt: now,
  });

  return {
    success: true,
    data: {
      code: generated.code,
      amount: generated.amount,
      expiresAt: generated.expiresAt,
      forUsername: generated.forUsername || null,
    },
  };
}

export async function listIssuedOfflineCodes(limit = 50) {
  const db = getDb();
  const rows = await db.select().from(issuedOfflineVouchers)
    .orderBy(desc(issuedOfflineVouchers.issuedAt))
    .limit(limit)
    .all();

  return rows.map((r) => ({
    ...r,
    expiresAt: r.expiresAt,
    forUsername: r.forUsername ?? 'any agent',
  }));
}

async function adjustWallet(agentId: string, amount: number, type: string, description: string) {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const agent = await db.select().from(agents).where(eq(agents.id, agentId)).get();
  if (!agent) throw new Error('Agent not found');
  const newBalance = agent.walletBalance + amount;
  if (newBalance < 0) throw new Error('Insufficient balance');
  await db.update(agents).set({ walletBalance: newBalance, updatedAt: now }).where(eq(agents.id, agentId));
  await db.insert(walletTransactions).values({
    id: uuid(), agentId, amount, transactionType: type,
    description, balanceAfter: newBalance, createdAt: now,
  });
  return newBalance;
}

export async function adminDeposit(agentId: string, amount: number, description: string) {
  const balance = await adjustWallet(agentId, amount, 'DEPOSIT', description || 'Admin deposit');
  return { success: true, data: { newBalance: balance } };
}

export async function adminWithdraw(agentId: string, amount: number, description: string) {
  const balance = await adjustWallet(agentId, -amount, 'WITHDRAWAL', description || 'Admin withdrawal');
  return { success: true, data: { newBalance: balance } };
}

export async function adminAdjust(agentId: string, amount: number, description: string) {
  const balance = await adjustWallet(agentId, amount, 'ADJUSTMENT', description || 'Admin adjustment');
  return { success: true, data: { newBalance: balance } };
}

export async function deductGameCost(agentId: string, amount: number, gameCode: string) {
  const balance = await adjustWallet(agentId, -amount, 'GAME_BET', `Game stake: ${gameCode}`);
  return { success: true, data: { newBalance: balance } };
}
