'use client';

import { Star } from 'lucide-react';
import { cn } from '@/presentation/lib/utils';

interface MinchCartellaPreviewProps {
  grid: number[][];
  calledSet?: Set<number>;
  compact?: boolean;
}

/** Small cartella preview for hall screen footer (Minch style). */
export function MinchCartellaPreview({ grid, calledSet, compact }: MinchCartellaPreviewProps) {
  return (
    <div className={cn('rounded-md border-2 border-[#3b82f6] bg-white p-1', compact ? 'w-full' : 'w-36')}>
      <div className="grid grid-cols-5 gap-px">
        {grid.map((row, ri) =>
          row.map((cell, ci) => {
            const isFree = cell === -1;
            const isCorner = (ri === 0 || ri === 4) && (ci === 0 || ci === 4);
            const isCalled = isFree || (calledSet?.has(cell) ?? false);
            return (
              <div
                key={`${ri}-${ci}`}
                className={cn(
                  'flex aspect-square items-center justify-center text-[9px] font-bold',
                  isFree
                    ? 'bg-emerald-500 text-white'
                    : isCalled
                      ? 'bg-sky-200 text-sky-900'
                      : 'bg-white text-gray-800',
                )}
              >
                {isFree ? (
                  isCorner ? <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" /> : 'Free'
                ) : (
                  cell
                )}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}
