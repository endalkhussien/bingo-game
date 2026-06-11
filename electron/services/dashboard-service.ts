import { eq } from 'drizzle-orm';
import { getDb } from './database-service';
import { agents, games, gameRevenue, rechargeRequests } from '../../src/infrastructure/database/schema';

export async function getAdminDashboard() {
  const db = getDb();
  const allAgents = await db.select().from(agents).all();
  const activeAgents = allAgents.filter((a) => a.status === 'ACTIVE');
  const totalWallet = allAgents.reduce((s, a) => s + a.walletBalance, 0);
  const allGames = await db.select().from(games).all();
  const runningGames = allGames.filter((g) => g.status === 'RUNNING');
  const pendingRecharges = (await db.select().from(rechargeRequests).where(eq(rechargeRequests.status, 'PENDING')).all()).length;

  let totalRevenue = 0;
  let totalProfit = 0;
  const revenues = await db.select().from(gameRevenue).all();
  for (const r of revenues) {
    totalRevenue += r.totalBets;
    totalProfit += r.platformRevenue;
  }

  // Last 7 days revenue trend
  const now = Math.floor(Date.now() / 1000);
  const trend = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = now - i * 86400;
    const dayEnd = dayStart + 86400;
    let dayRev = 0;
    for (const r of revenues) {
      if (r.calculatedAt >= dayStart - 86400 * i && r.calculatedAt < dayEnd - 86400 * i) {
        dayRev += r.totalBets;
      }
    }
    const date = new Date((now - i * 86400) * 1000);
    trend.push({ date: date.toLocaleDateString('en', { weekday: 'short' }), revenue: dayRev });
  }

  return {
    totalAgents: allAgents.length,
    activeAgents: activeAgents.length,
    totalWalletBalance: totalWallet,
    totalRevenue,
    totalProfit,
    runningGames: runningGames.length,
    pendingRecharges,
    revenueTrend: trend,
  };
}

export async function getAgentDashboard(agentId: string) {
  const db = getDb();
  const agent = await db.select().from(agents).where(eq(agents.id, agentId)).get();
  const agentGames = await db.select().from(games).where(eq(games.agentId, agentId)).all();
  const running = agentGames.filter((g) => g.status === 'RUNNING');

  let totalRevenue = 0;
  let totalProfit = 0;
  for (const g of agentGames) {
    const rev = await db.select().from(gameRevenue).where(eq(gameRevenue.gameId, g.id)).get();
    if (rev) { totalRevenue += rev.totalBets; totalProfit += rev.agentRevenue; }
  }

  return {
    walletBalance: agent?.walletBalance ?? 0,
    activeGames: running.length,
    totalGames: agentGames.length,
    totalRevenue,
    totalProfit,
    commissionRate: agent?.commissionRate ?? 20,
  };
}
