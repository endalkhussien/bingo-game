import { v4 as uuid } from 'uuid';
import { eq, desc, and } from 'drizzle-orm';
import { getDb } from './database-service';
import {
  games, gameCards, drawnNumbers, winners, gameRevenue, agents, bingoCards,
} from '../../src/infrastructure/database/schema';
import { drawRandomNumber, checkWinningPattern } from '../../src/domain/services/bingo-engine';
import { parseCardData } from '../../src/domain/services/card-generator';
import { BALL_COUNT, MIN_BET } from '../../src/shared/constants';

function generateGameCode(): string {
  return `BNG-${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function createGame(agentId: string, config: {
  betAmount: number;
  winningPattern: string;
  drawSpeedMs: number;
  voiceType: string;
  selectedNumbers: number[];
}) {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  if (config.betAmount < MIN_BET) {
    return { success: false, error: `Bet must be at least ${MIN_BET} ETB.` };
  }

  const agent = await db.select().from(agents).where(eq(agents.id, agentId)).get();
  if (!agent) return { success: false, error: 'Agent not found' };

  const playerCount = config.selectedNumbers.length;
  const gameCost = config.betAmount * playerCount;
  if (agent.walletBalance < gameCost && playerCount > 0) {
    return { success: false, error: 'Insufficient wallet balance' };
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
    language: 'en',
    numberRangeMax: BALL_COUNT,
    maxPlayers: BALL_COUNT,
    status: 'RUNNING',
    selectedNumbers: JSON.stringify(config.selectedNumbers),
    startedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  // Assign cards for selected numbers
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

  return {
    success: true,
    data: {
      id,
      gameCode,
      betAmount: config.betAmount,
      playerCount,
      status: 'RUNNING',
    },
  };
}

export async function getActiveGame(agentId: string) {
  const db = getDb();
  const game = await db.select().from(games)
    .where(and(eq(games.agentId, agentId), eq(games.status, 'RUNNING')))
    .orderBy(desc(games.createdAt))
    .get();
  if (!game) return null;

  const drawn = await db.select().from(drawnNumbers)
    .where(eq(drawnNumbers.gameId, game.id))
    .orderBy(drawnNumbers.drawOrder)
    .all();

  return {
    ...game,
    selectedNumbers: game.selectedNumbers ? JSON.parse(game.selectedNumbers) : [],
    drawnNumbers: drawn.map((d) => d.number),
  };
}

export async function drawNumber(gameId: string, agentId: string) {
  const db = getDb();
  const game = await db.select().from(games).where(eq(games.id, gameId)).get();
  if (!game || game.agentId !== agentId || game.status !== 'RUNNING') {
    return { success: false, error: 'Game not running' };
  }

  const drawn = await db.select().from(drawnNumbers).where(eq(drawnNumbers.gameId, gameId)).all();
  const drawnNums = drawn.map((d) => d.number);

  try {
    const number = drawRandomNumber(drawnNums, game.numberRangeMax);
    const now = Math.floor(Date.now() / 1000);

    await db.insert(drawnNumbers).values({
      id: uuid(),
      gameId,
      number,
      drawOrder: drawn.length + 1,
      drawnAt: now,
    });

    // Auto-check winners
    const gameCardRows = await db.select().from(gameCards).where(eq(gameCards.gameId, gameId)).all();
    const newWinners = [];
    for (const gc of gameCardRows) {
      const card = await db.select().from(bingoCards).where(eq(bingoCards.id, gc.cardId)).get();
      if (!card) continue;
      const grid = parseCardData(card.cardData);
      const allDrawn = [...drawnNums, number];
      if (checkWinningPattern(grid, allDrawn, game.winningPattern)) {
        const existing = await db.select().from(winners)
          .where(and(eq(winners.gameId, gameId), eq(winners.cardId, card.id))).get();
        if (!existing) {
          const playerCount = gameCardRows.length;
          const totalBets = game.betAmount * playerCount;
          const commission = totalBets * 0.2;
          const prize = totalBets - commission;
          await db.insert(winners).values({
            id: uuid(),
            gameId,
            cardId: card.id,
            winningPattern: game.winningPattern,
            prizeAmount: prize,
            wonAt: now,
          });
          newWinners.push({ cardNumber: card.cardNumber, prizeAmount: prize });
        }
      }
    }

    return { success: true, data: { number, drawOrder: drawn.length + 1, winners: newWinners } };
  } catch {
    return { success: false, error: 'All numbers drawn' };
  }
}

export async function endGame(gameId: string, agentId: string) {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const game = await db.select().from(games).where(eq(games.id, gameId)).get();
  if (!game || game.agentId !== agentId) return { success: false, error: 'Game not found' };

  const gameCardRows = await db.select().from(gameCards).where(eq(gameCards.gameId, gameId)).all();
  const playerCount = gameCardRows.length;
  const totalBets = game.betAmount * playerCount;
  const commissionRate = 20;
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

  // Credit agent wallet with profit
  const agent = await db.select().from(agents).where(eq(agents.id, agentId)).get();
  if (agent) {
    const newBalance = agent.walletBalance + Math.max(0, agentRevenue);
    await db.update(agents).set({ walletBalance: newBalance, updatedAt: now })
      .where(eq(agents.id, agentId));
  }

  return { success: true, data: { totalBets, agentRevenue: Math.max(0, agentRevenue), totalPayouts } };
}

export async function listGames(agentId: string, filters?: { status?: string; startDate?: number; endDate?: number }) {
  const db = getDb();
  let query = db.select().from(games).where(eq(games.agentId, agentId)).orderBy(desc(games.createdAt));
  const allGames = await query.all();

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
      commissionPercent: 20,
      profit: revenue?.agentRevenue ?? 0,
      status: game.status,
    });
  }
  return results;
}
