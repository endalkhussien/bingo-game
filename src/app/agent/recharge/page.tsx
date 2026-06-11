'use client';

import { useState } from 'react';
import { ipc } from '@/presentation/lib/ipc';
import { useAuth } from '@/presentation/providers/auth-provider';

export default function RechargePage() {
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { refreshBalance } = useAuth();

  const handleRecharge = async () => {
    if (!code.trim()) { setError('Please enter a voucher code'); return; }
    setLoading(true);
    setError('');
    setMessage('');

    const result = await ipc<{ success: boolean; data?: { amount: number; newBalance: number }; error?: string }>(
      'wallet:redeem', code.trim()
    );

    setLoading(false);
    if (result.success && result.data) {
      setMessage(`Successfully recharged ${result.data.amount} ETB. New balance: ${result.data.newBalance} ETB`);
      setCode('');
      await refreshBalance();
    } else {
      setError(result.error ?? 'Recharge failed');
    }
  };

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-gray-900">Recharge Balance</h1>
      <div className="max-w-lg">
        <input type="text" value={code} onChange={(e) => { setCode(e.target.value); setError(''); }}
          placeholder="Enter Voucher Code"
          className="mb-4 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        <button onClick={handleRecharge} disabled={loading}
          className="rounded-lg bg-blue-600 px-8 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Processing...' : 'Recharge'}
        </button>
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        {message && <p className="mt-3 text-sm text-green-600">{message}</p>}
        <div className="mt-8 rounded-lg bg-gray-100 p-4 text-xs text-gray-500">
          <p className="font-medium text-gray-700 mb-1">Demo voucher codes:</p>
          <p>VOUCHER100 (100 ETB) · VOUCHER500 (500 ETB) · VOUCHER1000 (1000 ETB) · DEMO2024 (250 ETB)</p>
        </div>
      </div>
    </div>
  );
}
