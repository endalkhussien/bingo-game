import { v4 as uuid } from 'uuid';
import { eq, desc, and } from 'drizzle-orm';
import { getDb } from './database-service';
import {
  games, gameCards, drawnNumbers, winners, gameRevenue, agents, bingoCards,
} from '../../src/infrastructure/database/schema';
import { drawRandomNumber, checkWinningPattern } from '../../src/domain/services/bingo-engine';
import { parseCardData } from '../../src/domain/services/card-generator';
import { MIN_BET, CARTELLA_MAX } from '../../src/shared/constants';
import { DRAW_BALL_COUNT } from '../../src/shared/brand';
import { deductGameCost } from './wallet-service';

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
  const gameCost = config.betAmount * playerCount;
  if (playerCount > 0 && agent.walletBalance < gameCost) {
    return { success: false, error: `Insufficient wallet balance. Need ${gameCost} ETB.` };
  }

  const commissionRate = config.commissionRate ?? agent.commissionRate ?? 20;
  if (commissionRate < 0 || commissionRate > 100) {
    return { success: false, error: 'Commission must be between 0% and 100%.' };
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

  if (gameCost > 0) {
    await deductGameCost(agentId, gameCost, gameCode);
  }

  const allCards = await db.select().from(bingoCards).where(eq(bingoCards.agentId, agentId)).all();
  for (const num of config.selectedNumbers) {
    const card = allCards.find((c) => c.cardNumber === String(num));
    if (card) {
      await db.insert(gameCards).values({
        id: uuid(),
        gameId: id,
        cardId: card.id,
        playerName: `Player ${num}`,
        joinedAt: now,
      });
    }
  }

  const totalPot = config.betAmount * playerCount;
  const agentCommission = totalPot * (commissionRate / 100);

  return {
    success: true,
    data: {
      id,
      gameCode,
      betAmount: config.betAmount,
      playerCount,
      status: 'RUNNING',
      commissionRate,
      totalPot,
      agentCommission,
      maxBalls: DRAW_BALL_COUNT,
    },
  };
}

async function formatActiveGame(game: typeof games.$inferSelect) {
  const db = getDb();
  const drawn = await db.select().from(drawnNumbers)
    .where(eq(drawnNumbers.gameId, game.id))
    .orderBy(drawnNumbers.drawOrder)
    .all();
  const agent = await db.select().from(agents).where(eq(agents.id, game.agentId)).get();
  const gameCardRows = await db.select().from(gameCards).where(eq(gameCards.gameId, game.id)).all();
  const playerCount = gameCardRows.length;
  const commissionRate = game.commissionRate ?? agent?.commissionRate ?? 20;
  const totalPot = game.betAmount * playerCount;

  return {
    ...game,
    selectedNumbers: game.selectedNumbers ? JSON.parse(game.selectedNumbers) : [],
    drawnNumbers: drawn.map((d) => d.number),
    commissionRate,
    totalPot,
    agentCommission: totalPot * (commissionRate / 100),
    maxBalls: game.numberRangeMax,
    drawCount: drawn.length,
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
  const drawnNums = drawn.map((d) => d.number);

  try {
    const number = drawRandomNumber(drawnNums, game.numberRangeMax);
    const now = Math.floor(Date.now() / 1000);
    const drawOrder = drawn.length + 1;

    await db.insert(drawnNumbers).values({
      id: uuid(),
      gameId,
      number,
      drawOrder,
      drawnAt: now,
    });

    return {
      success: true,
      data: {
        number,
        drawOrder,
        drawCount: drawOrder,
        maxBalls: game.numberRangeMax,
        voiceType: game.voiceType,
        language: game.language,
        winners: [],
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

  const card = await db.select().from(bingoCards)
    .where(and(eq(bingoCards.agentId, agentId), eq(bingoCards.cardNumber, cardNumber)))
    .get();
  if (!card) {
    return { success: true, valid: false, message: `Card #${cardNumber} not found for this agent.` };
  }

  const gc = await db.select().from(gameCards)
    .where(and(eq(gameCards.gameId, gameId), eq(gameCards.cardId, card.id)))
    .get();
  if (!gc) {
    return { success: true, valid: false, message: `Card #${cardNumber} is not in this game.` };
  }

  const drawn = await db.select().from(drawnNumbers).where(eq(drawnNumbers.gameId, gameId)).all();
  const drawnNums = drawn.map((d) => d.number);
  const grid = parseCardData(card.cardData);

  if (!checkWinningPattern(grid, drawnNums, game.winningPattern)) {
    return {
      success: true,
      valid: false,
      message: `Card #${cardNumber} does NOT have a winning pattern. Game stays paused — resume when ready.`,
    };
  }

  const existing = await db.select().from(winners)
    .where(and(eq(winners.gameId, gameId), eq(winners.cardId, card.id))).get();
  if (existing) {
    return { success: true, valid: true, message: `Card #${cardNumber} already validated.`, prizeAmount: existing.prizeAmount };
  }

  const now = Math.floor(Date.now() / 1000);
  const gameCardRows = await db.select().from(gameCards).where(eq(gameCards.gameId, gameId)).all();
  const playerCount = gameCardRows.length;
  const totalBets = game.betAmount * playerCount;
  const agent = await db.select().from(agents).where(eq(agents.id, agentId)).get();
  const commissionRate = game.commissionRate ?? agent?.commissionRate ?? 20;
  const commission = totalBets * (commissionRate / 100);
  const prize = totalBets - commission;

  await db.insert(winners).values({
    id: uuid(),
    gameId,
    cardId: card.id,
    winningPattern: game.winningPattern,
    prizeAmount: prize,
    wonAt: now,
  });

  await db.update(games).set({ status: 'PAUSED', updatedAt: now }).where(eq(games.id, gameId));

  return {
    success: true,
    valid: true,
    message: `Card #${cardNumber} is a VALID winner!`,
    prizeAmount: prize,
    cardNumber,
    commissionRate,
    agentCommission: commission,
  };
}

export async function endGame(gameId: string, agentId: string) {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const game = await db.select().from(games).where(eq(games.id, gameId)).get();
  if (!game || game.agentId !== agentId) return { success: false, error: 'Game not found' };

  const agent = await db.select().from(agents).where(eq(agents.id, agentId)).get();
  const commissionRate = game.commissionRate ?? agent?.commissionRate ?? 20;

  const gameCardRows = await db.select().from(gameCards).where(eq(gameCards.gameId, gameId)).all();
  const playerCount = gameCardRows.length;
  const totalBets = game.betAmount * playerCount;
  const commissionRevenue = totalBets * (commissionRate / 100);
  const gameWinners = await db.select().from(winners).where(eq(winners.gameId, gameId)).all();
  const totalPayouts = gameWinners.reduce((s, w) => s + w.prizeAmount, 0);
  const agentRevenue = totalBets - totalPayouts - commissionRevenue;

  await db.update(games).set({ status: 'COMPLETED', completedAt: now, updatedAt: now })
    .where(eq(games.id, gameId));

  await db.insert(gameRevenue).values({
    id: uuid(),
    gameId,
    totalPlayers: playerCount,
    totalBets,
    totalPayouts,
    platformRevenue: commissionRevenue,
    agentRevenue: Math.max(0, agentRevenue),
    commissionRevenue,
    calculatedAt: now,
  });

  if (agent) {
    const newBalance = agent.walletBalance + Math.max(0, agentRevenue);
    await db.update(agents).set({ walletBalance: newBalance, updatedAt: now })
      .where(eq(agents.id, agentId));
  }

  return {
    success: true,
    data: {
      totalBets,
      agentRevenue: Math.max(0, agentRevenue),
      totalPayouts,
      commissionRevenue,
      commissionRate,
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
