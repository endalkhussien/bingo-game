'use client';

import { useEffect, useState } from 'react';
import { Volume2, Info } from 'lucide-react';
import { ipc } from '@/presentation/lib/ipc';
import { testVoice } from '@/presentation/lib/tts';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { VOICE_TYPES } from '@/shared/constants';

export default function VoiceSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState('');
  const [installedVoices, setInstalledVoices] = useState<string[]>([]);

  useEffect(() => {
    ipc<Record<string, string>>('settings:get').then(setSettings);
    ipc<string[]>('tts:list-voices').then(setInstalledVoices).catch(() => {});
  }, []);

  const save = async () => {
    await ipc('settings:update', {
      default_voice: settings.default_voice,
      default_language: settings.default_language,
    });
    alert('Voice settings saved');
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult('');
    const msg = await testVoice(
      settings.default_voice ?? 'AMHARIC_MALE',
      settings.default_language ?? 'am',
      42,
    );
    setTestResult(msg);
    setTesting(false);
  };

  const hasAmharicVoice = installedVoices.some((v) => /\[am/i.test(v));

  return (
    <div className="max-w-xl">
      <PageHeader title="Voice Settings" />
      <div className="rounded-xl bg-white p-6 shadow-sm border space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Default Voice</label>
          <select value={settings.default_voice ?? 'AMHARIC_MALE'} onChange={(e) => setSettings({ ...settings, default_voice: e.target.value })}
            className="w-full rounded-lg border px-3 py-2 text-sm">
            {VOICE_TYPES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Default Language</label>
          <select value={settings.default_language ?? 'am'} onChange={(e) => setSettings({ ...settings, default_language: e.target.value })}
            className="w-full rounded-lg border px-3 py-2 text-sm">
            <option value="am">Amharic (አማርኛ)</option>
            <option value="en">English</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button onClick={save} className="rounded-lg bg-blue-600 px-6 py-2 text-sm text-white">Save</button>
          <button onClick={handleTest} disabled={testing}
            className="inline-flex items-center gap-1 rounded-lg border px-6 py-2 text-sm hover:bg-gray-50 disabled:opacity-50">
            <Volume2 className="h-4 w-4" /> {testing ? 'Speaking...' : 'Test Voice'}
          </button>
        </div>

        {testResult && (
          <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">{testResult}</p>
        )}

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="mb-2 flex items-center gap-2 font-semibold"><Info className="h-4 w-4" /> Amharic voice setup (Windows)</p>
          <p className="mb-2">Browser voices rarely include Amharic. The desktop app uses:</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li><strong>Windows Speech</strong> — install Amharic language pack in Settings → Time &amp; language → Language → Add Amharic → Speech</li>
            <li><strong>espeak-ng</strong> (free backup) — download from <span className="break-all">github.com/espeak-ng/espeak-ng/releases</span> and add to PATH</li>
          </ol>
          {!hasAmharicVoice && installedVoices.length > 0 && (
            <p className="mt-2 text-red-700">⚠ No Amharic voice detected on this PC. Install Amharic speech pack or espeak-ng.</p>
          )}
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
