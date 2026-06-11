import { eq } from 'drizzle-orm';
import { getDb } from './database-service';
import { games, gameRevenue, agents, users, rechargeRequests, walletTransactions } from '../../src/infrastructure/database/schema';

export async function getRevenueReport(filters?: { agentId?: string; startDate?: number; endDate?: number }) {
  const db = getDb();
  const revenues = await db.select().from(gameRevenue).all();
  const result = [];
  for (const rev of revenues) {
    const game = await db.select().from(games).where(eq(games.id, rev.gameId)).get();
    if (!game) continue;
    if (filters?.agentId && game.agentId !== filters.agentId) continue;
    if (filters?.startDate && game.createdAt < filters.startDate) continue;
    if (filters?.endDate && game.createdAt > filters.endDate) continue;
    const agent = await db.select().from(agents).where(eq(agents.id, game.agentId)).get();
    const user = agent ? await db.select().from(users).where(eq(users.id, agent.userId)).get() : null;
    result.push({
      gameCode: game.gameCode, date: game.createdAt, agentName: user?.fullName ?? '',
      totalBets: rev.totalBets, platformRevenue: rev.platformRevenue,
      agentRevenue: rev.agentRevenue, totalPayouts: rev.totalPayouts,
    });
  }
  return result.sort((a, b) => b.date - a.date);
}

export async function getProfitReport(filters?: { agentId?: string }) {
  const revenue = await getRevenueReport(filters);
  return revenue.map((r) => ({
    ...r, profit: r.platformRevenue,
  }));
}

export async function getAgentPerformanceReport() {
  const db = getDb();
  const allAgents = await db.select().from(agents).all();
  const result = [];
  for (const agent of allAgents) {
    const user = await db.select().from(users).where(eq(users.id, agent.userId)).get();
    const agentGames = await db.select().from(games).where(eq(games.agentId, agent.id)).all();
    let revenue = 0, profit = 0;
    for (const g of agentGames) {
      const rev = await db.select().from(gameRevenue).where(eq(gameRevenue.gameId, g.id)).get();
      if (rev) { revenue += rev.totalBets; profit += rev.agentRevenue; }
    }
    result.push({
      agentName: user?.fullName ?? '', username: user?.username ?? '',
      totalGames: agentGames.length, totalRevenue: revenue, totalProfit: profit,
      walletBalance: agent.walletBalance, status: agent.status,
    });
  }
  return result;
}

export async function getRechargeReport() {
  const db = getDb();
  const requests = await db.select().from(rechargeRequests).all();
  const result = [];
  for (const req of requests) {
    const agent = await db.select().from(agents).where(eq(agents.id, req.agentId)).get();
    const user = agent ? await db.select().from(users).where(eq(users.id, agent.userId)).get() : null;
    result.push({ ...req, agentName: user?.fullName ?? '' });
  }
  return result.sort((a, b) => b.requestedAt - a.requestedAt);
}

export async function getGameHistoryReport(filters?: { agentId?: string; status?: string }) {
  const db = getDb();
  let allGames = await db.select().from(games).all();
  if (filters?.agentId) allGames = allGames.filter((g) => g.agentId === filters.agentId);
  if (filters?.status && filters.status !== 'ALL') allGames = allGames.filter((g) => g.status === filters.status);

  const result = [];
  for (const game of allGames) {
    const agent = await db.select().from(agents).where(eq(agents.id, game.agentId)).get();
    const user = agent ? await db.select().from(users).where(eq(users.id, agent.userId)).get() : null;
    const rev = await db.select().from(gameRevenue).where(eq(gameRevenue.gameId, game.id)).get();
    result.push({
      gameCode: game.gameCode, gameName: game.gameName, agentName: user?.fullName ?? '',
      betAmount: game.betAmount, status: game.status, date: game.createdAt,
      profit: rev?.agentRevenue ?? 0, totalBets: rev?.totalBets ?? 0,
    });
  }
  return result.sort((a, b) => b.date - a.date);
}

export async function getAgentWalletHistory(agentId: string) {
  const db = getDb();
  return db.select().from(walletTransactions).where(eq(walletTransactions.agentId, agentId)).all();
}
