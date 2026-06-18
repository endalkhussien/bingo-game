'use client';

import { BINGO_COLUMNS } from '@/shared/constants';
import { COLUMN_RANGES } from '@/shared/constants';
import { cn } from '@/presentation/lib/utils';

interface BingoBallBoardProps {
  calledSet: Set<number>;
  lastDrawn: number | null;
  maxBalls?: number;
}

function columnNumbers(col: keyof typeof COLUMN_RANGES): number[] {
  const [min, max] = COLUMN_RANGES[col];
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}

export function BingoBallBoard({ calledSet, lastDrawn, maxBalls = 75 }: BingoBallBoardProps) {
  return (
    <div className="flex flex-1 flex-col gap-1.5">
      {BINGO_COLUMNS.map((letter) => {
        const nums = columnNumbers(letter as keyof typeof COLUMN_RANGES).filter((n) => n <= maxBalls);
        return (
          <div key={letter} className="grid grid-cols-[2.5rem_repeat(15,minmax(0,1fr))] gap-1">
            <div className="flex items-center justify-center text-lg font-black text-white sm:text-xl">
              {letter}
            </div>
            {nums.map((n) => {
              const isCalled = calledSet.has(n);
              const isLatest = n === lastDrawn;
              return (
                <div
                  key={n}
                  className={cn(
                    'flex aspect-square items-center justify-center rounded-md text-xs font-bold transition-colors sm:text-sm',
                    isLatest
                      ? 'bg-yellow-400 text-slate-900 ring-2 ring-yellow-200'
                      : isCalled
                        ? 'bg-yellow-300/90 text-slate-900'
                        : 'bg-slate-700/80 text-slate-200',
                  )}
                >
                  {n}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
