'use client';

import { useMemo } from 'react';
import { CARTELLA_MAX } from '@/shared/constants';
import { cn } from '@/presentation/lib/utils';

interface NumberGridProps {
  selectedSet: Set<number>;
  onToggle: (num: number) => void;
  onClear: () => void;
  disabled?: boolean;
}

export function NumberGrid({ selectedSet, onToggle, onClear, disabled }: NumberGridProps) {
  const numbers = useMemo(
    () => Array.from({ length: CARTELLA_MAX }, (_, i) => i + 1),
    [],
  );

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800">Select cartella (1–{CARTELLA_MAX})</h2>
        <button onClick={onClear} disabled={disabled || selectedSet.size === 0}
          className="text-sm font-medium text-red-500 hover:text-red-700 disabled:opacity-40">
          Clear selection
        </button>
      </div>
      <div className="number-grid-scroll max-h-[calc(100vh-320px)] overflow-y-auto rounded-lg border border-gray-200 bg-white p-3">
        <div className="grid grid-cols-10 gap-1.5">
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
      <p className="mt-2 text-sm text-gray-500">
        Blue = cartella in this game · voice plays when you select
      </p>
    </div>
  );
}
