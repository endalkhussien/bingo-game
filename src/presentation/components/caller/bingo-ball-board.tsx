'use client';

import { BINGO_COLUMNS, COLUMN_RANGES } from '@/shared/constants';
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

/** Minch-style 75-ball board — 5×15 grid with B-I-N-G-O row labels */
export function BingoBallBoard({ calledSet, lastDrawn, maxBalls = 75 }: BingoBallBoardProps) {
  return (
    <div className="flex h-full w-full flex-col justify-center gap-1">
      {BINGO_COLUMNS.map((letter) => {
        const nums = columnNumbers(letter as keyof typeof COLUMN_RANGES).filter((n) => n <= maxBalls);
        return (
          <div
            key={letter}
            className="grid gap-[3px]"
            style={{ gridTemplateColumns: '2rem repeat(15, minmax(0, 1fr))' }}
          >
            <div className="flex items-center justify-center text-base font-black text-white/90 sm:text-lg">
              {letter}
            </div>
            {nums.map((n) => {
              const isCalled = calledSet.has(n);
              const isLatest = n === lastDrawn;
              return (
                <div
                  key={n}
                  className={cn(
                    'flex aspect-square min-h-[1.75rem] items-center justify-center rounded-md text-[11px] font-bold sm:text-xs',
                    isLatest
                      ? 'bg-[#facc15] text-[#111827] ring-2 ring-[#fde047]'
                      : isCalled
                        ? 'bg-[#facc15] text-[#111827]'
                        : 'bg-[#5a5a5a] text-[#f3f4f6]',
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
