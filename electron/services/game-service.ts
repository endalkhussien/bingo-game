import { v4 as uuid } from 'uuid';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { getDb } from './database-service';
import {
  games, gameCards, drawnNumbers, winners, gameRevenue, agents, bingoCards,
} from '../../src/infrastructure/database/schema';
import { CallingEngine } from '../../src/domain/services/calling-engine';
import { normalizeWinningPattern } from '../../src/domain/services/winner-verification';
import { MIN_BET, CARTELLA_MAX } from '../../src/shared/constants';
import { DRAW_BALL_COUNT } from '../../src/shared/brand';
import { calculateTotalPot, calculateWinnerPrize, calculateGameEconomics } from '../../src/shared/prize';
import { deductPrizePayout, creditGameStakes, deductAdminCommission, reverseGameStakes } from './wallet-service';
import { ensureFullDeck } from './card-service';
import { parseCardData } from '../../src/domain/services/card-generator';
import { verifyTicketForGame } from './winner-service';

function generateGameCode(): string {
  return `TBG-${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function createGame(agentId: string, config: {
  betAmount: number;
  winningPattern: string;
  drawSpeedMs: number;
  voiceType: string;
  language?: string;
  commissionRate?: number;
  jackpotMaximumCalls?: number;
  selectedNumbers: number[];
}) {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  if (config.betAmount < MIN_BET) {
    return { success: false, error: `Bet must be at least ${MIN_BET} ETB.` };
  }

  const invalidCard = config.selectedNumbers.find((n) => n < 1 || n > CARTELLA_MAX);
  if (invalidCard != null) {
    return { success: false, error: `Cartella numbers must be between 1 and ${CARTELLA_MAX}.` };
  }

  const agent = await db.select().from(agents).where(eq(agents.id, agentId)).get();
  if (!agent) return { success: false, error: 'Agent not found' };

  const playerCount = config.selectedNumbers.length;
  if (playerCount === 0) {
    return { success: false, error: 'Select at least one cartella.' };
  }

  const commissionRate = config.commissionRate ?? agent.commissionRate ?? 20;
  if (commissionRate < 0 || commissionRate > 100) {
    return { success: false, error: 'Commission must be between 0% and 100%.' };
  }

  const { totalPot, prize } = calculateWinnerPrize(config.betAmount, playerCount, commissionRate);
  if (agent.walletBalance <= 0) {
    return { success: false, error: 'Wallet balance is empty. Recharge with a TBG code before running a game.' };
  }
  if (agent.walletBalance < prize) {
    return {
      success: false,
      error: `Insufficient balance. Need at least ${prize.toFixed(0)} ETB to cover the winner prize (${playerCount} × ${config.betAmount} ETB pot, ${commissionRate}% commission).`,
    };
  }

  const id = uuid();
  const gameCode = generateGameCode();

  await db.insert(games).values({
    id,
    gameCode,
    agentId,
    gameName: `Game ${gameCode}`,
    betAmount: config.betAmount,
    winningPattern: config.winningPattern,
    jackpotMaximumCalls: config.jackpotMaximumCalls ?? 45,
    drawSpeedMs: config.drawSpeedMs,
    voiceType: config.voiceType,
    language: config.language ?? 'am',
    numberRangeMax: DRAW_BALL_COUNT,
    maxPlayers: CARTELLA_MAX,
    commissionRate,
    status: 'RUNNING',
    selectedNumbers: JSON.stringify(config.selectedNumbers),
    startedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  await ensureFullDeck(agentId);
  const allCards = await db.select().from(bingoCards).where(eq(bingoCards.agentId, agentId)).all();
  const cardByNumber = new Map(allCards.map((c) => [c.cardNumber, c]));
  const gameCardInserts = config.selectedNumbers
    .map((num) => cardByNumber.get(String(num)))
    .filter((card): card is NonNullable<typeof card> => !!card)
    .map((card) => ({
      id: uuid(),
      gameId: id,
      cardId: card.id,
      playerName: `Player ${card.cardNumber}`,
      status: 'ACTIVE' as const,
      joinedAt: now,
    }));

  if (gameCardInserts.length > 0) {
    await db.insert(gameCards).values(gameCardInserts);
  }

  await creditGameStakes(agentId, totalPot, gameCode);

  return {
    success: true,
    data: {
      id,
      gameCode,
      betAmount: config.betAmount,
      playerCount,
      status: 'RUNNING',
      totalPot,
      maxBalls: DRAW_BALL_COUNT,
    },
  };
}

async function loadGameWinners(gameId: string) {
  const db = getDb();
  const rows = await db.select().from(winners).where(eq(winners.gameId, gameId)).all();
  if (rows.length === 0) return [];

  const cardIds = rows.map((w) => w.cardId);
  const cards = await db.select().from(bingoCards).where(inArray(bingoCards.id, cardIds)).all();
  const cardMap = new Map(cards.map((c) => [c.id, c]));

  return rows.map((w) => ({
    cardNumber: cardMap.get(w.cardId)?.cardNumber ?? '?',
    prizeAmount: w.prizeAmount,
    pattern: w.winningPattern,
    calledCountAtWin: w.calledCountAtWin,
    winningCallNumber: w.winningCallNumber,
  }));
}

async function formatActiveGame(game: typeof games.$inferSelect) {
  const db = getDb();
  const drawn = await db.select().from(drawnNumbers)
    .where(eq(drawnNumbers.gameId, game.id))
    .orderBy(drawnNumbers.drawOrder)
    .all();
  const gameCardRows = await db.select().from(gameCards).where(eq(gameCards.gameId, game.id)).all();
  const playerCount = gameCardRows.length;
  const totalPot = calculateTotalPot(game.betAmount, playerCount);

  return {
    id: game.id,
    gameCode: game.gameCode,
    betAmount: game.betAmount,
    status: game.status,
    winningPattern: game.winningPattern,
    drawSpeedMs: game.drawSpeedMs,
    voiceType: game.voiceType,
    language: game.language,
    selectedNumbers: game.selectedNumbers ? JSON.parse(game.selectedNumbers) : [],
    drawnNumbers: drawn.map((d) => d.number),
    callHistory: drawn.map((d) => ({
      number: d.number,
      drawOrder: d.drawOrder,
      drawnAt: d.drawnAt,
    })),
    totalPot,
    playerCount,
    maxBalls: game.numberRangeMax,
    drawCount: drawn.length,
    winners: await loadGameWinners(game.id),
  };
}

export async function getActiveGame(agentId: string) {
  const db = getDb();
  for (const status of ['RUNNING', 'PAUSED'] as const) {
    const game = await db.select().from(games)
      .where(and(eq(games.agentId, agentId), eq(games.status, status)))
      .orderBy(desc(games.createdAt))
      .get();
    if (game) return formatActiveGame(game);
  }
  return null;
}

export async function drawNumber(gameId: string, agentId: string) {
  const db = getDb();
  const game = await db.select().from(games).where(eq(games.id, gameId)).get();
  if (!game || game.agentId !== agentId || game.status !== 'RUNNING') {
    return { success: false, error: game?.status === 'PAUSED' ? 'Game is paused' : 'Game not running' };
  }

  const drawn = await db.select().from(drawnNumbers).where(eq(drawnNumbers.gameId, gameId)).all();
  const engine = new CallingEngine(game.numberRangeMax);
  engine.loadFromHistory(
    drawn.map((d) => d.number),
    drawn.map((d) => d.drawnAt * 1000),
  );

  try {
    const record = engine.draw();
    const now = Math.floor(Date.now() / 1000);

    await db.insert(drawnNumbers).values({
      id: uuid(),
      gameId,
      number: record.number,
      drawOrder: record.drawOrder,
      drawnAt: now,
    });

    return {
      success: true,
      data: {
        number: record.number,
        letter: record.letter,
        label: record.label,
        drawOrder: record.drawOrder,
        drawCount: record.drawOrder,
        drawnAt: now,
        maxBalls: game.numberRangeMax,
        remainingCount: engine.remainingNumbers.length,
        voiceType: game.voiceType,
        language: game.language,
      },
    };
  } catch {
    return { success: false, error: 'All numbers drawn' };
  }
}

export async function pauseGame(gameId: string, agentId: string) {
  const db = getDb();
  const game = await db.select().from(games).where(eq(games.id, gameId)).get();
  if (!game || game.agentId !== agentId || game.status !== 'RUNNING') {
    return { success: false, error: 'Game not running' };
  }
  const now = Math.floor(Date.now() / 1000);
  await db.update(games).set({ status: 'PAUSED', updatedAt: now }).where(eq(games.id, gameId));
  return { success: true };
}

export async function resumeGame(gameId: string, agentId: string) {
  const db = getDb();
  const game = await db.select().from(games).where(eq(games.id, gameId)).get();
  if (!game || game.agentId !== agentId || game.status !== 'PAUSED') {
    return { success: false, error: 'Game not paused' };
  }
  const now = Math.floor(Date.now() / 1000);
  await db.update(games).set({ status: 'RUNNING', updatedAt: now }).where(eq(games.id, gameId));
  return { success: true };
}

export async function validateWinner(gameId: string, agentId: string, cardNumber: string) {
  const db = getDb();
  const game = await db.select().from(games).where(eq(games.id, gameId)).get();
  if (!game || game.agentId !== agentId) {
    return { success: false, valid: false, error: 'Game not found' };
  }
  if (!['RUNNING', 'PAUSED'].includes(game.status)) {
    return { success: false, valid: false, error: 'Game already ended' };
  }

  const { card, verification, pattern, existing, calledNumbers } = await verifyTicketForGame(game, agentId, cardNumber);
  const grid = card ? parseCardData(card.cardData) : null;

  if (!verification.valid) {
    return {
      success: true,
      valid: false,
      message: `Cartella #${cardNumber}: ${verification.message}`,
      cardNumber,
      calledNumbers,
      grid,
      verificationResult: 'INVALID',
    };
  }

  if (!card) {
    return { success: true, valid: false, message: verification.message };
  }

  const prior = existing.find((w) => normalizeWinningPattern(w.winningPattern) === pattern);
  if (prior) {
    return {
      success: true,
      valid: true,
      message: `Cartella #${cardNumber} already validated as winner.`,
      prizeAmount: prior.prizeAmount,
      cardNumber,
      calledNumbers,
      grid,
      verificationResult: 'VALID',
    };
  }

  const now = Math.floor(Date.now() / 1000);
  const drawn = await db.select().from(drawnNumbers).where(eq(drawnNumbers.gameId, gameId)).all();
  const drawOrder = drawn.length;
  const triggeringNumber = drawn[drawOrder - 1]?.number ?? 0;

  const gameCardRows = await db.select().from(gameCards).where(eq(gameCards.gameId, gameId)).all();
  const activeCount = gameCardRows.filter((t) => t.status !== 'CANCELLED').length;
  const agent = await db.select().from(agents).where(eq(agents.id, agentId)).get();
  const commissionRate = game.commissionRate ?? agent?.commissionRate ?? 20;
  const { totalPot, prize } = calculateWinnerPrize(game.betAmount, activeCount, commissionRate);

  await db.insert(winners).values({
    id: uuid(),
    gameId,
    cardId: card.id,
    winningPattern: pattern,
    prizeAmount: prize,
    wonAt: now,
    winningCallNumber: triggeringNumber,
    calledCountAtWin: drawOrder,
    verifiedAt: now,
    verificationResult: 'VALID',
  });

  const payout = await deductPrizePayout(agentId, prize, game.gameCode);
  if (!payout.success) {
    return { success: false, valid: false, error: payout.error ?? 'Insufficient balance to pay winner prize' };
  }

  await db.update(games).set({ status: 'PAUSED', updatedAt: now }).where(eq(games.id, gameId));

  return {
    success: true,
    valid: true,
    message: `Cartella #${cardNumber} wins ${prize.toFixed(0)} ETB!`,
    prizeAmount: prize,
    cardNumber,
    playerCount: activeCount,
    betAmount: game.betAmount,
    totalPot,
    calledNumbers,
    grid,
    verificationResult: 'VALID',
    calledCountAtWin: drawOrder,
    winningPattern: pattern,
  };
}

export async function endGame(gameId: string, agentId: string) {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const game = await db.select().from(games).where(eq(games.id, gameId)).get();
  if (!game || game.agentId !== agentId) return { success: false, error: 'Game not found' };

  const agent = await db.select().from(agents).where(eq(agents.id, agentId)).get();
  const agentCommissionRate = game.commissionRate ?? agent?.commissionRate ?? 20;
  const adminCommissionRate = agent?.adminCommissionRate ?? 20;

  const gameCardRows = await db.select().from(gameCards).where(eq(gameCards.gameId, gameId)).all();
  const playerCount = gameCardRows.length;
  const totalBets = game.betAmount * playerCount;
  const economics = calculateGameEconomics(
    game.betAmount,
    playerCount,
    agentCommissionRate,
    adminCommissionRate,
  );
  const gameWinners = await db.select().from(winners).where(eq(winners.gameId, gameId)).all();
  const totalPayouts = gameWinners.reduce((s, w) => s + w.prizeAmount, 0);

  await db.update(games).set({ status: 'COMPLETED', completedAt: now, updatedAt: now })
    .where(eq(games.id, gameId));

  await db.insert(gameRevenue).values({
    id: uuid(),
    gameId,
    totalPlayers: playerCount,
    totalBets,
    totalPayouts,
    platformRevenue: economics.adminCut,
    agentRevenue: economics.agentNetCommission,
    commissionRevenue: economics.agentGrossCommission,
    calculatedAt: now,
  });

  if (totalPayouts > 0 && economics.adminCut > 0) {
    await deductAdminCommission(agentId, economics.adminCut, game.gameCode);
  } else if (totalPayouts === 0) {
    await reverseGameStakes(agentId, totalBets, game.gameCode);
  }

  return {
    success: true,
    data: {
      totalBets,
      agentRevenue: Math.max(0, economics.agentNetCommission),
      totalPayouts,
      commissionRevenue: economics.agentGrossCommission,
      platformRevenue: economics.adminCut,
      agentCommissionRate,
      adminCommissionRate,
    },
  };
}

export async function listGames(agentId: string, filters?: { status?: string; startDate?: number; endDate?: number }) {
  const db = getDb();
  const allGames = await db.select().from(games).where(eq(games.agentId, agentId)).orderBy(desc(games.createdAt)).all();

  const results = [];
  for (const game of allGames) {
    if (filters?.status && filters.status !== 'ALL' && game.status !== filters.status) continue;
    if (filters?.startDate && game.createdAt < filters.startDate) continue;
    if (filters?.endDate && game.createdAt > filters.endDate) continue;

    const revenue = await db.select().from(gameRevenue).where(eq(gameRevenue.gameId, game.id)).get();
    const gameCardRows = await db.select().from(gameCards).where(eq(gameCards.gameId, game.id)).all();

    results.push({
      id: game.id,
      gameCode: game.gameCode,
      date: game.createdAt,
      betAmount: game.betAmount,
      playersNumber: gameCardRows.length,
      commissionPercent: game.commissionRate ?? 20,
      profit: revenue?.agentRevenue ?? 0,
      status: game.status,
    });
  }
  return results;
}
