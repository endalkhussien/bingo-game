'use client';

import { useState, useEffect } from 'react';
import { X, Trophy, Ban } from 'lucide-react';
import { BingoCardVerifyView } from './bingo-card-verify-view';
import { analyzeCardWins } from '@/domain/services/card-win-analysis';
import { WINNING_PATTERNS } from '@/shared/constants';
import { cn } from '@/presentation/lib/utils';
import type { CardGrid } from '@/domain/services/card-generator';

interface CheckCardModalProps {
  open: boolean;
  onClose: () => void;
  calledNumbers: number[];
  gamePattern?: string;
  onValidate: (cardNumber: string) => Promise<{
    valid: boolean;
    message: string;
    cardNumber?: string;
    prizeAmount?: number;
    playerCount?: number;
    betAmount?: number;
    totalPot?: number;
    calledCountAtWin?: number;
    winningPattern?: string;
    grid?: number[][] | null;
    calledNumbers?: number[];
    banned?: boolean;
    eliminated?: boolean;
  }>;
  onInvalidClaim?: (result: { banned?: boolean; eliminated?: boolean }) => void;
}

function patternLabel(value?: string): string {
  const found = WINNING_PATTERNS.find((p) => p.value === value);
  return found?.label ?? '1 line';
}

export function CheckCardModal({
  open,
  onClose,
  calledNumbers,
  gamePattern,
  onValidate,
  onInvalidClaim,
}: CheckCardModalProps) {
  const [cardNumber, setCardNumber] = useState('');
  const [result, setResult] = useState<Awaited<ReturnType<CheckCardModalProps['onValidate']>> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setCardNumber('');
      setResult(null);
    }
  }, [open]);

  if (!open) return null;

  const handleCheck = async () => {
    if (!cardNumber.trim()) return;
    setLoading(true);
    setResult(null);
    const res = await onValidate(cardNumber.trim());
    setResult(res);
    setLoading(false);
    if (!res.valid) onInvalidClaim?.({ banned: res.banned, eliminated: res.eliminated });
  };

  const handleClose = () => {
    setCardNumber('');
    setResult(null);
    onClose();
  };

  const displayCalled = result?.calledNumbers ?? calledNumbers;
  const showCard = result?.grid && result.grid.length > 0;
  const winBreakdown = showCard
    ? analyzeCardWins(result!.grid! as CardGrid, displayCalled)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[95vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800">
            Game Type is <span className="text-gray-900">{patternLabel(gamePattern ?? result?.winningPattern)}</span>
          </p>
          <button type="button" onClick={handleClose} className="rounded p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <label className="mb-1 block text-sm font-medium text-gray-700">Enter Card Number</label>
        <div className="mb-4 flex gap-2">
          <input
            type="number"
            min={1}
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-xl font-bold focus:border-blue-500 focus:outline-none"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
          />
          <button
            type="button"
            onClick={handleCheck}
            disabled={loading || !cardNumber.trim()}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '…' : 'Check Card'}
          </button>
        </div>

        {showCard && (
          <div className="mb-4">
            <BingoCardVerifyView
              cardNumber={result?.cardNumber ?? cardNumber}
              grid={result!.grid!}
              calledNumbers={displayCalled}
            />
          </div>
        )}

        {winBreakdown && (
          <div className="mb-4 space-y-0.5 text-sm font-semibold text-emerald-700">
            {winBreakdown.horizontal > 0 && <p>{winBreakdown.horizontal} Horizontal Win(s)</p>}
            {winBreakdown.vertical > 0 && <p>{winBreakdown.vertical} Vertical Win(s)</p>}
            {winBreakdown.diagonal > 0 && <p>{winBreakdown.diagonal} Diagonal Win(s)</p>}
            {winBreakdown.horizontal === 0 && winBreakdown.vertical === 0 && winBreakdown.diagonal === 0 && (
              <p className="text-gray-500">No completed lines yet</p>
            )}
          </div>
        )}

        {result && (
          <div className={cn(
            'mb-4 rounded-lg p-4 text-sm',
            result.valid ? 'bg-green-50 text-green-900' : result.banned ? 'bg-red-100 text-red-950' : 'bg-red-50 text-red-900',
          )}>
            {result.valid ? (
              <div className="flex items-start gap-2">
                <Trophy className="h-6 w-6 shrink-0 text-green-600" />
                <div>
                  <p className="text-lg font-black">Cartella #{result.cardNumber ?? cardNumber} WINS!</p>
                  {result.prizeAmount != null && (
                    <p className="text-xl font-black text-green-700">{result.prizeAmount.toFixed(0)} ETB</p>
                  )}
                </div>
              </div>
            ) : result.banned ? (
              <div className="flex items-start gap-2">
                <Ban className="h-6 w-6 shrink-0 text-red-600" />
                <div>
                  <p className="font-black">Cartella #{result.cardNumber ?? cardNumber} eliminated</p>
                  <p className="mt-1">{result.message}</p>
                </div>
              </div>
            ) : (
              <p>{result.message}</p>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleClose}
          className="w-full rounded-lg border border-gray-300 bg-gray-100 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          Close
        </button>
      </div>
    </div>
  );
}
