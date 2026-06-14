import { DRAW_BALL_COUNT } from '../../shared/brand';

export { checkWinningPattern, verifyTicketWin, normalizeWinningPattern } from './winner-verification';
export type { TicketVerificationInput, TicketVerificationResult } from './winner-verification';

export function drawRandomNumber(alreadyDrawn: number[], max = DRAW_BALL_COUNT): number {
  const available = Array.from({ length: max }, (_, i) => i + 1).filter(
    (n) => !alreadyDrawn.includes(n)
  );
  if (available.length === 0) throw new Error('All numbers have been drawn');
  return available[Math.floor(Math.random() * available.length)];
}

export function getBallLabel(number: number): string {
  if (number <= 15) return `B-${number}`;
  if (number <= 30) return `I-${number}`;
  if (number <= 45) return `N-${number}`;
  if (number <= 60) return `G-${number}`;
  if (number <= 75) return `O-${number}`;
  return String(number);
}

export function getBallLetter(number: number): string {
  const label = getBallLabel(number);
  return label.includes('-') ? label.split('-')[0] : '';
}
