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
