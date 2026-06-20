'use client';

import { useEffect, useState } from 'react';
import { BINGO_COLUMNS, BINGO_COLUMN_COLORS, COLUMN_RANGES } from '@/shared/constants';
import { Star } from 'lucide-react';
import { isValidBingoGrid } from '@/domain/services/card-generator';

interface BingoCardViewProps {
  cardNumber: string;
  grid: number[][];
  onSave?: (grid: number[][]) => Promise<void> | void;
  onDelete?: () => void;
  compact?: boolean;
}

export function BingoCardView({ cardNumber, grid, onSave, onDelete, compact }: BingoCardViewProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<number[][]>(grid);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(grid);
  }, [grid, editing]);

  const startEdit = () => {
    setDraft(grid.map((row) => [...row]));
    setError('');
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(grid);
    setError('');
    setEditing(false);
  };

  const handleCellChange = (row: number, col: number, value: string) => {
    if (col === 2 && row === 2) return;
    const parsed = value.trim() === '' ? 0 : parseInt(value, 10);
    setDraft((prev) => {
      const next = prev.map((r) => [...r]);
      next[row][col] = Number.isFinite(parsed) ? parsed : 0;
      return next;
    });
  };

  const handleSave = async () => {
    if (!onSave) return;
    if (!isValidBingoGrid(draft)) {
      setError('Each column must use its B-I-N-G-O number range. Center must be Free.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(draft);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save card.');
    } finally {
      setSaving(false);
    }
  };

  const displayGrid = editing ? draft : grid;

  return (
    <div className={`rounded-xl bg-gray-700 p-3 shadow-lg ${compact ? '' : 'w-full max-w-xs'}`}>
      <h3 className="mb-2 text-center text-sm font-semibold text-white">Card #{cardNumber}</h3>
      <div className="overflow-hidden rounded-lg">
        <div className="grid grid-cols-5 gap-px bg-gray-600">
          {BINGO_COLUMNS.map((col) => (
            <div key={col} className={`${BINGO_COLUMN_COLORS[col]} py-1 text-center text-xs font-bold text-white`}>
              {col}
            </div>
          ))}
          {displayGrid.map((row, ri) =>
            row.map((cell, ci) => {
              const colKey = BINGO_COLUMNS[ci];
              const [min, max] = COLUMN_RANGES[colKey];
              const isFree = cell === -1;
              return (
                <div
                  key={`${ri}-${ci}`}
                  className="flex h-8 items-center justify-center bg-gray-200 text-xs font-semibold text-gray-800"
                >
                  {editing && !isFree ? (
                    <input
                      type="number"
                      min={min}
                      max={max}
                      value={cell || ''}
                      onChange={(e) => handleCellChange(ri, ci, e.target.value)}
                      className="h-full w-full border-0 bg-yellow-50 text-center text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  ) : isFree ? (
                    <Star className="h-3 w-3 fill-white text-white" />
                  ) : (
                    cell
                  )}
                </div>
              );
            }),
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-center text-xs text-red-300">{error}</p>}
      {(onSave || onDelete) && (
        <div className="mt-3 flex gap-2">
          {editing ? (
            <>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-md bg-green-600 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="flex-1 rounded-md bg-gray-500 py-1.5 text-xs font-semibold text-white hover:bg-gray-600"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              {onSave && (
                <button
                  type="button"
                  onClick={startEdit}
                  className="flex-1 rounded-md bg-yellow-500 py-1.5 text-xs font-semibold text-white hover:bg-yellow-600"
                >
                  Update
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="flex-1 rounded-md bg-red-600 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                >
                  Delete
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
