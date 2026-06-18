'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@/presentation/lib/utils';
import { Lock } from 'lucide-react';

interface NumberGridProps {
  availableNumbers: number[];
  selectedSet: Set<number>;
  onToggle: (num: number) => void;
  onClear: () => void;
  disabled?: boolean;
  lockedSet?: Set<string | number>;
}

export function NumberGrid({ availableNumbers, selectedSet, onToggle, onClear, disabled, lockedSet }: NumberGridProps) {
  const numbers = useMemo(
    () => [...availableNumbers].sort((a, b) => a - b),
    [availableNumbers],
  );

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800">
          {disabled ? `Game cartellas (${numbers.length})` : `Your cartellas (${numbers.length} in deck)`}
        </h2>
        {!disabled && (
          <button onClick={onClear} disabled={selectedSet.size === 0}
            className="text-sm font-medium text-red-500 hover:text-red-700 disabled:opacity-40">
            Clear selection
          </button>
        )}
      </div>

      {numbers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-600">
          <p>No cartellas in your deck yet.</p>
          <p className="mt-2">
            Go to{' '}
            <Link href="/agent/cards/" className="font-semibold text-indigo-600 underline">
              Bingo Cards
            </Link>{' '}
            to add cartellas, then come back to start a game.
          </p>
        </div>
      ) : (
        <div className="number-grid-scroll max-h-[calc(100vh-320px)] overflow-y-auto rounded-lg border border-gray-200 bg-white p-3">
          <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}>
            {numbers.map((num) => {
              const isSelected = selectedSet.has(num);
              const isLocked = lockedSet?.has(num) || lockedSet?.has(String(num));
              return (
                <button
                  key={num}
                  onClick={() => !disabled && !isLocked && onToggle(num)}
                  disabled={disabled || isLocked}
                  className={cn(
                    'relative flex h-10 items-center justify-center rounded-md text-sm font-bold transition-colors',
                    isLocked
                      ? 'cursor-not-allowed bg-red-100 text-red-700 ring-2 ring-red-300 line-through'
                      : isSelected
                        ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200',
                  )}
                >
                  {isLocked ? <Lock className="absolute right-0.5 top-0.5 h-3 w-3 text-red-500" /> : null}
                  {num}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <p className="mt-2 text-sm text-gray-500">
        {disabled
          ? 'Blue = in this game · Red locked = eliminated (false BINGO)'
          : 'Blue = in this game · tap to select · add more on Bingo Cards page'}
      </p>
    </div>
  );
}
