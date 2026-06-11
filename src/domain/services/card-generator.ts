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
