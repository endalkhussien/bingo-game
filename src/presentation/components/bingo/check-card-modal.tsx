'use client';

import { useState } from 'react';
import { X, CheckCircle, XCircle } from 'lucide-react';

interface CheckCardModalProps {
  open: boolean;
  onClose: () => void;
  onValidate: (cardNumber: string) => Promise<{ valid: boolean; message: string; prizeAmount?: number }>;
}

export function CheckCardModal({ open, onClose, onValidate }: CheckCardModalProps) {
  const [cardNumber, setCardNumber] = useState('');
  const [result, setResult] = useState<{ valid: boolean; message: string; prizeAmount?: number } | null>(null);
  const [loading, setLoading] = useState(false);

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
          <h2 className="text-xl font-bold text-gray-900">Check Bingo Card</h2>
          <button onClick={handleClose} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-4 text-sm text-gray-600">Player claimed BINGO! Enter their card number to verify the win.</p>
        <input
          type="text"
          value={cardNumber}
          onChange={(e) => setCardNumber(e.target.value)}
          placeholder="Card number e.g. 12"
          className="mb-4 w-full rounded-lg border border-gray-300 px-4 py-3 text-lg font-semibold focus:border-blue-500 focus:outline-none"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
        />
        {result && (
          <div className={`mb-4 flex items-start gap-3 rounded-lg p-4 ${result.valid ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {result.valid ? <CheckCircle className="h-6 w-6 shrink-0" /> : <XCircle className="h-6 w-6 shrink-0" />}
            <div>
              <p className="font-semibold">{result.valid ? 'Valid Winner!' : 'Not a winner'}</p>
              <p className="text-sm">{result.message}</p>
              {result.prizeAmount != null && <p className="mt-1 font-bold">Prize: {result.prizeAmount.toFixed(2)} ETB</p>}
            </div>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={handleClose} className="flex-1 rounded-lg border py-2.5 text-sm font-medium hover:bg-gray-50">Close</button>
          <button onClick={handleCheck} disabled={loading || !cardNumber.trim()}
            className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Checking...' : 'Verify Card'}
          </button>
        </div>
      </div>
    </div>
  );
}
