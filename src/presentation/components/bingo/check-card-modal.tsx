'use client';

import { useState, useEffect } from 'react';
import { X, XCircle, Trophy } from 'lucide-react';

interface CheckCardModalProps {
  open: boolean;
  onClose: () => void;
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
  }>;
}

export function CheckCardModal({ open, onClose, onValidate }: CheckCardModalProps) {
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
  };

  const handleClose = () => {
    setCardNumber('');
    setResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Verify BINGO claim</h2>
          <button onClick={handleClose} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-4 text-sm text-gray-600">
          Game is paused. Enter the player&apos;s <strong>cartella number</strong> to check if they win.
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
        {result && (
          <div className={`mb-4 rounded-xl p-4 ${result.valid ? 'bg-green-50 text-green-900 ring-2 ring-green-300' : 'bg-red-50 text-red-900 ring-2 ring-red-200'}`}>
            <div className="flex items-start gap-3">
              {result.valid ? <Trophy className="h-8 w-8 shrink-0 text-green-600" /> : <XCircle className="h-8 w-8 shrink-0 text-red-500" />}
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
                ) : (
                  <>
                    <p className="font-bold">Not a winner</p>
                    <p className="text-sm">{result.message}</p>
                    <p className="mt-2 text-xs">Click Resume to continue calling numbers.</p>
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
            {loading ? 'Checking...' : 'Verify cartella'}
          </button>
        </div>
      </div>
    </div>
  );
}
