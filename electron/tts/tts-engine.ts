import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import { app } from 'electron';
import { buildAnnouncement } from '../../src/shared/tts/voice-map';

const execFileAsync = promisify(execFile);

export interface SpeakResult {
  success: boolean;
  engine?: string;
  error?: string;
}

/** Bundled offline Amharic MP3 clips (public/sounds/am/{n}.mp3) */
async function playBundledAmharic(number: number): Promise<boolean> {
  const candidates = [
    path.join(process.cwd(), 'public', 'sounds', 'am', `${number}.mp3`),
    path.join(process.cwd(), 'out', 'sounds', 'am', `${number}.mp3`),
    path.join(app.getAppPath(), 'out', 'sounds', 'am', `${number}.mp3`),
    path.join(app.getAppPath(), 'public', 'sounds', 'am', `${number}.mp3`),
  ];

  const audioPath = candidates.find((p) => fs.existsSync(p));
  if (!audioPath) return false;

  if (process.platform === 'win32') {
    const uri = audioPath.replace(/\\/g, '/');
    const ps = `
Add-Type -AssemblyName presentationCore
$media = New-Object System.Windows.Media.MediaPlayer
$media.Open([uri]::new('file:///${uri}'))
$media.Play()
$deadline = (Get-Date).AddSeconds(8)
while (-not $media.NaturalDuration.HasTimeSpan -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 40 }
if ($media.NaturalDuration.HasTimeSpan) {
  Start-Sleep -Milliseconds ([int]$media.NaturalDuration.TimeSpan.TotalMilliseconds + 150)
} else { Start-Sleep -Seconds 2 }
$media.Stop()
$media.Close()
`;
    try {
      await execFileAsync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps], {
        timeout: 12000,
        windowsHide: true,
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

/** Windows SAPI — works when Amharic speech pack is installed */
async function speakWindowsSapi(text: string, lang: string, preferFemale: boolean): Promise<boolean> {
  if (process.platform !== 'win32') return false;

  const tmpFile = path.join(os.tmpdir(), `tebib-tts-${Date.now()}.txt`);
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

/** espeak-ng — free, supports Amharic (am). Install: https://github.com/espeak-ng/espeak-ng/releases */
async function speakEspeak(text: string, lang: string, preferFemale: boolean): Promise<boolean> {
  const voiceLang = lang.startsWith('am') ? 'am' : 'en';
  const variant = preferFemale ? '+f3' : '+m3';
  const commands = ['espeak-ng', 'espeak'];

  for (const cmd of commands) {
    try {
      await execFileAsync(cmd, ['-v', `${voiceLang}${variant}`, '-s', '150', text], {
        timeout: 10000,
        windowsHide: true,
      });
      return true;
    } catch {
      // try next command
    }
  }
  return false;
}

export async function speakNumber(
  number: number,
  voiceType: string,
  language: string,
): Promise<SpeakResult> {
  const payload = buildAnnouncement(number, voiceType, language);

  if (payload.isAmharic && await playBundledAmharic(number)) {
    return { success: true, engine: 'bundled-amharic-audio' };
  }

  if (await speakWindowsSapi(payload.text, payload.lang, payload.preferFemale)) {
    return { success: true, engine: 'windows-sapi' };
  }

  if (payload.isAmharic && await speakEspeak(payload.text, payload.lang, payload.preferFemale)) {
    return { success: true, engine: 'espeak-ng' };
  }

  if (!payload.isAmharic && await speakEspeak(payload.text, 'en', payload.preferFemale)) {
    return { success: true, engine: 'espeak-ng' };
  }

  return {
    success: false,
    error: payload.isAmharic
      ? 'No Amharic voice found. Install Windows Amharic speech pack or espeak-ng.'
      : 'No TTS engine available.',
  };
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
