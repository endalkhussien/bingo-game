'use client';

import { useEffect, useMemo, useState } from 'react';
import { BINGO_COLUMNS, COLUMN_RANGES } from '@/shared/constants';
import { cn } from '@/presentation/lib/utils';

function columnNumbers(col: keyof typeof COLUMN_RANGES): number[] {
  const [min, max] = COLUMN_RANGES[col];
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}

function shuffleNums(nums: number[]): number[] {
  const next = [...nums];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

interface DrawShuffleOverlayProps {
  active: boolean;
}

/** Visual-only ball shuffle before the first draw — does not change server draw order. */
export function DrawShuffleOverlay({ active }: DrawShuffleOverlayProps) {
  const [flash, setFlash] = useState(0);

  useEffect(() => {
    if (!active) {
      setFlash(0);
      return;
    }
    const timer = window.setInterval(() => setFlash((f) => f + 1), 45);
    return () => window.clearInterval(timer);
  }, [active]);

  const highlightSet = useMemo(() => {
    const pool = shuffleNums(Array.from({ length: 75 }, (_, i) => i + 1));
    return new Set(pool.slice(0, 10));
  }, [flash, active]);

  if (!active) return null;

  return (
    <div className="draw-shuffle-overlay absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0a1020]/95 p-4 backdrop-blur-sm">
      <div className="mb-4 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.35em] text-[#facc15]">Preparing draw</p>
        <h2 className="mt-2 text-3xl font-black text-white sm:text-5xl">Shuffling balls</h2>
        <p className="mt-2 text-sm text-white/60">For players — actual draw order stays fair & random</p>
      </div>

      <div className="draw-shuffle-drum w-full max-w-6xl rounded-2xl border-2 border-[#facc15]/50 bg-[#141c2e] p-3 shadow-[0_0_80px_rgba(250,204,21,0.2)] sm:p-5">
        <div className="flex flex-col gap-1.5 sm:gap-2">
          {BINGO_COLUMNS.map((letter) => {
            const nums = columnNumbers(letter as keyof typeof COLUMN_RANGES);
            const shuffled = shuffleNums(nums);
            return (
              <div
                key={letter}
                className="grid gap-1 sm:gap-1.5"
                style={{ gridTemplateColumns: '2.5rem repeat(15, minmax(0, 1fr))' }}
              >
                <div className="flex items-center justify-center text-xl font-black text-[#facc15] sm:text-2xl">
                  {letter}
                </div>
                {shuffled.map((n) => (
                  <div
                    key={`${letter}-${n}-${flash}`}
                    className={cn(
                      'draw-shuffle-ball flex aspect-square items-center justify-center rounded-md text-sm font-bold sm:text-base',
                      highlightSet.has(n)
                        ? 'bg-[#facc15] text-[#111827] ring-2 ring-[#fde047]'
                        : 'bg-[#2d3a52] text-white',
                    )}
                  >
                    {n}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
