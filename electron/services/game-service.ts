import { v4 as uuid } from 'uuid';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { getDb } from './database-service';
import {
  games, gameCards, drawnNumbers, winners, gameRevenue, agents, bingoCards,
} from '../../src/infrastructure/database/schema';
import { CallingEngine } from '../../src/domain/services/calling-engine';
import { normalizeWinningPattern } from '../../src/domain/services/winner-verification';
import { MIN_BET, CARTELLA_MAX, MIN_PLAYERS_TO_START, DEFAULT_AGENT_COMMISSION_RATE } from '../../src/shared/constants';
import { DRAW_BALL_COUNT } from '../../src/shared/brand';
import { calculateTotalPot, calculateWinnerPrize, calculateWalletReserveRequired, calculateGameEconomics, summarizeGameSettlement } from '../../src/shared/prize';
import { deductGameCommission, refundGameCommission, reserveGameCommission } from './wallet-service';
import { creditOperatorWallet } from './operator-wallet-service';
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

  if (agent.walletBalance <= 0) {
    return {
      success: false,
      error: 'Wallet balance is 0. Recharge with a TBG code from your admin before starting a game.',
    };
  }

  const playerCount = config.selectedNumbers.length;
  if (playerCount === 0) {
    return { success: false, error: 'Select at least one cartella.' };
  }
  if (playerCount < MIN_PLAYERS_TO_START) {
    return {
      success: false,
      error: `Select at least ${MIN_PLAYERS_TO_START} cartellas to start a game.`,
    };
  }

  const activeGame = await db.select().from(games)
    .where(and(eq(games.agentId, agentId), inArray(games.status, ['RUNNING', 'PAUSED'])))
    .orderBy(desc(games.createdAt))
    .get();
  if (activeGame) {
    return {
      success: false,
      error: 'You already have an active game. End it before creating a new one.',
    };
  }

  const commissionRate = config.commissionRate ?? agent.commissionRate ?? DEFAULT_AGENT_COMMISSION_RATE;
  if (commissionRate < 0 || commissionRate > 100) {
    return { success: false, error: 'Commission must be between 0% and 100%.' };
  }

  const allCards = await db.select().from(bingoCards).where(eq(bingoCards.agentId, agentId)).all();
  const cardByNumber = new Map(allCards.map((c) => [c.cardNumber, c]));
  const missing = config.selectedNumbers.filter((n) => !cardByNumber.has(String(n)));
  if (missing.length > 0) {
    const shown = missing.slice(0, 8).join(', ');
    const extra = missing.length > 8 ? ` (+${missing.length - 8} more)` : '';
    return {
      success: false,
      error: `Cartella(s) not in your deck: ${shown}${extra}. Add them on Bingo Cards first.`,
    };
  }

  const adminCommissionRate = agent.adminCommissionRate ?? 20;
  const { totalPot, prize } = calculateWinnerPrize(config.betAmount, playerCount, commissionRate);
  const { reserveRequired, commission } = calculateWalletReserveRequired(
    config.betAmount,
    playerCount,
    commissionRate,
    adminCommissionRate,
  );
  if (agent.walletBalance < reserveRequired) {
    return {
      success: false,
      error: `Insufficient wallet balance (${agent.walletBalance.toFixed(0)} ETB). Need at least ${reserveRequired.toFixed(0)} ETB to cover game commission (${commission.toFixed(0)} ETB). Winner prize (${prize.toFixed(0)} ETB) is paid in cash at the hall. Ask admin for a TBG recharge code.`,
    };
  }

  const id = uuid();
  const gameCode = generateGameCode();

  if (commission > 0) {
    const reserve = await reserveGameCommission(agentId, commission, gameCode);
    if (!reserve.success) {
      return {
        success: false,
        error: reserve.error ?? `Insufficient wallet balance to reserve game commission (${commission.toFixed(0)} ETB).`,
      };
    }
  }

  try {
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
    commissionReserved: commission,
    status: 'PAUSED',
    selectedNumbers: JSON.stringify(config.selectedNumbers),
    startedAt: now,
    createdAt: now,
    updatedAt: now,
  });

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
  } catch (err) {
    if (commission > 0) {
      await refundGameCommission(agentId, commission, gameCode);
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create game',
    };
  }

  return {
    success: true,
    data: {
      id,
      gameCode,
      betAmount: config.betAmount,
      playerCount,
      status: 'PAUSED',
      totalPot,
      maxBalls: DRAW_BALL_COUNT,
      commissionRate,
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
  const activeTickets = gameCardRows.filter((t) => t.status !== 'CANCELLED');
  const playerCount = gameCardRows.length;
  const activePlayerCount = activeTickets.length;
  const totalPot = calculateTotalPot(game.betAmount, activePlayerCount);
  const commissionRate = game.commissionRate ?? DEFAULT_AGENT_COMMISSION_RATE;
  const { prize } = calculateWinnerPrize(game.betAmount, activePlayerCount, commissionRate);

  const cardIds = gameCardRows.map((gc) => gc.cardId);
  const cards = cardIds.length
    ? await db.select().from(bingoCards).where(inArray(bingoCards.id, cardIds)).all()
    : [];
  const cardMap = new Map(cards.map((c) => [c.id, c]));
  const bannedCartellas = gameCardRows
    .filter((t) => t.status === 'CANCELLED')
    .map((t) => cardMap.get(t.cardId)?.cardNumber)
    .filter((n): n is string => !!n);

  return {
    id: game.id,
    gameCode: game.gameCode,
    betAmount: game.betAmount,
    status: game.status,
    winningPattern: game.winningPattern,
    drawSpeedMs: game.drawSpeedMs,
    voiceType: game.voiceType,
    language: game.language,
    commissionRate,
    selectedNumbers: game.selectedNumbers ? JSON.parse(game.selectedNumbers) : [],
    drawnNumbers: drawn.map((d) => d.number),
    callHistory: drawn.map((d) => ({
      number: d.number,
      drawOrder: d.drawOrder,
      drawnAt: d.drawnAt,
    })),
    totalPot,
    prize,
    playerCount: activePlayerCount,
    maxBalls: game.numberRangeMax,
    drawCount: drawn.length,
    startedAt: game.startedAt ?? game.createdAt,
    winners: await loadGameWinners(game.id),
    bannedCartellas,
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

  const winnerRows = await db.select().from(winners).where(eq(winners.gameId, gameId)).all();
  if (winnerRows.length > 0) {
    return { success: false, error: 'Winner declared — end the game before drawing more numbers' };
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

  const winnerRows = await db.select().from(winners).where(eq(winners.gameId, gameId)).all();
  if (winnerRows.length > 0) {
    return { success: false, error: 'Winner declared — press End Game to finish' };
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

  const { card, ticket, verification, pattern, existing, calledNumbers } = await verifyTicketForGame(game, agentId, cardNumber);
  const grid = card ? parseCardData(card.cardData) : null;

  if (!verification.valid) {
    let banned = false;
    if (card && ticket && ticket.status !== 'CANCELLED' && verification.message.includes('do not match')) {
      await db.update(gameCards).set({ status: 'CANCELLED' }).where(eq(gameCards.id, ticket.id));
      banned = true;
    }
    return {
      success: true,
      valid: false,
      message: banned
        ? `Cartella #${cardNumber} eliminated — false BINGO claim. Player banned and cartella locked for this game.`
        : `Cartella #${cardNumber}: ${verification.message}`,
      cardNumber,
      calledNumbers,
      grid,
      verificationResult: 'INVALID',
      banned,
      eliminated: banned,
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

  if (existing.length > 0) {
    const existingCard = existing[0];
    const existingCardRow = await db.select().from(bingoCards).where(eq(bingoCards.id, existingCard.cardId)).get();
    return {
      success: true,
      valid: false,
      message: `Winner already declared (cartella #${existingCardRow?.cardNumber ?? '?'}). End the game to finish.`,
      cardNumber,
      calledNumbers,
      grid,
      verificationResult: 'INVALID',
    };
  }

  const now = Math.floor(Date.now() / 1000);
  const drawn = await db.select().from(drawnNumbers).where(eq(drawnNumbers.gameId, gameId)).all();
  const drawOrder = drawn.length;
  const triggeringNumber = drawn[drawOrder - 1]?.number ?? 0;

  const gameCardRows = await db.select().from(gameCards).where(eq(gameCards.gameId, gameId)).all();
  const activeCount = gameCardRows.filter((t) => t.status !== 'CANCELLED').length;
  const agent = await db.select().from(agents).where(eq(agents.id, agentId)).get();
  const commissionRate = game.commissionRate ?? agent?.commissionRate ?? DEFAULT_AGENT_COMMISSION_RATE;
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
  if (game.status === 'COMPLETED') return { success: false, error: 'Game already ended' };

  const existingRevenue = await db.select().from(gameRevenue).where(eq(gameRevenue.gameId, gameId)).get();
  if (existingRevenue) return { success: false, error: 'Game already settled' };

  const agent = await db.select().from(agents).where(eq(agents.id, agentId)).get();
  const agentCommissionRate = game.commissionRate ?? agent?.commissionRate ?? DEFAULT_AGENT_COMMISSION_RATE;
  const adminCommissionRate = agent?.adminCommissionRate ?? 20;

  const gameCardRows = await db.select().from(gameCards).where(eq(gameCards.gameId, gameId)).all();
  const totalJoinedPlayers = gameCardRows.length;
  const activePlayerCount = gameCardRows.filter((t) => t.status !== 'CANCELLED').length;
  const gameWinners = await db.select().from(winners).where(eq(winners.gameId, gameId)).all();
  const totalPayouts = gameWinners.reduce((s, w) => s + w.prizeAmount, 0);
  const hasWinner = gameWinners.length > 0;

  const settlement = summarizeGameSettlement({
    betAmount: game.betAmount,
    totalJoinedPlayers,
    activePlayerCount,
    agentCommissionRate,
    adminCommissionRate,
    hasWinner,
    totalPayouts,
  });

  const reservedCommission = game.commissionReserved ?? calculateWinnerPrize(
    game.betAmount,
    totalJoinedPlayers,
    agentCommissionRate,
  ).commission;

  if (reservedCommission > 0) {
    if (hasWinner) {
      const actualDue = settlement.walletCommissionDue;
      if (actualDue < reservedCommission) {
        const refund = await refundGameCommission(agentId, reservedCommission - actualDue, game.gameCode);
        if (!refund.success) {
          return { success: false, error: refund.error ?? 'Could not adjust reserved commission' };
        }
      } else if (actualDue > reservedCommission) {
        const extra = await deductGameCommission(agentId, actualDue - reservedCommission, game.gameCode);
        if (!extra.success) {
          return {
            success: false,
            error: extra.error ?? `Insufficient balance for game commission (${actualDue.toFixed(0)} ETB)`,
          };
        }
      }
      if (settlement.platformRevenue > 0) {
        await creditOperatorWallet(
          settlement.platformRevenue,
          `Admin share from game ${game.gameCode}`,
          'game_commission',
          gameId,
        );
      }
    } else {
      // No winner — commission stays deducted (reserved at game create). Credit admin share only.
      const joinEconomics = calculateGameEconomics(
        game.betAmount,
        totalJoinedPlayers,
        agentCommissionRate,
        adminCommissionRate,
      );
      if (joinEconomics.adminCut > 0) {
        await creditOperatorWallet(
          joinEconomics.adminCut,
          `Admin share from game ${game.gameCode}`,
          'game_commission',
          gameId,
        );
      }
    }
  } else if (hasWinner && settlement.walletCommissionDue > 0) {
    const commissionDebit = await deductGameCommission(agentId, settlement.walletCommissionDue, game.gameCode);
    if (!commissionDebit.success) {
      return {
        success: false,
        error: commissionDebit.error ?? `Insufficient balance for game commission (${settlement.walletCommissionDue.toFixed(0)} ETB)`,
      };
    }
    if (settlement.platformRevenue > 0) {
      await creditOperatorWallet(
        settlement.platformRevenue,
        `Admin share from game ${game.gameCode}`,
        'game_commission',
        gameId,
      );
    }
  }

  await db.update(games).set({ status: 'COMPLETED', completedAt: now, updatedAt: now })
    .where(eq(games.id, gameId));

  await db.insert(gameRevenue).values({
    id: uuid(),
    gameId,
    totalPlayers: settlement.totalPlayers,
    totalBets: settlement.totalBets,
    totalPayouts,
    platformRevenue: settlement.platformRevenue,
    agentRevenue: settlement.agentRevenue,
    commissionRevenue: settlement.commissionRevenue,
    calculatedAt: now,
  });

  return {
    success: true,
    data: {
      totalBets: settlement.totalBets,
      agentRevenue: Math.max(0, settlement.agentRevenue),
      totalPayouts,
      commissionRevenue: settlement.commissionRevenue,
      platformRevenue: settlement.platformRevenue,
      agentCommissionRate,
      adminCommissionRate,
      hasWinner,
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
      commissionPercent: game.commissionRate ?? DEFAULT_AGENT_COMMISSION_RATE,
      profit: revenue?.agentRevenue ?? 0,
      status: game.status,
    });
  }
  return results;
}
