/** Total stake = players × bet per cartella */
export function calculateTotalPot(betAmount: number, playerCount: number): number {
  return betAmount * playerCount;
}

/** Agent commission deducted from pot before winner is paid */
export function calculateWinnerPrize(
  betAmount: number,
  playerCount: number,
  agentCommissionRate: number,
): { totalPot: number; commission: number; prize: number } {
  const totalPot = calculateTotalPot(betAmount, playerCount);
  const commission = totalPot * (agentCommissionRate / 100);
  const prize = totalPot - commission;
  return { totalPot, commission, prize };
}

/** Full split: agent commission from pot, then admin share from agent commission */
export function calculateGameEconomics(
  betAmount: number,
  playerCount: number,
  agentCommissionRate: number,
  adminCommissionRate: number,
) {
  const { totalPot, commission: agentGrossCommission, prize } = calculateWinnerPrize(
    betAmount,
    playerCount,
    agentCommissionRate,
  );
  const adminCut = agentGrossCommission * (adminCommissionRate / 100);
  const agentNetCommission = agentGrossCommission - adminCut;
  return {
    totalPot,
    prize,
    agentGrossCommission,
    adminCut,
    agentNetCommission,
  };
}

/** TBG wallet must cover prize payout plus admin share debit on a winning game */
export function calculateWalletReserveRequired(
  betAmount: number,
  playerCount: number,
  agentCommissionRate: number,
  adminCommissionRate: number,
) {
  const economics = calculateGameEconomics(
    betAmount,
    playerCount,
    agentCommissionRate,
    adminCommissionRate,
  );
  return {
    prize: economics.prize,
    adminCut: economics.adminCut,
    reserveRequired: economics.prize + economics.adminCut,
  };
}

export interface GameSettlementInput {
  betAmount: number;
  /** Every cartella that joined and paid at game start */
  totalJoinedPlayers: number;
  /** Non-cancelled cartellas — used for prize pool math */
  activePlayerCount: number;
  agentCommissionRate: number;
  adminCommissionRate: number;
  hasWinner: boolean;
  totalPayouts: number;
}

export interface GameSettlement {
  totalBets: number;
  /** Active players in prize pool */
  totalPlayers: number;
  totalJoinedPlayers: number;
  /** Cash from eliminated (false BINGO) cartellas kept by agent */
  forfeitedStakes: number;
  economics: ReturnType<typeof calculateGameEconomics>;
  platformRevenue: number;
  agentRevenue: number;
  commissionRevenue: number;
  walletAdminCutDue: number;
}

/** Single source of truth for end-of-game profit and revenue rows */
export function summarizeGameSettlement(input: GameSettlementInput): GameSettlement {
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
      totalPlayers: activePlayerCount,
      totalJoinedPlayers,
      forfeitedStakes,
      economics,
      platformRevenue: economics.adminCut,
      agentRevenue: economics.agentNetCommission + forfeitedStakes,
      commissionRevenue: economics.agentGrossCommission,
      walletAdminCutDue: economics.adminCut,
    };
  }

  return {
    totalBets,
    totalPlayers: activePlayerCount,
    totalJoinedPlayers,
    forfeitedStakes: 0,
    economics,
    platformRevenue: 0,
    agentRevenue: totalBets,
    commissionRevenue: 0,
    walletAdminCutDue: 0,
  };
}
