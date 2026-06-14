'use client';

import { BINGO_COLUMNS, BINGO_COLUMN_COLORS } from '@/shared/constants';
import { Star } from 'lucide-react';

interface BingoCardViewProps {
  cardNumber: string;
  grid: number[][];
  onUpdate?: () => void;
  onDelete?: () => void;
  compact?: boolean;
}

export function BingoCardView({ cardNumber, grid, onUpdate, onDelete, compact }: BingoCardViewProps) {
  return (
    <div className={`rounded-xl bg-gray-700 p-3 shadow-lg ${compact ? '' : 'w-full max-w-xs'}`}>
      <h3 className="mb-2 text-center text-sm font-semibold text-white">Card #{cardNumber}</h3>
      <div className="overflow-hidden rounded-lg">
        <div className="grid grid-cols-5 gap-px bg-gray-600">
          {BINGO_COLUMNS.map((col) => (
            <div key={col} className={`${BINGO_COLUMN_COLORS[col]} py-1 text-center text-xs font-bold text-white`}>
              {col}
            </div>
          ))}
          {grid.map((row, ri) =>
            row.map((cell, ci) => (
              <div key={`${ri}-${ci}`}
                className="flex h-8 items-center justify-center bg-gray-200 text-xs font-semibold text-gray-800">
                {cell === -1 ? <Star className="h-3 w-3 fill-white text-white" /> : cell}
              </div>
            ))
          )}
        </div>
      </div>
      {(onUpdate || onDelete) && (
        <div className="mt-3 flex gap-2">
          {onUpdate && (
            <button onClick={onUpdate}
              className="flex-1 rounded-md bg-yellow-500 py-1.5 text-xs font-semibold text-white hover:bg-yellow-600">
              Shuffle
            </button>
          )}
        </div>
      )}
    </div>
  );
}
