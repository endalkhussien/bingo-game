'use client';

import { useEffect, useState } from 'react';
import { ipc } from '@/presentation/lib/ipc';
import { PageHeader } from '@/presentation/components/shared/page-header';

export default function CommissionsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [players, setPlayers] = useState('100');
  const [bet, setBet] = useState('10');

  useEffect(() => { ipc<Record<string, string>>('settings:get').then(setSettings); }, []);

  const handleSave = async () => {
    await ipc('settings:update', {
      default_commission: settings.default_commission,
      platform_fee: settings.platform_fee,
      minimum_bet: settings.minimum_bet,
      maximum_bet: settings.maximum_bet,
    });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const total = parseFloat(players) * parseFloat(bet);
  const commission = total * (parseFloat(settings.default_commission ?? '20') / 100);
  const winnerPool = total - commission - parseFloat(settings.platform_fee ?? '0');

  return (
    <div className="max-w-2xl">
      <PageHeader title="Commission Settings" />
      <div className="rounded-xl bg-white p-6 shadow-sm border space-y-4">
        {[
          { key: 'default_commission', label: 'Commission %' },
          { key: 'platform_fee', label: 'Platform Fee (ETB)' },
          { key: 'minimum_bet', label: 'Minimum Bet (ETB)' },
          { key: 'maximum_bet', label: 'Maximum Bet (ETB)' },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className="mb-1 block text-sm font-medium">{label}</label>
            <input type="number" value={settings[key] ?? ''} onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
              className="w-full rounded-lg border px-3 py-2 text-sm" />
          </div>
        ))}
        <button onClick={handleSave} className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white">
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
      <div className="mt-6 rounded-xl bg-gray-50 p-5 border">
        <h3 className="mb-3 font-semibold">Example Calculator</h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <input type="number" value={players} onChange={(e) => setPlayers(e.target.value)} placeholder="Players" className="rounded-lg border px-3 py-2 text-sm" />
          <input type="number" value={bet} onChange={(e) => setBet(e.target.value)} placeholder="Bet ETB" className="rounded-lg border px-3 py-2 text-sm" />
        </div>
        <p className="text-sm text-gray-600">{players} Players × {bet} ETB = <strong>{total} ETB</strong></p>
        <p className="text-sm text-gray-600">Commission ({settings.default_commission}%) = <strong>{commission.toFixed(0)} ETB</strong></p>
        <p className="text-sm text-gray-600">Winner Pool = <strong>{winnerPool.toFixed(0)} ETB</strong></p>
      </div>
    </div>
  );
}
