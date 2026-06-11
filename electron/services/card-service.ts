import { v4 as uuid } from 'uuid';
import { eq, desc } from 'drizzle-orm';
import { getDb } from './database-service';
import { bingoCards } from '../../src/infrastructure/database/schema';
import { generateBingoCard, serializeCardData, parseCardData } from '../../src/domain/services/card-generator';

export async function listCards(agentId: string) {
  const db = getDb();
  const cards = await db.select().from(bingoCards)
    .where(eq(bingoCards.agentId, agentId))
    .orderBy(desc(bingoCards.createdAt))
    .all();
  return cards.map((c) => ({
    ...c,
    grid: parseCardData(c.cardData),
  }));
}

export async function createCard(agentId: string, grid?: number[][]) {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const existing = await db.select().from(bingoCards).where(eq(bingoCards.agentId, agentId)).all();
  const cardNumber = String(existing.length + 1);
  const cardGrid = grid ?? generateBingoCard();

  const id = uuid();
  await db.insert(bingoCards).values({
    id,
    cardNumber,
    agentId,
    cardData: serializeCardData(cardGrid),
    createdAt: now,
    updatedAt: now,
  });

  return { id, cardNumber, grid: cardGrid };
}

export async function updateCard(cardId: string, agentId: string, grid: number[][]) {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const card = await db.select().from(bingoCards).where(eq(bingoCards.id, cardId)).get();
  if (!card || card.agentId !== agentId) throw new Error('Card not found');

  await db.update(bingoCards).set({
    cardData: serializeCardData(grid),
    updatedAt: now,
  }).where(eq(bingoCards.id, cardId));

  return { success: true };
}

export async function deleteCard(cardId: string, agentId: string) {
  const db = getDb();
  const card = await db.select().from(bingoCards).where(eq(bingoCards.id, cardId)).get();
  if (!card || card.agentId !== agentId) throw new Error('Card not found');
  await db.delete(bingoCards).where(eq(bingoCards.id, cardId));
  return { success: true };
}

export async function generateBulkCards(agentId: string, count: number) {
  const results = [];
  for (let i = 0; i < count; i++) {
    results.push(await createCard(agentId));
  }
  return results;
}
