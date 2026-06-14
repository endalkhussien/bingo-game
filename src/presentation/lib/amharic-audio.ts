/** Offline Amharic ball announcements from public/sounds/am/{n}.mp3 */
let currentAudio: HTMLAudioElement | null = null;

export function amharicAudioUrl(number: number): string {
  return `/sounds/am/${number}.mp3`;
}

export function playAmharicBall(number: number): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);

  return new Promise((resolve) => {
    try {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
      }
      const audio = new Audio(amharicAudioUrl(number));
      currentAudio = audio;
      audio.onended = () => resolve(true);
      audio.onerror = () => resolve(false);
      const p = audio.play();
      if (p) {
        p.catch(() => resolve(false));
      }
    } catch {
      resolve(false);
    }
  });
}
