'use client';

import { BINGO_COLUMNS } from '@/shared/constants';
import { cn } from '@/presentation/lib/utils';

interface BingoCardVerifyViewProps {
  cardNumber: string;
  grid: number[][];
  calledNumbers: number[];
  lastDrawn?: number | null;
  compact?: boolean;
}

/** Minch-style check card grid — green = called, red = not called yet */
export function BingoCardVerifyView({
  cardNumber,
  grid,
  calledNumbers,
  lastDrawn = null,
  compact,
}: BingoCardVerifyViewProps) {
  const called = new Set(calledNumbers);

  return (
    <div className={cn('w-full', compact ? '' : 'max-w-md')}>
      <div className="overflow-hidden rounded-lg border border-gray-300">
        <div className="grid grid-cols-5 gap-px bg-gray-300">
          {BINGO_COLUMNS.map((col) => (
            <div key={col} className="bg-gray-700 py-1.5 text-center text-xs font-bold text-white">
              {col}
            </div>
          ))}
          {grid.map((row, ri) =>
            row.map((cell, ci) => {
              const isFree = cell === -1;
              const isCalled = isFree || called.has(cell);
              const isLastCall = !isFree && cell === lastDrawn;
              return (
                <div
                  key={`${ri}-${ci}`}
                  className={cn(
                    'flex h-10 items-center justify-center text-sm font-bold',
                    isLastCall
                      ? 'bg-[#facc15] text-[#111827] ring-2 ring-[#fde047] ring-inset'
                      : isFree
                        ? 'bg-emerald-500 text-white'
                        : isCalled
                          ? 'bg-emerald-500 text-white'
                          : 'bg-red-500 text-white',
                  )}
                >
                  {isFree ? 'Free' : cell}
                </div>
              );
            }),
          )}
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-gray-500">Card #{cardNumber}</p>
    </div>
  );
}
