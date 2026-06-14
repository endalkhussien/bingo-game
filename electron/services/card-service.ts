import { v4 as uuid } from 'uuid';
import { eq } from 'drizzle-orm';
import { getDb } from './database-service';
import { bingoCards } from '../../src/infrastructure/database/schema';
import { CARTELLA_MAX } from '../../src/shared/constants';
import {
  generateBingoCard,
  serializeCardData,
  parseCardData,
  isValidBingoGrid,
} from '../../src/domain/services/card-generator';

function nextCardNumber(existing: { cardNumber: string }[]): string | null {
  const used = new Set(existing.map((c) => c.cardNumber));
  for (let n = 1; n <= CARTELLA_MAX; n++) {
    if (!used.has(String(n))) return String(n);
  }
  return null;
}

/** Create cartella #1–150, each with a random 5×5 grid (numbers 1–75) */
export async function ensureFullDeck(agentId: string): Promise<number> {
  const db = getDb();
  const existing = await db.select().from(bingoCards).where(eq(bingoCards.agentId, agentId)).all();
  const used = new Set(existing.map((c) => c.cardNumber));
  const now = Math.floor(Date.now() / 1000);
  let created = 0;

  for (let n = 1; n <= CARTELLA_MAX; n++) {
    if (used.has(String(n))) continue;
    await db.insert(bingoCards).values({
      id: uuid(),
      cardNumber: String(n),
      agentId,
      cardData: serializeCardData(generateBingoCard()),
      createdAt: now,
      updatedAt: now,
    });
    created++;
  }

  return created;
}

/** Fix old/invalid cards and optionally regenerate every grid */
export async function rebuildDeck(agentId: string, regenerateAll = false): Promise<number> {
  await ensureFullDeck(agentId);
  const db = getDb();
  const cards = await db.select().from(bingoCards).where(eq(bingoCards.agentId, agentId)).all();
  const now = Math.floor(Date.now() / 1000);
  let updated = 0;

  for (const card of cards) {
    const grid = parseCardData(card.cardData);
    if (regenerateAll || !isValidBingoGrid(grid)) {
      await db.update(bingoCards).set({
        cardData: serializeCardData(generateBingoCard()),
        updatedAt: now,
      }).where(eq(bingoCards.id, card.id));
      updated++;
    }
  }

  return updated;
}

export async function listCards(agentId: string) {
  await ensureFullDeck(agentId);
  await rebuildDeck(agentId, false);
  const db = getDb();
  const cards = await db.select().from(bingoCards).where(eq(bingoCards.agentId, agentId)).all();
  return cards
    .map((c) => ({
      ...c,
      grid: parseCardData(c.cardData),
    }))
    .sort((a, b) => Number(a.cardNumber) - Number(b.cardNumber));
}

export async function createCard(agentId: string, grid?: number[][]) {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const existing = await db.select().from(bingoCards).where(eq(bingoCards.agentId, agentId)).all();
  const cardNumber = nextCardNumber(existing);
  if (!cardNumber) {
    throw new Error(`All ${CARTELLA_MAX} cartella cards already exist (1–${CARTELLA_MAX}).`);
  }
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

export async function regenerateCardGrid(cardId: string, agentId: string) {
  const grid = generateBingoCard();
  await updateCard(cardId, agentId, grid);
  return { success: true, grid };
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
  await ensureFullDeck(agentId);
  const db = getDb();
  const existing = await db.select().from(bingoCards).where(eq(bingoCards.agentId, agentId)).all();
  const slotsLeft = CARTELLA_MAX - existing.length;
  const toCreate = Math.min(count, slotsLeft);
  const results = [];
  for (let i = 0; i < toCreate; i++) {
    results.push(await createCard(agentId));
  }
  return results;
}
