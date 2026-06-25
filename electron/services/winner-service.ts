import { v4 as uuid } from 'uuid';
import { eq, and } from 'drizzle-orm';
import { getDb } from './database-service';
import { gameCards, bingoCards, winners, drawnNumbers } from '../../src/infrastructure/database/schema';
import { parseCardData } from '../../src/domain/services/card-generator';
import {
  normalizeWinningPattern,
  verifyTicketWin,
} from '../../src/domain/services/winner-verification';
import { DEFAULT_AGENT_COMMISSION_RATE } from '../../src/shared/constants';
import type { Game } from '../../src/infrastructure/database/schema';

export interface ScannedWinner {
  cardId: string;
  cardNumber: string;
  prizeAmount: number;
}

/** Load called numbers for a game (GameCalledNumbers / drawn_numbers) */
export async function getCalledNumbers(gameId: string): Promise<number[]> {
  const db = getDb();
  const rows = await db.select().from(drawnNumbers)
    .where(eq(drawnNumbers.gameId, gameId))
    .orderBy(drawnNumbers.drawOrder)
    .all();
  return rows.map((r) => r.number);
}

/** After each draw: scan active tickets, record new winners, split ties equally */
export async function scanAndRecordWinners(
  game: Game,
  triggeringNumber: number,
  drawOrder: number,
): Promise<ScannedWinner[]> {
  const db = getDb();
  const calledNumbers = await getCalledNumbers(game.id);
  const pattern = normalizeWinningPattern(game.winningPattern);
  const jackpotMax = game.jackpotMaximumCalls ?? 45;

  const tickets = await db.select().from(gameCards).where(eq(gameCards.gameId, game.id)).all();
  const existingWinners = await db.select().from(winners).where(eq(winners.gameId, game.id)).all();
  const wonForPattern = new Set(
    existingWinners.filter((w) => normalizeWinningPattern(w.winningPattern) === pattern).map((w) => w.cardId),
  );

  const qualified: { cardId: string; cardNumber: string }[] = [];

  for (const ticket of tickets) {
    if (ticket.status === 'CANCELLED') continue;
    if (wonForPattern.has(ticket.cardId)) continue;

    const card = await db.select().from(bingoCards).where(eq(bingoCards.id, ticket.cardId)).get();
    if (!card) continue;

    const grid = parseCardData(card.cardData);
    const verification = verifyTicketWin({
      ticketExists: true,
      ticketInGame: true,
      ticketCancelled: false,
      alreadyWonSamePattern: false,
      grid,
      calledNumbers,
      winningPattern: pattern,
      jackpotMaximumCalls: jackpotMax,
    });

    if (verification.valid) {
      qualified.push({ cardId: card.id, cardNumber: card.cardNumber });
    }
  }

  if (qualified.length === 0) return [];

  const activeTickets = tickets.filter((t) => t.status !== 'CANCELLED');
  const totalBets = game.betAmount * activeTickets.length;
  const commissionRate = game.commissionRate ?? DEFAULT_AGENT_COMMISSION_RATE;
  const commission = totalBets * (commissionRate / 100);
  const totalPrize = totalBets - commission;
  const prizeEach = totalPrize / qualified.length;
  const now = Math.floor(Date.now() / 1000);
  const tieGroupId = uuid();

  const created: ScannedWinner[] = [];
  for (const q of qualified) {
    await db.insert(winners).values({
      id: uuid(),
      gameId: game.id,
      cardId: q.cardId,
      winningPattern: pattern,
      prizeAmount: prizeEach,
      wonAt: now,
      winningCallNumber: triggeringNumber,
      calledCountAtWin: drawOrder,
      verifiedAt: now,
      verificationResult: 'VALID',
      tieGroupId,
    });
    created.push({ cardId: q.cardId, cardNumber: q.cardNumber, prizeAmount: prizeEach });
  }

  return created;
}

/** Manual claim verification using the same rules */
export async function verifyTicketForGame(
  game: Game,
  agentId: string,
  cardNumber: string,
) {
  const db = getDb();
  const card = await db.select().from(bingoCards)
    .where(and(eq(bingoCards.agentId, agentId), eq(bingoCards.cardNumber, cardNumber)))
    .get();

  const ticket = card
    ? await db.select().from(gameCards)
      .where(and(eq(gameCards.gameId, game.id), eq(gameCards.cardId, card.id)))
      .get()
    : undefined;

  const pattern = normalizeWinningPattern(game.winningPattern);
  const calledNumbers = await getCalledNumbers(game.id);
  const existing = card
    ? await db.select().from(winners)
      .where(and(eq(winners.gameId, game.id), eq(winners.cardId, card.id)))
      .all()
    : [];

  const alreadyWon = existing.some((w) => normalizeWinningPattern(w.winningPattern) === pattern);

  const verification = verifyTicketWin({
    ticketExists: !!card,
    ticketInGame: !!ticket,
    ticketCancelled: ticket?.status === 'CANCELLED',
    alreadyWonSamePattern: alreadyWon,
    grid: card ? parseCardData(card.cardData) : null,
    calledNumbers,
    winningPattern: pattern,
    jackpotMaximumCalls: game.jackpotMaximumCalls ?? 45,
  });

  return { card, ticket, verification, calledNumbers, pattern, existing };
}
