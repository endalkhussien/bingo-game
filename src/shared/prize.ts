/** Total stake = players × bet per cartella */
export function calculateTotalPot(betAmount: number, playerCount: number): number {
  return betAmount * playerCount;
}

/** Winner payout after commission is deducted from the pot */
export function calculateWinnerPrize(
  betAmount: number,
  playerCount: number,
  commissionRate: number,
): { totalPot: number; commission: number; prize: number } {
  const totalPot = calculateTotalPot(betAmount, playerCount);
  const commission = totalPot * (commissionRate / 100);
  const prize = totalPot - commission;
  return { totalPot, commission, prize };
}
