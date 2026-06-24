import { CARTELLA_MAX } from './constants';

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

/** TBG wallet must cover the game commission debit (winner is paid in cash at the hall) */
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
    commission: economics.agentGrossCommission,
    adminCut: economics.adminCut,
    reserveRequired: economics.agentGrossCommission,
  };
}

/** Max cartellas this wallet can cover at the chosen bet and commission rate. */
export function calculateMaxAffordablePlayers(
  walletBalance: number,
  betAmount: number,
  agentCommissionRate: number,
  maxPlayers = CARTELLA_MAX,
): number {
  if (walletBalance <= 0 || betAmount <= 0) return 0;
  if (agentCommissionRate <= 0) return maxPlayers;
  const commissionPerPlayer = betAmount * (agentCommissionRate / 100);
  if (commissionPerPlayer <= 0) return maxPlayers;
  return Math.min(maxPlayers, Math.floor(walletBalance / commissionPerPlayer));
}

export function canAffordGamePlayers(
  walletBalance: number,
  betAmount: number,
  playerCount: number,
  agentCommissionRate: number,
): boolean {
  if (walletBalance <= 0 || playerCount <= 0) return false;
  const { reserveRequired } = calculateWalletReserveRequired(
    betAmount,
    playerCount,
    agentCommissionRate,
    0,
  );
  return walletBalance >= reserveRequired;
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
  /** Debited from TBG wallet when a winner is validated and game ends */
  walletCommissionDue: number;
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
      agentRevenue: economics.agentGrossCommission + forfeitedStakes,
      commissionRevenue: economics.agentGrossCommission,
      walletCommissionDue: economics.agentGrossCommission,
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
    walletCommissionDue: 0,
  };
}
