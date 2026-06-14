import type { CardGrid } from './card-generator';

/** Map UI / legacy pattern names to canonical rules */
export function normalizeWinningPattern(pattern: string): string {
  const map: Record<string, string> = {
    SINGLE_LINE: 'FIRST_LINE',
    DOUBLE_LINE: 'TWO_LINES',
    FIRST_LINE: 'FIRST_LINE',
    TWO_LINES: 'TWO_LINES',
    FULL_HOUSE: 'FULL_HOUSE',
    EARLY_JACKPOT: 'EARLY_JACKPOT',
    FOUR_CORNERS: 'FOUR_CORNERS',
    X_PATTERN: 'X_PATTERN',
  };
  return map[pattern] ?? pattern;
}

export function getTicketNumbers(grid: CardGrid): number[] {
  return grid.flat().filter((n) => n !== -1);
}

function isMarked(grid: CardGrid, row: number, col: number, called: Set<number>): boolean {
  const val = grid[row][col];
  return val === -1 || called.has(val);
}

function isRowComplete(grid: CardGrid, row: number, called: Set<number>): boolean {
  return grid[row].every((_, col) => isMarked(grid, row, col, called));
}

function countCompletedRows(grid: CardGrid, called: Set<number>): number {
  return Array.from({ length: 5 }, (_, row) => row).filter((row) => isRowComplete(grid, row, called)).length;
}

function isFullHouse(grid: CardGrid, called: Set<number>): boolean {
  return getTicketNumbers(grid).every((n) => called.has(n));
}

function checkLine(grid: CardGrid, drawn: Set<number>, cells: [number, number][]): boolean {
  return cells.every(([r, c]) => isMarked(grid, r, c, drawn));
}

/**
 * Returns true when the ticket satisfies the configured winning pattern
 * against all numbers already called in the active game.
 */
export function checkWinningPattern(
  grid: CardGrid,
  calledNumbers: number[],
  pattern: string,
  jackpotMaximumCalls = 45,
): boolean {
  const called = new Set(calledNumbers);
  const p = normalizeWinningPattern(pattern);

  switch (p) {
    case 'FIRST_LINE':
      return countCompletedRows(grid, called) >= 1;

    case 'TWO_LINES':
      return countCompletedRows(grid, called) >= 2;

    case 'FULL_HOUSE':
      return isFullHouse(grid, called);

    case 'EARLY_JACKPOT':
      return isFullHouse(grid, called) && calledNumbers.length <= jackpotMaximumCalls;

    case 'FOUR_CORNERS':
      return checkLine(grid, called, [[0, 0], [0, 4], [4, 0], [4, 4]]);

    case 'X_PATTERN': {
      const diag1: [number, number][] = Array.from({ length: 5 }, (_, i) => [i, i]);
      const diag2: [number, number][] = Array.from({ length: 5 }, (_, i) => [i, 4 - i]);
      return checkLine(grid, called, diag1) && checkLine(grid, called, diag2);
    }

    default:
      return false;
  }
}

export interface TicketVerificationInput {
  ticketExists: boolean;
  ticketInGame: boolean;
  ticketCancelled: boolean;
  alreadyWonSamePattern: boolean;
  grid: CardGrid | null;
  calledNumbers: number[];
  winningPattern: string;
  jackpotMaximumCalls?: number;
}

export interface TicketVerificationResult {
  valid: boolean;
  message: string;
  pattern?: string;
}

/** Step-by-step ticket verification for manual claims and auto-scan */
export function verifyTicketWin(input: TicketVerificationInput): TicketVerificationResult {
  if (!input.ticketExists) {
    return { valid: false, message: 'This cartella does not exist.' };
  }
  if (!input.ticketInGame) {
    return { valid: false, message: 'This cartella is not in the current game.' };
  }
  if (input.ticketCancelled) {
    return { valid: false, message: 'This cartella is cancelled.' };
  }
  if (input.alreadyWonSamePattern) {
    return { valid: false, message: 'This cartella already won this prize.' };
  }
  if (!input.grid) {
    return { valid: false, message: 'Ticket data is missing.' };
  }

  const pattern = normalizeWinningPattern(input.winningPattern);
  const valid = checkWinningPattern(
    input.grid,
    input.calledNumbers,
    pattern,
    input.jackpotMaximumCalls,
  );

  if (!valid) {
    return {
      valid: false,
      message: 'Ticket numbers do not match a winning pattern for the balls called so far.',
      pattern,
    };
  }

  return {
    valid: true,
    message: 'Valid winner.',
    pattern,
  };
}
