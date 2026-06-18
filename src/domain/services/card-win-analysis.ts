import type { CardGrid } from './card-generator';

function isMarked(grid: CardGrid, row: number, col: number, called: Set<number>): boolean {
  const val = grid[row][col];
  return val === -1 || called.has(val);
}

/** Count completed lines on a cartella (Minch-style check card breakdown). */
export function analyzeCardWins(grid: CardGrid, calledNumbers: number[]): {
  horizontal: number;
  vertical: number;
  diagonal: number;
} {
  const called = new Set(calledNumbers);
  let horizontal = 0;
  for (let r = 0; r < 5; r++) {
    if (Array.from({ length: 5 }, (_, c) => c).every((c) => isMarked(grid, r, c, called))) horizontal++;
  }
  let vertical = 0;
  for (let c = 0; c < 5; c++) {
    if (Array.from({ length: 5 }, (_, r) => r).every((r) => isMarked(grid, r, c, called))) vertical++;
  }
  let diagonal = 0;
  const d1: [number, number][] = [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]];
  const d2: [number, number][] = [[0, 4], [1, 3], [2, 2], [3, 1], [4, 0]];
  if (d1.every(([r, c]) => isMarked(grid, r, c, called))) diagonal++;
  if (d2.every(([r, c]) => isMarked(grid, r, c, called))) diagonal++;
  return { horizontal, vertical, diagonal };
}
