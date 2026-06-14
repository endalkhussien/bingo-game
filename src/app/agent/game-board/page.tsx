'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Eye, EyeOff, Pause, Play, Megaphone, ListOrdered } from 'lucide-react';
import { ipc } from '@/presentation/lib/ipc';
import { useAuth } from '@/presentation/providers/auth-provider';
import { NumberGrid } from '@/presentation/components/bingo/number-grid';
import { CalledNumbersModal } from '@/presentation/components/bingo/called-numbers-modal';
import { CheckCardModal } from '@/presentation/components/bingo/check-card-modal';
import { WINNING_PATTERNS, DRAW_INTERVALS, VOICE_TYPES, MIN_BET, DEFAULT_JACKPOT_MAX_CALLS } from '@/shared/constants';
import { DRAW_BALL_COUNT } from '@/shared/brand';
import { speakBall, speakCartella, loadVoices } from '@/presentation/lib/tts';
import { getBallLabel } from '@/domain/services/bingo-engine';
import { toAmharicNumberWord } from '@/shared/tts/voice-map';

interface ActiveGame {
  id: string;
  gameCode: string;
  betAmount: number;
  status: string;
  selectedNumbers: number[];
  drawnNumbers: number[];
  drawSpeedMs: number;
  commissionRate?: number;
  totalPot?: number;
  agentCommission?: number;
  maxBalls?: number;
  voiceType?: string;
  language?: string;
}

export default function GameBoardPage() {
  const { agent, refreshBalance } = useAuth();
  const [betAmount, setBetAmount] = useState('10');
  const [interval, setInterval_] = useState(2000);
  const [pattern, setPattern] = useState('FIRST_LINE');
  const [jackpotMaxCalls, setJackpotMaxCalls] = useState(String(DEFAULT_JACKPOT_MAX_CALLS));
  const [voice, setVoice] = useState('AMHARIC_MALE');
  const [language, setLanguage] = useState('am');
  const [selected, setSelected] = useState<number[]>([]);
  const [called, setCalled] = useState<number[]>([]);
  const [lastDrawn, setLastDrawn] = useState<number | null>(null);
  const [activeGame, setActiveGame] = useState<ActiveGame | null>(null);
  const [betError, setBetError] = useState('');
  const [showProfit, setShowProfit] = useState(false);
  const [profit, setProfit] = useState(0);
  const [creating, setCreating] = useState(false);
  const [autoDraw, setAutoDraw] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [checkModalOpen, setCheckModalOpen] = useState(false);
  const [calledModalOpen, setCalledModalOpen] = useState(false);
  const [commissionPercent, setCommissionPercent] = useState('20');
  const [gameCommission, setGameCommission] = useState({ rate: 20, pot: 0, agentCut: 0 });
  const autoDrawRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const commissionRate = activeGame?.commissionRate ?? (parseFloat(commissionPercent || '0') || gameCommission.rate);
  const totalPot = activeGame?.totalPot ?? selected.length * parseFloat(betAmount || '0');
  const agentCut = activeGame?.agentCommission ?? totalPot * (commissionRate / 100);
  const maxBalls = activeGame?.maxBalls ?? DRAW_BALL_COUNT;
  const drawCount = called.length;

  useEffect(() => { loadVoices(); }, []);

  useEffect(() => {
    if (agent?.commissionRate != null && !activeGame) {
      setCommissionPercent(String(agent.commissionRate));
    }
  }, [agent?.commissionRate, activeGame]);

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    if (lang === 'en') {
      setVoice('ENGLISH');
    } else if (voice === 'ENGLISH') {
      setVoice('AMHARIC_MALE');
    }
  };

  const handleVoiceChange = (v: string) => {
    setVoice(v);
    if (v === 'ENGLISH') setLanguage('en');
    else setLanguage('am');
  };

  useEffect(() => {
    ipc<ActiveGame | null>('games:active').then((game) => {
      if (game) {
        setActiveGame(game);
        setCalled(game.drawnNumbers ?? []);
        setLastDrawn(game.drawnNumbers?.length ? game.drawnNumbers[game.drawnNumbers.length - 1] : null);
        setSelected(game.selectedNumbers ?? []);
        setBetAmount(String(game.betAmount));
        setIsPaused(game.status === 'PAUSED');
        setGameCommission({
          rate: game.commissionRate ?? 20,
          pot: game.totalPot ?? 0,
          agentCut: game.agentCommission ?? 0,
        });
        if (game.voiceType) setVoice(game.voiceType);
        if (game.language) setLanguage(game.language);
        if (game.commissionRate != null) setCommissionPercent(String(game.commissionRate));
      }
    });
  }, []);

  const toggleNumber = (num: number) => {
    if (activeGame) return;
    setSelected((prev) => {
      if (prev.includes(num)) {
        return prev.filter((n) => n !== num);
      }
      speakCartella(num, voice, language);
      return [...prev, num];
    });
  };

  const handleCreateGame = async () => {
    const bet = parseFloat(betAmount);
    if (isNaN(bet) || bet < MIN_BET) {
      setBetError(`Bet must be at least ${MIN_BET} ETB.`);
      return;
    }
    if (selected.length === 0) {
      setBetError('Select at least one card number.');
      return;
    }
    const commission = parseFloat(commissionPercent);
    if (isNaN(commission) || commission < 0 || commission > 100) {
      setBetError('Commission must be between 0% and 100%.');
      return;
    }
    setBetError('');
    setCreating(true);

    const result = await ipc<{
      success: boolean;
      data?: ActiveGame & { commissionRate: number; totalPot: number; agentCommission: number; maxBalls: number };
      error?: string;
    }>('games:create', {
      betAmount: bet,
      winningPattern: pattern,
      drawSpeedMs: interval,
      voiceType: voice,
      language,
      commissionRate: commission,
      jackpotMaximumCalls: parseInt(jackpotMaxCalls, 10) || DEFAULT_JACKPOT_MAX_CALLS,
      selectedNumbers: selected,
    });

    setCreating(false);
    if (result.success && result.data) {
      setActiveGame({ ...result.data, selectedNumbers: selected, drawnNumbers: [], drawSpeedMs: interval, status: 'RUNNING' });
      setCalled([]);
      setLastDrawn(null);
      setIsPaused(false);
      setGameCommission({
        rate: result.data.commissionRate,
        pot: result.data.totalPot,
        agentCut: result.data.agentCommission,
      });
      await refreshBalance();
    } else {
      setBetError(result.error ?? 'Failed to create game');
    }
  };

  const handleDraw = useCallback(async () => {
    if (!activeGame || isPaused) return;
    const result = await ipc<{
      success: boolean;
      data?: {
        number: number;
        drawCount: number;
        maxBalls: number;
        voiceType: string;
        language: string;
        winners?: Array<{ cardNumber: string; prizeAmount: number }>;
        gamePaused?: boolean;
      };
      error?: string;
    }>('games:draw', activeGame.id);

    if (result.success && result.data) {
      const { number, voiceType, language: lang, winners, gamePaused } = result.data;
      setCalled((prev) => [...prev, number]);
      setLastDrawn(number);
      setCalledModalOpen(true);
      speakBall(number, voiceType ?? voice, lang ?? language);
      if (gamePaused || (winners && winners.length > 0)) {
        setAutoDraw(false);
        setIsPaused(true);
        if (winners?.length) {
          setCheckModalOpen(true);
        }
      }
    }
  }, [activeGame, isPaused, voice, language]);

  useEffect(() => {
    if (autoDraw && activeGame && !isPaused) {
      autoDrawRef.current = setInterval(handleDraw, interval);
    }
    return () => { if (autoDrawRef.current) clearInterval(autoDrawRef.current); };
  }, [autoDraw, activeGame, interval, handleDraw, isPaused]);

  const handleBingoClaim = async () => {
    if (!activeGame) return;
    setAutoDraw(false);
    await ipc('games:pause', activeGame.id);
    setIsPaused(true);
    setCheckModalOpen(true);
  };

  const handleValidateCard = async (cardNumber: string) => {
    if (!activeGame) return { valid: false, message: 'No active game' };
    const result = await ipc<{
      success: boolean;
      valid: boolean;
      message: string;
      prizeAmount?: number;
    }>('games:validate-winner', activeGame.id, cardNumber);

    if (result.valid && result.prizeAmount) {
      setProfit(result.prizeAmount);
      setActiveGame((g) => g ? { ...g, status: 'PAUSED' } : g);
    }
    return { valid: result.valid, message: result.message, prizeAmount: result.prizeAmount };
  };

  const handleResume = async () => {
    if (!activeGame) return;
    await ipc('games:resume', activeGame.id);
    setIsPaused(false);
    setCheckModalOpen(false);
  };

  const handleEndGame = async () => {
    if (!activeGame) return;
    setAutoDraw(false);
    const result = await ipc<{ success: boolean; data?: { agentRevenue: number } }>('games:end', activeGame.id);
    if (result.success && result.data) {
      setProfit(result.data.agentRevenue);
      setActiveGame(null);
      setCalled([]);
      setLastDrawn(null);
      setCheckModalOpen(false);
      setCalledModalOpen(false);
      await refreshBalance();
    }
  };

  return (
    <div>
      {/* Live draw counter */}
      {activeGame && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-700 p-5 text-white shadow-lg">
          <div>
            <p className="text-sm opacity-80">{activeGame.gameCode} · {isPaused ? 'PAUSED' : 'LIVE'}</p>
            <p className="text-4xl font-black tracking-tight">{drawCount}/{maxBalls}</p>
            <p className="text-sm opacity-80">Balls called (1–75)</p>
          </div>
          {lastDrawn !== null && (
            <div className="flex h-24 min-w-[7rem] flex-col items-center justify-center rounded-2xl bg-white/20 px-4 backdrop-blur">
              <span className="text-2xl font-black tracking-wide">{getBallLabel(lastDrawn).replace('-', ' ')}</span>
              {language === 'am' && (
                <span className="mt-1 text-xs font-medium leading-tight opacity-90">{toAmharicNumberWord(lastDrawn)}</span>
              )}
            </div>
          )}
          <div className="text-right text-sm">
            <p>Pot: <strong>{totalPot.toFixed(0)} ETB</strong></p>
            <p>Commission: <strong>{commissionRate}%</strong></p>
            <p>Your cut: <strong>{agentCut.toFixed(0)} ETB</strong></p>
          </div>
        </div>
      )}

      {/* Config bar */}
      <div className="mb-4 flex flex-wrap items-end gap-4 rounded-xl bg-white p-4 shadow-sm">
        <div className="flex-1 min-w-[100px]">
          <label className="mb-1 block text-sm font-medium text-gray-700">Bet (ETB)</label>
          <input type="number" value={betAmount} onChange={(e) => { setBetAmount(e.target.value); setBetError(''); }}
            disabled={!!activeGame}
            className="w-full rounded-lg border px-3 py-2 text-sm disabled:bg-gray-100" />
          {betError && <p className="mt-1 text-xs text-red-500">{betError}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Interval</label>
          <select value={interval} onChange={(e) => setInterval_(Number(e.target.value))} disabled={!!activeGame}
            className="rounded-lg border px-3 py-2 text-sm disabled:bg-gray-100">
            {DRAW_INTERVALS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Pattern</label>
          <select value={pattern} onChange={(e) => setPattern(e.target.value)} disabled={!!activeGame}
            className="rounded-lg border px-3 py-2 text-sm disabled:bg-gray-100">
            {WINNING_PATTERNS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        {pattern === 'EARLY_JACKPOT' && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Jackpot max calls</label>
            <input
              type="number"
              min={1}
              max={75}
              value={jackpotMaxCalls}
              onChange={(e) => setJackpotMaxCalls(e.target.value)}
              disabled={!!activeGame}
              className="w-full rounded-lg border px-3 py-2 text-sm disabled:bg-gray-100"
            />
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Voice</label>
          <select value={voice} onChange={(e) => handleVoiceChange(e.target.value)} disabled={!!activeGame}
            className="rounded-lg border px-3 py-2 text-sm disabled:bg-gray-100">
            {VOICE_TYPES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Language</label>
          <select value={language} onChange={(e) => handleLanguageChange(e.target.value)} disabled={!!activeGame}
            className="rounded-lg border px-3 py-2 text-sm disabled:bg-gray-100">
            <option value="am">Amharic</option>
            <option value="en">English</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Commission %</label>
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={commissionPercent}
            onChange={(e) => setCommissionPercent(e.target.value)}
            disabled={!!activeGame}
            className="w-full rounded-lg border px-3 py-2 text-sm disabled:bg-gray-100"
          />
          <p className="mt-1 text-xs text-gray-500">Your cut: {agentCut.toFixed(0)} ETB from pot</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Est. earnings</label>
          <div className="rounded-lg border bg-gray-50 px-3 py-2 text-sm font-semibold text-indigo-700">
            {commissionRate}% · {agentCut.toFixed(0)} ETB
          </div>
        </div>
        {!activeGame ? (
          <button onClick={handleCreateGame} disabled={creating || selected.length === 0}
            className="rounded-lg bg-green-600 px-6 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
            {creating ? 'Starting...' : `Start Game (${selected.length} cards)`}
          </button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setCalledModalOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
              <ListOrdered className="h-4 w-4" /> Called ({drawCount}/{maxBalls})
            </button>
            <button onClick={handleDraw} disabled={isPaused}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Draw</button>
            <button onClick={() => setAutoDraw(!autoDraw)} disabled={isPaused}
              className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${autoDraw ? 'bg-orange-500' : 'bg-gray-500'} disabled:opacity-50`}>
              {autoDraw ? 'Stop Auto' : 'Auto Draw'}
            </button>
            <button onClick={handleBingoClaim}
              className="inline-flex items-center gap-1 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-bold text-white hover:bg-yellow-600">
              <Megaphone className="h-4 w-4" /> BINGO!
            </button>
            {isPaused && (
              <button onClick={handleResume}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
                <Play className="h-4 w-4" /> Resume
              </button>
            )}
            <button onClick={() => setCheckModalOpen(true)} disabled={!isPaused}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Check Card</button>
            <button onClick={handleEndGame}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white">End Game</button>
          </div>
        )}
      </div>

      <div className="mb-4 flex items-center gap-2 text-sm">
        <span className="font-medium">Wallet profit (game):</span>
        <span className="font-semibold">{showProfit ? `${profit.toFixed(2)} ETB` : '****'}</span>
        <button onClick={() => setShowProfit(!showProfit)} className="text-blue-500">
          {showProfit ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        {!activeGame && selected.length > 0 && (
          <span className="ml-2 text-gray-500">
            Stake: {(selected.length * parseFloat(betAmount || '0')).toFixed(0)} ETB from wallet
          </span>
        )}
      </div>

      <NumberGrid selected={selected} onToggle={toggleNumber}
        onClear={() => setSelected([])} disabled={!!activeGame} />

      <CalledNumbersModal
        open={calledModalOpen && !!activeGame}
        onClose={() => setCalledModalOpen(false)}
        called={called}
        lastDrawn={lastDrawn}
        maxBalls={maxBalls}
        language={language}
      />

      <CheckCardModal
        open={checkModalOpen}
        onClose={() => setCheckModalOpen(false)}
        onValidate={handleValidateCard}
      />
    </div>
  );
}
