'use client';

import { BINGO_COLUMNS, BINGO_COLUMN_COLORS } from '@/shared/constants';
import { Star } from 'lucide-react';
import { cn } from '@/presentation/lib/utils';

interface BingoCardVerifyViewProps {
  cardNumber: string;
  grid: number[][];
  calledNumbers: number[];
  compact?: boolean;
}

export function BingoCardVerifyView({
  cardNumber,
  grid,
  calledNumbers,
  compact,
}: BingoCardVerifyViewProps) {
  const called = new Set(calledNumbers);

  return (
    <div className={cn('rounded-xl bg-slate-800 p-3 shadow-lg', compact ? '' : 'w-full')}>
      <h3 className="mb-2 text-center text-sm font-semibold text-white">Cartella #{cardNumber}</h3>
      <p className="mb-2 text-center text-xs text-slate-300">
        Green = called · {calledNumbers.length} balls drawn
      </p>
      <div className="overflow-hidden rounded-lg">
        <div className="grid grid-cols-5 gap-px bg-slate-600">
          {BINGO_COLUMNS.map((col) => (
            <div key={col} className={cn(BINGO_COLUMN_COLORS[col], 'py-1 text-center text-xs font-bold text-white')}>
              {col}
            </div>
          ))}
          {grid.map((row, ri) =>
            row.map((cell, ci) => {
              const isFree = cell === -1;
              const isCalled = isFree || called.has(cell);
              return (
                <div
                  key={`${ri}-${ci}`}
                  className={cn(
                    'flex h-8 items-center justify-center text-xs font-bold',
                    isCalled ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-700',
                  )}
                >
                  {isFree ? <Star className="h-3 w-3 fill-white text-white" /> : cell}
                </div>
              );
            }),
          )}
        </div>
      </div>
    </div>
  );
}
