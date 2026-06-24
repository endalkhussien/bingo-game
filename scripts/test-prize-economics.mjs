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
    commission: economics.agentGrossCommission,
    adminCut: economics.adminCut,
    reserveRequired: economics.agentGrossCommission,
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
      agentRevenue: economics.agentGrossCommission + forfeitedStakes,
      walletCommissionDue: economics.agentGrossCommission,
    };
  }

  return {
    totalBets,
    forfeitedStakes: 0,
    economics,
    platformRevenue: 0,
    agentRevenue: totalBets,
    walletCommissionDue: 0,
  };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// User example: 10 players × 10 ETB, 10% commission
const userExample = calculateGameEconomics(10, 10, 10, 0);
assert(userExample.totalPot === 100, 'pot is 100');
assert(userExample.prize === 90, 'winner gets 90');
assert(userExample.agentGrossCommission === 10, 'commission is 10');
assert(userExample.agentNetCommission === 10, 'agent profit is 10 when admin share is 0');

const userReserve = calculateWalletReserveRequired(10, 10, 10, 0);
assert(userReserve.reserveRequired === 10, 'wallet reserve is commission only (10)');
assert(userReserve.prize === 90, 'prize still calculated as 90 for display');

const userEnd = summarizeGameSettlement({
  betAmount: 10,
  totalJoinedPlayers: 10,
  activePlayerCount: 10,
  agentCommissionRate: 10,
  adminCommissionRate: 0,
  hasWinner: true,
});
assert(userEnd.walletCommissionDue === 10, 'wallet decreases by 10 on completed game');
assert(userEnd.agentRevenue === 10, 'agent cash profit is 10');

const withAdmin = summarizeGameSettlement({
  betAmount: 10,
  totalJoinedPlayers: 10,
  activePlayerCount: 10,
  agentCommissionRate: 10,
  adminCommissionRate: 20,
  hasWinner: true,
});
assert(withAdmin.walletCommissionDue === 10, 'wallet still debits full commission (10)');
assert(withAdmin.platformRevenue === 2, 'admin gets 2 from commission');
assert(withAdmin.agentRevenue === 10, 'agent profit shown as gross commission (10)');

const hallExample = calculateGameEconomics(10, 4, 10, 0);
assert(hallExample.totalPot === 40, 'pot is 40');
assert(hallExample.prize === 36, 'winner gets 36');
assert(hallExample.agentGrossCommission === 4, 'commission is 4');
assert(calculateWalletReserveRequired(10, 4, 10, 0).reserveRequired === 4, 'wallet reserve is 4');

const noWinner = summarizeGameSettlement({
  betAmount: 10,
  totalJoinedPlayers: 8,
  activePlayerCount: 8,
  agentCommissionRate: 20,
  adminCommissionRate: 20,
  hasWinner: false,
});
assert(noWinner.agentRevenue === 80, 'no-winner profit is full pot');
assert(noWinner.walletCommissionDue === 0, 'no wallet debit when no winner');

function calculateMaxAffordablePlayers(walletBalance, betAmount, agentCommissionRate, maxPlayers = 150) {
  if (walletBalance <= 0 || betAmount <= 0) return 0;
  if (agentCommissionRate <= 0) return maxPlayers;
  const commissionPerPlayer = betAmount * (agentCommissionRate / 100);
  if (commissionPerPlayer <= 0) return maxPlayers;
  return Math.min(maxPlayers, Math.floor(walletBalance / commissionPerPlayer));
}

assert(calculateMaxAffordablePlayers(10, 10, 10) === 10, '10 ETB covers 10 players at 10% of 10 ETB bet');
assert(calculateMaxAffordablePlayers(5, 10, 10) === 5, '5 ETB covers 5 players');
assert(calculateMaxAffordablePlayers(0, 10, 10) === 0, 'zero balance covers nobody');

console.log('Prize economics tests OK');
