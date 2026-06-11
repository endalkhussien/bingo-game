import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import { eq, and, gt } from 'drizzle-orm';
import { getDb } from './database-service';
import { users, agents, sessions } from '../../src/infrastructure/database/schema';

const SESSION_TTL = 7 * 24 * 60 * 60; // 7 days
const REMEMBER_TTL = 30 * 24 * 60 * 60; // 30 days

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function login(username: string, password: string, rememberMe = false) {
  const db = getDb();
  const user = await db.select().from(users).where(eq(users.username, username)).get();
  if (!user) return { success: false, error: 'Invalid username or password' };
  if (user.status === 'SUSPENDED') return { success: false, error: 'Account is suspended' };

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return { success: false, error: 'Invalid username or password' };

  const token = crypto.randomBytes(32).toString('hex');
  const now = Math.floor(Date.now() / 1000);
  const ttl = rememberMe ? REMEMBER_TTL : SESSION_TTL;

  await db.insert(sessions).values({
    id: uuid(),
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: now + ttl,
    createdAt: now,
  });

  let agent = null;
  if (user.role === 'AGENT') {
    agent = await db.select().from(agents).where(eq(agents.userId, user.id)).get();
  }

  return {
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        role: user.role,
        status: user.status,
      },
      agent: agent ? {
        id: agent.id,
        walletBalance: agent.walletBalance,
        commissionRate: agent.commissionRate,
      } : null,
    },
  };
}

export async function validateSession(token: string) {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const session = await db.select().from(sessions)
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, now)))
    .get();
  if (!session) return null;

  const user = await db.select().from(users).where(eq(users.id, session.userId)).get();
  if (!user || user.status === 'SUSPENDED') return null;

  let agent = null;
  if (user.role === 'AGENT') {
    agent = await db.select().from(agents).where(eq(agents.userId, user.id)).get();
  }

  return {
    user: { id: user.id, fullName: user.fullName, username: user.username, role: user.role },
    agent: agent ? { id: agent.id, walletBalance: agent.walletBalance, commissionRate: agent.commissionRate } : null,
  };
}

export async function logout(token: string) {
  const db = getDb();
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  return { success: true };
}
