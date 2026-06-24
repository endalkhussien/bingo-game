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
  parseOfflineVoucher,
  offlineVoucherNonceKey,
} from '../../src/shared/voucher/offline-voucher';
import { DEFAULT_OPERATOR_ORG_KEY } from '../../src/shared/voucher/default-org-key';
import { getConfiguredOrganizationKey, getOrganizationVoucherSecret } from './voucher-secret-service';
import { normalizeUsername } from '../../src/shared/auth/normalize-username';
import { sql } from 'drizzle-orm';
import { debitOperatorWallet } from './operator-wallet-service';

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
  const agentUsername = normalizeUsername(agentUser?.username ?? '');

  // 1) Legacy DB voucher (same PC / seeded codes)
  const voucher = await db.select().from(rechargeVouchers)
    .where(and(eq(rechargeVouchers.code, normalized), eq(rechargeVouchers.isUsed, false)))
    .get();

  if (voucher) {
    return {
      success: false,
      error: 'This code type is no longer supported. Ask your admin for a TBG recharge code.',
    };
  }

  // Signed offline TBG code — unique per agent, verified with organization key
  const configuredKey = await getConfiguredOrganizationKey();
  const orgKeys = [...new Set([
    configuredKey,
    DEFAULT_OPERATOR_ORG_KEY,
    await getOrganizationVoucherSecret().catch(() => null),
  ].filter((k): k is string => !!k && k.length >= 32))];

  let matchedKey: string | null = null;
  let parsedPayload: ReturnType<typeof parseOfflineVoucher> = null;

  for (const key of orgKeys) {
    const payload = parseOfflineVoucher(code, key);
    if (payload) {
      matchedKey = key;
      parsedPayload = payload;
      break;
    }
  }

  if (!parsedPayload || !matchedKey) {
    return {
      success: false,
      error: 'Invalid recharge code or wrong organization key. On a new hall PC: Login → Activate PC → paste your TAS setup code from admin, then ask admin for a new TBG code.',
    };
  }

  const verification = verifyOfflineVoucher(code, matchedKey, agentUsername);
  if (!verification.valid || !verification.payload || !verification.codeHash) {
    return {
      success: false,
      error: verification.error ?? `This code is for agent "${parsedPayload.forUsername}" but you are logged in as "${agentUsername}". Ask admin to generate a new code for your username.`,
    };
  }

  if (matchedKey !== configuredKey) {
    const { setOrganizationVoucherSecret } = await import('./voucher-secret-service');
    await setOrganizationVoucherSecret(matchedKey);
  }

  const { amount, nonce } = verification.payload;
  const nonceKey = offlineVoucherNonceKey(nonce);
  const codeHash = verification.codeHash;

  const usedByNonce = await db.select().from(usedOfflineVouchers)
    .where(eq(usedOfflineVouchers.nonce, nonceKey))
    .get();
  const usedByHash = await db.select().from(usedOfflineVouchers)
    .where(eq(usedOfflineVouchers.codeHash, codeHash))
    .get();

  if (usedByNonce || usedByHash) {
    return { success: false, error: 'This recharge code was already used' };
  }

  const issued = await db.select().from(issuedOfflineVouchers)
    .where(eq(issuedOfflineVouchers.codeHash, codeHash))
    .get();
  if (issued?.status === 'REVOKED') {
    return { success: false, error: 'This recharge code was revoked by admin' };
  }

  const usedId = uuid();
  await db.insert(usedOfflineVouchers).values({
    id: usedId,
    nonce: nonceKey,
    codeHash,
    amount,
    agentId,
    redeemedAt: now,
  });

  if (issued) {
    await db.update(issuedOfflineVouchers).set({
      status: 'REDEEMED',
      redeemedAt: now,
    }).where(eq(issuedOfflineVouchers.id, issued.id));
  }

  return creditAgentWallet(
    agentId,
    amount,
    `Secure offline recharge (${agentUsername})`,
    'offline_voucher',
    usedId,
  );
}

export async function createOfflineRechargeCode(
  adminUserId: string,
  amount: number,
  forUsername: string,
) {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  const username = normalizeUsername(forUsername);
  if (!username) {
    return { success: false, error: 'Select an agent — each code is unique and bound to one agent' };
  }

  const target = await db.select().from(users)
    .where(sql`lower(${users.username}) = ${username}`)
    .get();
  if (!target || target.role !== 'AGENT') {
    return { success: false, error: `Agent username "${forUsername}" not found` };
  }

  const roundedAmount = Math.round(amount);
  const debit = await debitOperatorWallet(
    roundedAmount,
    `TBG code for ${username}`,
    'tbg_issue',
    username,
  );
  if (!debit.success) {
    return { success: false, error: debit.error ?? 'Insufficient shop admin balance. Redeem a TVP code from vendor first.' };
  }

  const orgSecret = await getOrganizationVoucherSecret();
  const issuedCount = await db.select().from(issuedOfflineVouchers).all();
  const serial = issuedCount.length + 1;

  const generated = generateOfflineVoucher(amount, orgSecret, { forUsername: username, serial });
  const id = uuid();

  await db.insert(issuedOfflineVouchers).values({
    id,
    code: generated.code,
    codeHash: generated.codeHash,
    amount: generated.amount,
    forUsername: username,
    nonce: offlineVoucherNonceKey(generated.nonce),
    expiresAt: generated.expiresAt,
    status: 'ISSUED',
    issuedBy: adminUserId,
    issuedAt: now,
  });

  return {
    success: true,
    data: {
      code: generated.code,
      amount: generated.amount,
      expiresAt: generated.expiresAt,
      forUsername: username,
      serial: generated.serial,
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
    forUsername: r.forUsername,
  }));
}

export async function revokeOfflineCode(codeId: string) {
  const db = getDb();
  const row = await db.select().from(issuedOfflineVouchers)
    .where(eq(issuedOfflineVouchers.id, codeId))
    .get();
  if (!row) return { success: false, error: 'Code not found' };
  if (row.status === 'REDEEMED') return { success: false, error: 'Code already redeemed — cannot revoke' };

  await db.update(issuedOfflineVouchers).set({ status: 'REVOKED' })
    .where(eq(issuedOfflineVouchers.id, codeId));
  return { success: true };
}

/** Permanently remove an unused or revoked code from the issued list. */
export async function deleteIssuedOfflineCode(codeId: string) {
  const db = getDb();
  const row = await db.select().from(issuedOfflineVouchers)
    .where(eq(issuedOfflineVouchers.id, codeId))
    .get();
  if (!row) return { success: false, error: 'Code not found' };
  if (row.status === 'REDEEMED') {
    return { success: false, error: 'Cannot delete a redeemed code — keep for records' };
  }

  await db.delete(issuedOfflineVouchers).where(eq(issuedOfflineVouchers.id, codeId));
  return { success: true };
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

export async function adminDeposit(_agentId: string, _amount: number, _description: string) {
  return {
    success: false,
    error: 'Direct deposits are disabled. Generate a TBG recharge code for this agent (uses your shop balance).',
  };
}

export async function adminWithdraw(_agentId: string, _amount: number, _description: string) {
  return {
    success: false,
    error: 'Direct withdrawals are disabled. Agent balance changes only via TBG recharge codes and game payouts.',
  };
}

export async function adminAdjust(_agentId: string, _amount: number, _description: string) {
  return {
    success: false,
    error: 'Manual balance adjustments are disabled. Generate a TBG recharge code for this agent.',
  };
}

export async function creditGameStakes(agentId: string, amount: number, gameCode: string) {
  const balance = await adjustWallet(agentId, amount, 'GAME_STAKES', `Player stakes collected: ${gameCode}`);
  return { success: true, data: { newBalance: balance } };
}

export async function deductPrizePayout(agentId: string, amount: number, gameCode: string) {
  try {
    const balance = await adjustWallet(agentId, -amount, 'PRIZE_PAYOUT', `Winner prize paid: ${gameCode}`);
    return { success: true, data: { newBalance: balance } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Insufficient balance for prize' };
  }
}

export async function deductGameCommission(agentId: string, amount: number, gameCode: string) {
  if (amount <= 0) return { success: true, data: { newBalance: await getBalance(agentId) } };
  try {
    const balance = await adjustWallet(agentId, -amount, 'GAME_COMMISSION', `Game commission settled: ${gameCode}`);
    return { success: true, data: { newBalance: balance } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Insufficient balance' };
  }
}

export async function reserveGameCommission(agentId: string, amount: number, gameCode: string) {
  if (amount <= 0) return { success: true, data: { newBalance: await getBalance(agentId) } };
  try {
    const balance = await adjustWallet(agentId, -amount, 'GAME_COMMISSION_RESERVE', `Game commission reserved: ${gameCode}`);
    return { success: true, data: { newBalance: balance } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Insufficient balance' };
  }
}

export async function refundGameCommission(agentId: string, amount: number, gameCode: string) {
  if (amount <= 0) return { success: true, data: { newBalance: await getBalance(agentId) } };
  try {
    const balance = await adjustWallet(agentId, amount, 'GAME_COMMISSION_REFUND', `Game commission refunded: ${gameCode}`);
    return { success: true, data: { newBalance: balance } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Could not refund commission' };
  }
}

export async function deductAdminCommission(agentId: string, amount: number, gameCode: string) {
  if (amount <= 0) return { success: true, data: { newBalance: await getBalance(agentId) } };
  try {
    const balance = await adjustWallet(agentId, -amount, 'ADMIN_COMMISSION', `Admin share from commission: ${gameCode}`);
    return { success: true, data: { newBalance: balance } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Insufficient balance' };
  }
}

export async function reverseGameStakes(agentId: string, amount: number, gameCode: string) {
  try {
    const balance = await adjustWallet(agentId, -amount, 'GAME_CANCEL', `Game ended without winner: ${gameCode}`);
    return { success: true, data: { newBalance: balance } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Could not reverse stakes' };
  }
}

export async function deductGameCost(agentId: string, amount: number, gameCode: string) {
  const balance = await adjustWallet(agentId, -amount, 'GAME_BET', `Game stake: ${gameCode}`);
  return { success: true, data: { newBalance: balance } };
}
