import { COLUMN_RANGES } from '../../shared/constants';

export type CardGrid = number[][];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickFromRange(min: number, max: number, count: number): number[] {
  const pool = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return shuffle(pool).slice(0, count).sort((a, b) => a - b);
}

export function generateBingoCard(): CardGrid {
  const columns = ['B', 'I', 'N', 'G', 'O'] as const;
  const grid: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));

  columns.forEach((col, colIdx) => {
    const [min, max] = COLUMN_RANGES[col];
    const nums = pickFromRange(min, max, col === 'N' ? 4 : 5);
    let numIdx = 0;
    for (let row = 0; row < 5; row++) {
      if (col === 'N' && row === 2) {
        grid[row][colIdx] = -1; // FREE
      } else {
        grid[row][colIdx] = nums[numIdx++];
      }
    }
  });

  return grid;
}

export function generateBulkCards(count: number): CardGrid[] {
  return Array.from({ length: count }, () => generateBingoCard());
}

export function parseCardData(json: string): CardGrid {
  const data = JSON.parse(json);
  return data.grid as CardGrid;
}

export function serializeCardData(grid: CardGrid): string {
  return JSON.stringify({ grid, freeCell: { row: 2, col: 2 } });
}

const BINGO_COL_KEYS = ['B', 'I', 'N', 'G', 'O'] as const;

/** Verify B-I-N-G-O column ranges, free center, and no duplicates per column. */
export function isValidBingoGrid(grid: CardGrid): boolean {
  if (!grid || grid.length !== 5 || grid.some((row) => row.length !== 5)) return false;

  for (let colIdx = 0; colIdx < 5; colIdx++) {
    const col = BINGO_COL_KEYS[colIdx];
    const [min, max] = COLUMN_RANGES[col];
    const seen = new Set<number>();
    for (let row = 0; row < 5; row++) {
      if (col === 'N' && row === 2) {
        if (grid[row][colIdx] !== -1) return false;
        continue;
      }
      const value = grid[row][colIdx];
      if (typeof value !== 'number' || value < min || value > max) return false;
      if (seen.has(value)) return false;
      seen.add(value);
    }
  }
  return true;
}

export function validateBingoGrid(grid: CardGrid): string | null {
  if (!grid || grid.length !== 5 || grid.some((row) => row.length !== 5)) {
    return 'Card must be a 5×5 grid.';
  }

  for (let colIdx = 0; colIdx < 5; colIdx++) {
    const col = BINGO_COL_KEYS[colIdx];
    const [min, max] = COLUMN_RANGES[col];
    const seen = new Set<number>();
    for (let row = 0; row < 5; row++) {
      if (col === 'N' && row === 2) {
        if (grid[row][colIdx] !== -1) return 'Center cell must be Free.';
        continue;
      }
      const value = grid[row][colIdx];
      if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
        return `${col} column: use numbers ${min}–${max} only (row ${row + 1}).`;
      }
      if (seen.has(value)) return `${col} column: number ${value} is used twice.`;
      seen.add(value);
    }
  }
  return null;
}
