'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@/presentation/lib/utils';

interface NumberGridProps {
  availableNumbers: number[];
  selectedSet: Set<number>;
  onToggle: (num: number) => void;
  onClear: () => void;
  disabled?: boolean;
}

export function NumberGrid({ availableNumbers, selectedSet, onToggle, onClear, disabled }: NumberGridProps) {
  const numbers = useMemo(
    () => [...availableNumbers].sort((a, b) => a - b),
    [availableNumbers],
  );

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800">
          Your cartellas ({numbers.length} in deck)
        </h2>
        <button onClick={onClear} disabled={disabled || selectedSet.size === 0}
          className="text-sm font-medium text-red-500 hover:text-red-700 disabled:opacity-40">
          Clear selection
        </button>
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
              return (
                <button key={num} onClick={() => !disabled && onToggle(num)} disabled={disabled}
                  className={cn(
                    'flex h-10 items-center justify-center rounded-md text-sm font-bold transition-colors',
                    isSelected
                      ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200',
                  )}>
                  {num}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <p className="mt-2 text-sm text-gray-500">
        {disabled
          ? 'Cartellas locked for this game'
          : 'Blue = in this game · tap to select · add more on Bingo Cards page'}
      </p>
    </div>
  );
}
