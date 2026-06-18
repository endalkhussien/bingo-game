'use client';

import { BINGO_COLUMNS, COLUMN_RANGES } from '@/shared/constants';
import { cn } from '@/presentation/lib/utils';

interface BingoBallBoardProps {
  calledSet: Set<number>;
  lastDrawn: number | null;
  maxBalls?: number;
  large?: boolean;
}

function columnNumbers(col: keyof typeof COLUMN_RANGES): number[] {
  const [min, max] = COLUMN_RANGES[col];
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}

/** Minch-style 75-ball board — 5×15 grid with B-I-N-G-O row labels */
export function BingoBallBoard({ calledSet, lastDrawn, maxBalls = 75, large }: BingoBallBoardProps) {
  return (
    <div className="flex h-full w-full flex-col justify-center gap-1.5 lg:gap-2">
      {BINGO_COLUMNS.map((letter) => {
        const nums = columnNumbers(letter as keyof typeof COLUMN_RANGES).filter((n) => n <= maxBalls);
        return (
          <div
            key={letter}
            className="grid gap-1 lg:gap-1.5"
            style={{ gridTemplateColumns: large ? '4.5rem repeat(15, minmax(0, 1fr))' : '2rem repeat(15, minmax(0, 1fr))' }}
          >
            <div className={cn(
              'flex items-center justify-center font-black text-white',
              large ? 'text-4xl lg:text-5xl xl:text-6xl' : 'text-base sm:text-lg',
            )}>
              {letter}
            </div>
            {nums.map((n) => {
              const isCalled = calledSet.has(n);
              const isLatest = n === lastDrawn;
              return (
                <div
                  key={n}
                  className={cn(
                    'flex items-center justify-center rounded-md font-bold',
                    large ? 'min-h-[2.5rem] text-lg sm:min-h-[2.75rem] sm:text-xl lg:min-h-[3.25rem] lg:text-2xl xl:min-h-[3.5rem] xl:text-3xl' : 'aspect-square min-h-[1.75rem] text-[11px] sm:text-xs',
                    isLatest
                      ? 'bg-[#facc15] text-[#111827] ring-2 ring-[#fde047]'
                      : isCalled
                        ? 'bg-[#facc15] text-[#111827]'
                        : 'bg-[#2d3a52] text-white',
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
