import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import { app } from 'electron';
import { buildCartellaAnnouncement } from '../../src/shared/tts/voice-map';
import { getBallCallSpeechParts } from '../../src/shared/tts/ball-call';
import { formatAmharicBallCall } from '../../src/shared/tts/amharic-ball-call';
import { DRAW_BALL_COUNT } from '../../src/shared/brand';
import { getBallLetter } from '../../src/domain/services/bingo-engine';

const execFileAsync = promisify(execFile);

export interface SpeakResult {
  success: boolean;
  engine?: string;
  error?: string;
}

function resolveSoundPath(folder: 'am' | 'en' | 'audio' | 'cartella', ...parts: string[]): string | undefined {
  const bases: string[] = [];
  const appPath = app.getAppPath();
  if (folder === 'audio') {
    bases.push(
      path.join(appPath, 'out', 'audio'),
      path.join(process.cwd(), 'out', 'audio'),
      path.join(process.cwd(), 'public', 'audio'),
    );
  } else if (folder === 'cartella') {
    bases.push(
      path.join(appPath, 'out', 'sounds', 'cartella'),
      path.join(process.cwd(), 'out', 'sounds', 'cartella'),
      path.join(process.cwd(), 'public', 'sounds', 'cartella'),
      path.join(appPath, 'public', 'sounds', 'cartella'),
    );
  }
  if (folder !== 'audio' && folder !== 'cartella') {
    bases.push(
      path.join(appPath, 'out', 'sounds', folder),
      path.join(process.cwd(), 'out', 'sounds', folder),
      path.join(process.cwd(), 'public', 'sounds', folder),
      path.join(appPath, 'public', 'sounds', folder),
    );
  }

  if (app.isPackaged) {
    const unpackedOut = path.join(process.resourcesPath, 'app.asar.unpacked', 'out');
    if (folder === 'audio') {
      bases.unshift(path.join(unpackedOut, 'audio'));
    } else if (folder === 'cartella') {
      bases.unshift(path.join(unpackedOut, 'sounds', 'cartella'));
    } else {
      bases.unshift(path.join(unpackedOut, 'sounds', folder));
    }
    if (appPath.endsWith('.asar')) {
      const siblingUnpacked = path.join(path.dirname(appPath), 'app.asar.unpacked', 'out');
      if (folder === 'audio') {
        bases.unshift(path.join(siblingUnpacked, 'audio'));
      } else if (folder === 'cartella') {
        bases.unshift(path.join(siblingUnpacked, 'sounds', 'cartella'));
      } else {
        bases.unshift(path.join(siblingUnpacked, 'sounds', folder));
      }
    }
  } else if (folder === 'audio') {
    bases.unshift(path.join(appPath, 'public', 'audio'));
  } else if (folder === 'cartella') {
    bases.unshift(path.join(appPath, 'public', 'sounds', 'cartella'));
  }

  for (const base of bases) {
    const full = path.join(base, ...parts);
    if (fs.existsSync(full)) return full;
  }
  return undefined;
}

const resolveAmharicPath = (...parts: string[]) => resolveSoundPath('am', ...parts);
const resolveEnglishPath = (...parts: string[]) => resolveSoundPath('en', ...parts);

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
  $ms = [Math]::Min(6000, [int]$media.NaturalDuration.TimeSpan.TotalMilliseconds + 150)
  Start-Sleep -Milliseconds $ms
} else { exit 1 }
$media.Stop()
$media.Close()
`;
    try {
      await execFileAsync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps], {
        timeout: 8000,
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

async function playBundledAmharic(number: number): Promise<boolean> {
  const audioPath = resolveAmharicPath(`${number}.mp3`);
  if (!audioPath) return false;
  return playAudioFile(audioPath);
}

async function playEnglishLetter(letter: string): Promise<boolean> {
  const english = resolveEnglishPath('letters', `${letter}.mp3`);
  if (english && await playAudioFile(english)) return true;
  const fallback = resolveAmharicPath('letters', `${letter}.mp3`);
  return fallback ? playAudioFile(fallback) : false;
}

async function playBundledCartella(number: number): Promise<boolean> {
  const audioPath = resolveSoundPath('cartella', `${number}.mp3`);
  if (!audioPath) return false;
  return playAudioFile(audioPath);
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

/** Combined Amharic phrase — MP3 is played in renderer; this is speech-only fallback. */
export async function speakBallCall(
  number: number,
  language: string,
  voiceType: string,
): Promise<SpeakResult> {
  const preferFemale = voiceType.includes('FEMALE');
  const { letter, numberText } = getBallCallSpeechParts(number, language);

  if (language === 'am' && number <= DRAW_BALL_COUNT) {
    const phrase = formatAmharicBallCall(number);
    if (await speakWindowsSapi(phrase, 'am-ET')) {
      return { success: true, engine: 'windows-sapi' };
    }
    if (await speakEspeak(phrase, 'am-ET', preferFemale)) {
      return { success: true, engine: 'espeak-ng' };
    }
    return { success: false, error: 'No Amharic voice for ball call.' };
  }

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

  const payload = buildCartellaAnnouncement(number, voiceType, language);

  if (payload.isAmharic && await playBundledCartella(number)) {
    return { success: true, engine: 'bundled-mp3' };
  }

  if (await speakWindowsSapi(payload.text, payload.lang)) {
    return { success: true, engine: 'windows-sapi' };
  }

  if (payload.isAmharic && await speakEspeak(payload.text, payload.lang, voiceType.includes('FEMALE'))) {
    return { success: true, engine: 'espeak-ng' };
  }

  if (!payload.isAmharic && await speakEspeak(payload.text, 'en', voiceType.includes('FEMALE'))) {
    return { success: true, engine: 'espeak-ng' };
  }

  return { success: false, error: 'TTS failed' };
}

export async function speakPlainText(text: string, lang: string, voiceType: string): Promise<SpeakResult> {
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
