import { v4 as uuid } from 'uuid';
import { eq, desc, and } from 'drizzle-orm';
import { getDb } from './database-service';
import { notifications } from '../../src/infrastructure/database/schema';

export async function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  message: string;
  referenceType?: string;
  referenceId?: string;
}) {
  const db = getDb();
  await db.insert(notifications).values({
    id: uuid(),
    userId: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    referenceType: params.referenceType ?? null,
    referenceId: params.referenceId ?? null,
    isRead: false,
    createdAt: Math.floor(Date.now() / 1000),
  });
}

export async function listNotifications(userId: string, limit = 50) {
  const db = getDb();
  return db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .all();
}

export async function countUnread(userId: string) {
  const db = getDb();
  const all = await db.select().from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
    .all();
  return all.length;
}

export async function markRead(id: string, userId: string) {
  const db = getDb();
  await db.update(notifications).set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllRead(userId: string) {
  const db = getDb();
  const all = await db.select().from(notifications).where(eq(notifications.userId, userId)).all();
  for (const n of all) {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, n.id));
  }
}
