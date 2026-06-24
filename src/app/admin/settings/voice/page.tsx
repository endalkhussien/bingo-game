'use client';

import { useEffect, useState } from 'react';
import { Volume2, Info } from 'lucide-react';
import { ipc } from '@/presentation/lib/ipc';
import { testVoice } from '@/presentation/lib/tts';
import { PageHeader } from '@/presentation/components/shared/page-header';

export default function VoiceSettingsPage() {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState('');
  const [installedVoices, setInstalledVoices] = useState<string[]>([]);

  useEffect(() => {
    ipc<string[]>('tts:list-voices').then(setInstalledVoices).catch(() => {});
  }, []);

  const handleTest = async () => {
    setTesting(true);
    setTestResult('');
    const msg = await testVoice('AMHARIC_MALE', 'am', 42);
    setTestResult(msg);
    setTesting(false);
  };

  return (
    <div className="max-w-xl">
      <PageHeader title="Voice Settings" backHref="/admin/settings" backLabel="Back to Settings" />
      <div className="rounded-xl bg-white p-6 shadow-sm border space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Game voice</label>
          <p className="rounded-lg border bg-gray-50 px-3 py-2 text-sm text-gray-800">
            Amharic — your MP3 recordings in <code className="text-xs">public/audio/</code>
          </p>
        </div>

        <div>
          <button onClick={handleTest} disabled={testing}
            className="inline-flex items-center gap-1 rounded-lg border px-6 py-2 text-sm hover:bg-gray-50 disabled:opacity-50">
            <Volume2 className="h-4 w-4" /> {testing ? 'Speaking...' : 'Test Voice'}
          </button>
        </div>

        {testResult && (
          <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">{testResult}</p>
        )}

        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="mb-2 flex items-center gap-2 font-semibold"><Info className="h-4 w-4" /> Amharic voice</p>
          <p className="mb-2">
            Ball calls use your bundled MP3 files (English letter + Amharic number). Replace files under{' '}
            <strong>public/audio/</strong> and rebuild the installer.
          </p>
          <p className="text-xs text-emerald-800">
            Windows speech or espeak-ng are only used if a bundled clip is missing.
          </p>
          {installedVoices.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs">Installed Windows voices ({installedVoices.length})</summary>
              <ul className="mt-1 max-h-32 overflow-auto text-xs">{installedVoices.map((v) => <li key={v}>{v}</li>)}</ul>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
