/**
 * Verifies wallet reserve, winner settlement, and no-winner house profit math.
 */

function calculateTotalPot(betAmount, playerCount) {
  return betAmount * playerCount;
}

function calculateWinnerPrize(betAmount, playerCount, agentCommissionRate) {
  const totalPot = calculateTotalPot(betAmount, playerCount);
  const commission = totalPot * (agentCommissionRate / 100);
  const prize = totalPot - commission;
  return { totalPot, commission, prize };
}

function calculateGameEconomics(betAmount, playerCount, agentCommissionRate, adminCommissionRate) {
  const { totalPot, commission: agentGrossCommission, prize } = calculateWinnerPrize(
    betAmount,
    playerCount,
    agentCommissionRate,
  );
  const adminCut = agentGrossCommission * (adminCommissionRate / 100);
  const agentNetCommission = agentGrossCommission - adminCut;
  return { totalPot, prize, agentGrossCommission, adminCut, agentNetCommission };
}

function calculateWalletReserveRequired(betAmount, playerCount, agentCommissionRate, adminCommissionRate) {
  const economics = calculateGameEconomics(betAmount, playerCount, agentCommissionRate, adminCommissionRate);
  return {
    prize: economics.prize,
    adminCut: economics.adminCut,
    reserveRequired: economics.prize + economics.adminCut,
  };
}

function summarizeGameSettlement(input) {
  const {
    betAmount,
    totalJoinedPlayers,
    activePlayerCount,
    agentCommissionRate,
    adminCommissionRate,
    hasWinner,
  } = input;

  const totalBets = betAmount * totalJoinedPlayers;
  const forfeitedStakes = betAmount * Math.max(0, totalJoinedPlayers - activePlayerCount);
  const economics = calculateGameEconomics(
    betAmount,
    activePlayerCount,
    agentCommissionRate,
    adminCommissionRate,
  );

  if (hasWinner) {
    return {
      totalBets,
      forfeitedStakes,
      economics,
      platformRevenue: economics.adminCut,
      agentRevenue: economics.agentNetCommission + forfeitedStakes,
      walletAdminCutDue: economics.adminCut,
    };
  }

  return {
    totalBets,
    forfeitedStakes: 0,
    economics,
    platformRevenue: 0,
    agentRevenue: totalBets,
    walletAdminCutDue: 0,
  };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const reserve = calculateWalletReserveRequired(10, 10, 20, 20);
assert(reserve.prize === 80, `prize expected 80, got ${reserve.prize}`);
assert(reserve.adminCut === 4, `adminCut expected 4, got ${reserve.adminCut}`);
assert(reserve.reserveRequired === 84, `reserve expected 84, got ${reserve.reserveRequired}`);

const winSettlement = summarizeGameSettlement({
  betAmount: 10,
  totalJoinedPlayers: 10,
  activePlayerCount: 10,
  agentCommissionRate: 20,
  adminCommissionRate: 20,
  hasWinner: true,
});
assert(winSettlement.agentRevenue === 16, `agent net profit expected 16, got ${winSettlement.agentRevenue}`);
assert(winSettlement.platformRevenue === 4, `platform expected 4, got ${winSettlement.platformRevenue}`);

const winWithBan = summarizeGameSettlement({
  betAmount: 10,
  totalJoinedPlayers: 10,
  activePlayerCount: 9,
  agentCommissionRate: 20,
  adminCommissionRate: 20,
  hasWinner: true,
});
assert(winWithBan.forfeitedStakes === 10, 'forfeited stake from banned cartella');
assert(
  winWithBan.agentRevenue === winWithBan.economics.agentNetCommission + 10,
  'agent keeps net commission plus forfeited stake',
);

const noWinner = summarizeGameSettlement({
  betAmount: 10,
  totalJoinedPlayers: 8,
  activePlayerCount: 8,
  agentCommissionRate: 20,
  adminCommissionRate: 20,
  hasWinner: false,
});
assert(noWinner.agentRevenue === 80, `no-winner profit expected 80, got ${noWinner.agentRevenue}`);
assert(noWinner.platformRevenue === 0, 'no admin cut when no winner');

console.log('Prize economics tests OK');
