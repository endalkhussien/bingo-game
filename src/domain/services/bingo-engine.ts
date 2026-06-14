import { DRAW_BALL_COUNT } from '../../shared/brand';

export { checkWinningPattern, verifyTicketWin, normalizeWinningPattern } from './winner-verification';
export type { TicketVerificationInput, TicketVerificationResult } from './winner-verification';
export { CallingEngine, drawRandomNumber } from './calling-engine';
export type { CallRecord, CallingEngineState } from './calling-engine';

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
