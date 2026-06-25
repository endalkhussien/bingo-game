import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import { buildCartellaAnnouncement } from '../../src/shared/tts/voice-map';
import { getBallCallSpeechParts } from '../../src/shared/tts/ball-call';
import { computeBallCallPath, computeCartellaPaths, computeGameEventPath, type GameEventKey } from '../../src/shared/tts/bundled-audio-catalog';
import { DEFAULT_AMHARIC_VOICE } from '../../src/shared/tts/voice-packs';
import { ENABLE_CARTELLA_PICK_VOICE } from '../../src/shared/constants';
import { resolveFirstMediaFile } from '../utils/media-protocol';

const execFileAsync = promisify(execFile);

export interface SpeakResult {
  success: boolean;
  engine?: string;
  error?: string;
}

async function playAudioFile(audioPath: string): Promise<boolean> {
  if (!fs.existsSync(audioPath)) return false;

  if (process.platform === 'win32') {
    const ps = `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName presentationCore
$path = [System.Environment]::GetEnvironmentVariable('WALIYA_AUDIO_PATH')
if (-not $path -or -not (Test-Path -LiteralPath $path)) { exit 1 }
$media = New-Object System.Windows.Media.MediaPlayer
$media.Volume = 1.0
$media.Open([uri]::new($path))
$media.Play()
$deadline = (Get-Date).AddSeconds(4)
while (-not $media.NaturalDuration.HasTimeSpan -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 40 }
if ($media.NaturalDuration.HasTimeSpan) {
  $ms = [Math]::Min(15000, [int]$media.NaturalDuration.TimeSpan.TotalMilliseconds + 200)
  Start-Sleep -Milliseconds $ms
} else { exit 1 }
$media.Stop()
$media.Close()
`;
    try {
      await execFileAsync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps], {
        timeout: 20000,
        windowsHide: true,
        env: { ...process.env, WALIYA_AUDIO_PATH: path.resolve(audioPath) },
      });
      return true;
    } catch {
      return false;
    }
  }

  for (const cmd of ['mpg123', 'ffplay', 'mpv']) {
    try {
      const args = cmd === 'ffplay'
        ? ['-nodisp', '-autoexit', '-loglevel', 'quiet', audioPath]
        : cmd === 'mpv'
          ? ['--no-video', audioPath]
          : ['-q', audioPath];
      await execFileAsync(cmd, args, { timeout: 10000 });
      return true;
    } catch {
      // try next player
    }
  }
  return false;
}

async function playEnglishLetter(letter: string): Promise<boolean> {
  if (await speakWindowsSapi(letter, 'en-US')) return true;
  return speakEspeak(letter, 'en', false);
}

/** Play first existing bundled clip from public/ (out/ after build). */
export async function playBundledClip(relativePaths: string[]): Promise<SpeakResult> {
  const audioPath = resolveFirstMediaFile(relativePaths);
  if (!audioPath) {
    return { success: false, error: `Missing clip: ${relativePaths.join(' | ')}` };
  }
  const ok = await playAudioFile(audioPath);
  return ok
    ? { success: true, engine: 'bundled-mp3' }
    : { success: false, error: `Playback failed: ${audioPath}` };
}

export async function playBundledBallCall(number: number): Promise<SpeakResult> {
  return playBundledClip([computeBallCallPath(number)]);
}

export async function playBundledGameEvent(event: GameEventKey): Promise<SpeakResult> {
  return playBundledClip([computeGameEventPath(event)]);
}

async function playBundledCartella(number: number): Promise<boolean> {
  const result = await playBundledClip(computeCartellaPaths(number));
  return result.success;
}

async function speakWindowsSapi(text: string, lang: string): Promise<boolean> {
  if (process.platform !== 'win32') return false;

  const tmpFile = path.join(os.tmpdir(), `waliya-tts-${Date.now()}.txt`);
  fs.writeFileSync(tmpFile, text, 'utf8');
  const safePath = tmpFile.replace(/\\/g, '\\\\').replace(/'/g, "''");
  const langPrefix = lang.slice(0, 2);

  const ps = `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voices = $synth.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo }
$match = @($voices | Where-Object { $_.Culture.Name -like '${langPrefix}*' })
if ($match.Count -eq 0) { throw 'No matching voice' }
$picked = $match | Select-Object -First 1
$synth.SelectVoice($picked.Name)
$text = Get-Content -LiteralPath '${safePath}' -Encoding UTF8 -Raw
$synth.Rate = 0
$synth.Speak($text)
Remove-Item -LiteralPath '${safePath}' -Force
`;

  try {
    await execFileAsync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps], {
      timeout: 15000,
      windowsHide: true,
    });
    return true;
  } catch {
    try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
    return false;
  }
}

async function speakEspeak(text: string, lang: string, preferFemale: boolean): Promise<boolean> {
  const voiceLang = lang.startsWith('am') ? 'am' : 'en';
  const variant = preferFemale ? '+f3' : '+m3';
  for (const cmd of ['espeak-ng', 'espeak']) {
    try {
      await execFileAsync(cmd, ['-v', `${voiceLang}${variant}`, '-s', '150', text], {
        timeout: 10000,
        windowsHide: true,
      });
      return true;
    } catch {
      // try next
    }
  }
  return false;
}

/** Amharic ball calls — play bundled MP3 from public/audio/ via native player. */
export async function speakBallCall(
  number: number,
  language: string,
  voiceType: string,
): Promise<SpeakResult> {
  const useBundled = language === 'am' || language.startsWith('am') || voiceType === DEFAULT_AMHARIC_VOICE;
  if (useBundled) {
    return playBundledBallCall(number);
  }

  const preferFemale = voiceType.includes('FEMALE');
  const { letter, numberText } = getBallCallSpeechParts(number, language);

  if (letter) {
    if (!(await playEnglishLetter(letter))) {
      if (!(await speakWindowsSapi(letter, 'en-US'))) {
        await speakEspeak(letter, 'en', preferFemale);
      }
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  if (await speakWindowsSapi(numberText, 'en-US')) {
    return { success: true, engine: 'windows-sapi' };
  }
  if (await speakEspeak(numberText, 'en', preferFemale)) {
    return { success: true, engine: 'espeak-ng' };
  }

  return { success: false, error: 'No TTS engine available.' };
}

export async function speakNumber(
  number: number,
  voiceType: string,
  language: string,
  mode: 'ball' | 'cartella' = 'cartella',
): Promise<SpeakResult> {
  if (mode === 'ball') {
    return speakBallCall(number, language, voiceType);
  }

  if (!ENABLE_CARTELLA_PICK_VOICE) {
    return { success: false, error: 'Cartella pick voice is disabled.' };
  }

  const payload = buildCartellaAnnouncement(number, voiceType, language);

  if (payload.isAmharic) {
    if (await playBundledCartella(number)) {
      return { success: true, engine: 'bundled-mp3' };
    }
    return { success: false, error: 'Cartella MP3 missing.' };
  }

  if (await speakWindowsSapi(payload.text, payload.lang)) {
    return { success: true, engine: 'windows-sapi' };
  }

  if (await speakEspeak(payload.text, 'en', voiceType.includes('FEMALE'))) {
    return { success: true, engine: 'espeak-ng' };
  }

  return { success: false, error: 'TTS failed' };
}

export async function speakPlainText(text: string, lang: string, voiceType: string): Promise<SpeakResult> {
  if (lang.startsWith('am')) {
    return { success: false, error: 'Amharic uses bundled MP3 in the app window.' };
  }

  const preferFemale = voiceType.includes('FEMALE');
  if (await speakWindowsSapi(text, lang)) {
    return { success: true, engine: 'windows-sapi' };
  }
  if (await speakEspeak(text, lang, preferFemale)) {
    return { success: true, engine: 'espeak-ng' };
  }
  return { success: false, error: 'TTS failed' };
}

export async function listInstalledVoices(): Promise<string[]> {
  if (process.platform !== 'win32') return [];

  const ps = `
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.GetInstalledVoices() | ForEach-Object { "$($_.VoiceInfo.Name) [$($_.VoiceInfo.Culture.Name)]" }
`;

  try {
    const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-Command', ps], { timeout: 10000 });
    return stdout.trim().split('\n').map((l) => l.trim()).filter(Boolean);
  } catch {
    return [];
  }
}
