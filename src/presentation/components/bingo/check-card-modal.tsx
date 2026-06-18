'use client';

import { useState, useEffect } from 'react';
import { X, XCircle, Trophy, Ban } from 'lucide-react';
import { BingoCardVerifyView } from './bingo-card-verify-view';

interface CheckCardModalProps {
  open: boolean;
  onClose: () => void;
  calledNumbers: number[];
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

export function CheckCardModal({
  open,
  onClose,
  calledNumbers,
  onValidate,
  onInvalidClaim,
}: CheckCardModalProps) {
  const [cardNumber, setCardNumber] = useState('');
  const [result, setResult] = useState<{
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
  } | null>(null);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[95vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">CHECK CARDS</h2>
          <button onClick={handleClose} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-4 text-sm text-gray-600">
          Game is paused for a BINGO claim. Enter the player&apos;s <strong>cartella number</strong> and verify against
          {' '}{calledNumbers.length} balls already called.
        </p>
        <label className="mb-1 block text-sm font-medium text-gray-700">Cartella number</label>
        <input
          type="number"
          min={1}
          value={cardNumber}
          onChange={(e) => setCardNumber(e.target.value)}
          placeholder="e.g. 12"
          className="mb-4 w-full rounded-lg border border-gray-300 px-4 py-3 text-2xl font-bold focus:border-blue-500 focus:outline-none"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
        />

        {showCard && (
          <div className="mb-4">
            <BingoCardVerifyView
              cardNumber={result?.cardNumber ?? cardNumber}
              grid={result!.grid!}
              calledNumbers={displayCalled}
            />
          </div>
        )}

        {result && (
          <div className={`mb-4 rounded-xl p-4 ${result.valid ? 'bg-green-50 text-green-900 ring-2 ring-green-300' : result.banned ? 'bg-red-100 text-red-950 ring-2 ring-red-400' : 'bg-red-50 text-red-900 ring-2 ring-red-200'}`}>
            <div className="flex items-start gap-3">
              {result.valid ? (
                <Trophy className="h-8 w-8 shrink-0 text-green-600" />
              ) : result.banned ? (
                <Ban className="h-8 w-8 shrink-0 text-red-600" />
              ) : (
                <XCircle className="h-8 w-8 shrink-0 text-red-500" />
              )}
              <div className="flex-1">
                {result.valid ? (
                  <>
                    <p className="text-2xl font-black">Cartella #{result.cardNumber ?? cardNumber} WINS!</p>
                    {result.prizeAmount != null && (
                      <p className="mt-2 text-2xl font-black text-green-700">
                        {result.prizeAmount.toFixed(0)} ETB
                      </p>
                    )}
                    {result.playerCount != null && result.betAmount != null && (
                      <p className="mt-1 text-sm text-green-800">
                        From {result.playerCount} players × {result.betAmount} ETB
                      </p>
                    )}
                    {result.calledCountAtWin != null && (
                      <p className="mt-1 text-xs text-green-700">Verified after {result.calledCountAtWin} balls called</p>
                    )}
                  </>
                ) : result.banned ? (
                  <>
                    <p className="text-xl font-black">Cartella #{result.cardNumber ?? cardNumber} ELIMINATED</p>
                    <p className="mt-2 text-sm font-semibold">{result.message}</p>
                    <p className="mt-2 text-xs">Player banned · cartella locked · game will continue shortly.</p>
                  </>
                ) : (
                  <>
                    <p className="font-bold">Not a winner</p>
                    <p className="text-sm">{result.message}</p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={handleClose} className="flex-1 rounded-lg border py-2.5 text-sm font-medium hover:bg-gray-50">Close</button>
          <button onClick={handleCheck} disabled={loading || !cardNumber.trim()}
            className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Checking...' : 'CHECK CARD'}
          </button>
        </div>
      </div>
    </div>
  );
}
