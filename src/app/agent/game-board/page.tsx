'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { ipc } from '@/presentation/lib/ipc';
import { useAuth } from '@/presentation/providers/auth-provider';
import { NumberGrid } from '@/presentation/components/bingo/number-grid';
import { WINNING_PATTERNS, DRAW_INTERVALS, VOICE_TYPES, MIN_BET } from '@/shared/constants';

interface ActiveGame {
  id: string;
  gameCode: string;
  betAmount: number;
  status: string;
  selectedNumbers: number[];
  drawnNumbers: number[];
  drawSpeedMs: number;
}

export default function GameBoardPage() {
  const { agent, refreshBalance } = useAuth();
  const [betAmount, setBetAmount] = useState('10');
  const [interval, setInterval_] = useState(2000);
  const [pattern, setPattern] = useState('SINGLE_LINE');
  const [voice, setVoice] = useState('AMHARIC_MALE');
  const [selected, setSelected] = useState<number[]>([]);
  const [called, setCalled] = useState<number[]>([]);
  const [activeGame, setActiveGame] = useState<ActiveGame | null>(null);
  const [betError, setBetError] = useState('');
  const [showProfit, setShowProfit] = useState(false);
  const [profit, setProfit] = useState(0);
  const [creating, setCreating] = useState(false);
  const [autoDraw, setAutoDraw] = useState(false);
  const autoDrawRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const estimatedProfit = selected.length > 0
    ? parseFloat(betAmount || '0') * selected.length * 0.8
    : 0;

  useEffect(() => {
    ipc<ActiveGame | null>('games:active').then((game) => {
      if (game) {
        setActiveGame(game);
        setCalled(game.drawnNumbers ?? []);
        setSelected(game.selectedNumbers ?? []);
        setBetAmount(String(game.betAmount));
      }
    });
  }, []);

  const toggleNumber = (num: number) => {
    if (activeGame) return;
    setSelected((prev) => prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num]);
  };

  const handleCreateGame = async () => {
    const bet = parseFloat(betAmount);
    if (isNaN(bet) || bet < MIN_BET) {
      setBetError(`Bet must be at least ${MIN_BET} ETB.`);
      return;
    }
    setBetError('');
    setCreating(true);

    const result = await ipc<{ success: boolean; data?: ActiveGame; error?: string }>('games:create', {
      betAmount: bet,
      winningPattern: pattern,
      drawSpeedMs: interval,
      voiceType: voice,
      selectedNumbers: selected,
    });

    setCreating(false);
    if (result.success && result.data) {
      setActiveGame({ ...result.data, selectedNumbers: selected, drawnNumbers: [], drawSpeedMs: interval });
      setCalled([]);
      await refreshBalance();
    } else {
      setBetError(result.error ?? 'Failed to create game');
    }
  };

  const handleDraw = useCallback(async () => {
    if (!activeGame) return;
    const result = await ipc<{ success: boolean; data?: { number: number; winners: Array<{ cardNumber: string; prizeAmount: number }> } }>(
      'games:draw', activeGame.id
    );
    if (result.success && result.data) {
      setCalled((prev) => [...prev, result.data!.number]);
      if (result.data.winners?.length) {
        setProfit(result.data.winners[0].prizeAmount);
      }
    }
  }, [activeGame]);

  useEffect(() => {
    if (autoDraw && activeGame) {
      autoDrawRef.current = setInterval(handleDraw, interval);
    }
    return () => { if (autoDrawRef.current) clearInterval(autoDrawRef.current); };
  }, [autoDraw, activeGame, interval, handleDraw]);

  const handleEndGame = async () => {
    if (!activeGame) return;
    setAutoDraw(false);
    const result = await ipc<{ success: boolean; data?: { agentRevenue: number } }>('games:end', activeGame.id);
    if (result.success && result.data) {
      setProfit(result.data.agentRevenue);
      setActiveGame(null);
      setCalled([]);
      await refreshBalance();
    }
  };

  return (
    <div>
      {/* Config bar */}
      <div className="mb-4 flex flex-wrap items-end gap-4 rounded-xl bg-white p-4 shadow-sm">
        <div className="flex-1 min-w-[120px]">
          <label className="mb-1 block text-sm font-medium text-gray-700">Bet Amount</label>
          <input type="number" value={betAmount} onChange={(e) => { setBetAmount(e.target.value); setBetError(''); }}
            disabled={!!activeGame}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-100" />
          {betError && <p className="mt-1 text-xs text-red-500">{betError}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Interval</label>
          <select value={interval} onChange={(e) => setInterval_(Number(e.target.value))} disabled={!!activeGame}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100">
            {DRAW_INTERVALS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Pattern</label>
          <select value={pattern} onChange={(e) => setPattern(e.target.value)} disabled={!!activeGame}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100">
            {WINNING_PATTERNS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Voice/Caller</label>
          <select value={voice} onChange={(e) => setVoice(e.target.value)} disabled={!!activeGame}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100">
            {VOICE_TYPES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
          </select>
        </div>
        {!activeGame ? (
          <button onClick={handleCreateGame} disabled={creating || selected.length === 0}
            className="rounded-lg bg-green-600 px-6 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
            {creating ? 'Creating...' : 'Create Game'}
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={handleDraw}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              Draw Next
            </button>
            <button onClick={() => setAutoDraw(!autoDraw)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${autoDraw ? 'bg-orange-500' : 'bg-gray-500'}`}>
              {autoDraw ? 'Stop Auto' : 'Auto Draw'}
            </button>
            <button onClick={handleEndGame}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600">
              End Game
            </button>
          </div>
        )}
      </div>

      {/* Profit row */}
      <div className="mb-4 flex items-center gap-2 text-sm">
        <span className="font-medium text-gray-700">Profit:</span>
        <span className="font-semibold">
          {showProfit ? `${(activeGame ? profit : estimatedProfit).toFixed(2)} ETB` : '******'}
        </span>
        <button onClick={() => setShowProfit(!showProfit)} className="text-blue-500">
          {showProfit ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        {activeGame && (
          <span className="ml-4 rounded-full bg-green-100 px-3 py-0.5 text-xs font-medium text-green-700">
            {activeGame.gameCode} — RUNNING — Called: {called.length}
          </span>
        )}
      </div>

      {/* Number grid 1-150 */}
      <NumberGrid
        selected={selected}
        called={called}
        onToggle={toggleNumber}
        onClear={() => setSelected([])}
        disabled={!!activeGame}
      />
    </div>
  );
}
