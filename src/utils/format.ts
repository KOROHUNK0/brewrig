/** Format seconds as mm:ss (used for the main timer and timeline times). */
export function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
}

/** Detect a mobile UA — the SE volume ceiling is higher there. */
export function isMobileUserAgent(): boolean {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}
