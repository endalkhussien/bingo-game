import { DRAW_BALL_COUNT } from '../../shared/brand';
import type { CardGrid } from './card-generator';

export function drawRandomNumber(alreadyDrawn: number[], max = DRAW_BALL_COUNT): number {
  const available = Array.from({ length: max }, (_, i) => i + 1).filter(
    (n) => !alreadyDrawn.includes(n)
  );
  if (available.length === 0) throw new Error('All numbers have been drawn');
  return available[Math.floor(Math.random() * available.length)];
}

function isMarked(grid: CardGrid, row: number, col: number, drawn: Set<number>): boolean {
  const val = grid[row][col];
  return val === -1 || drawn.has(val);
}

function checkLine(grid: CardGrid, drawn: Set<number>, cells: [number, number][]): boolean {
  return cells.every(([r, c]) => isMarked(grid, r, c, drawn));
}

export function checkWinningPattern(
  grid: CardGrid,
  drawnNumbers: number[],
  pattern: string
): boolean {
  const drawn = new Set(drawnNumbers);

  const rows = Array.from({ length: 5 }, (_, r) =>
    Array.from({ length: 5 }, (_, c) => [r, c] as [number, number])
  );
  const cols = Array.from({ length: 5 }, (_, c) =>
    Array.from({ length: 5 }, (_, r) => [r, c] as [number, number])
  );
  const diag1: [number, number][] = Array.from({ length: 5 }, (_, i) => [i, i]);
  const diag2: [number, number][] = Array.from({ length: 5 }, (_, i) => [i, 4 - i]);
  const allLines = [...rows, ...cols, diag1, diag2];

  switch (pattern) {
    case 'SINGLE_LINE':
      return allLines.some((line) => checkLine(grid, drawn, line));
    case 'DOUBLE_LINE': {
      const matched = allLines.filter((line) => checkLine(grid, drawn, line));
      return matched.length >= 2;
    }
    case 'FOUR_CORNERS':
      return checkLine(grid, drawn, [
        [0, 0], [0, 4], [4, 0], [4, 4],
      ]);
    case 'X_PATTERN':
      return checkLine(grid, drawn, diag1) && checkLine(grid, drawn, diag2);
    case 'FULL_HOUSE':
      return grid.every((row, r) =>
        row.every((_, c) => isMarked(grid, r, c, drawn))
      );
    default:
      return false;
  }
}

export function getBallLabel(number: number): string {
  if (number <= 15) return `B-${number}`;
  if (number <= 30) return `I-${number}`;
  if (number <= 45) return `N-${number}`;
  if (number <= 60) return `G-${number}`;
  if (number <= 75) return `O-${number}`;
  return String(number);
}
