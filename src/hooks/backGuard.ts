import { useEffect, useRef, useState } from 'react';
import { isMobileUserAgent } from '../utils/format';

// Back-gesture handling for the installed Android PWA.
//
// Uses CloseWatcher (Chrome 120+) instead of history.pushState traps:
// - Pushed entries without user activation are skipped by Chrome's back
//   button, so a history trap cannot be re-armed after the gesture itself.
// - Leaving extra history entries makes window.close() a no-op (scripts may
//   close only windows with a single history entry), so "OK = exit" breaks.
// CloseWatcher touches neither. Its abuse prevention: `cancel` (the only
// preventable step) fires only if there was a user activation since the
// last back; otherwise the watcher goes straight to `close` and is gone.
//
// Enabled only in standalone display mode on mobile UAs: browser tabs keep
// the native back behavior, and desktop PWAs would otherwise map Esc to
// "exit app". Without CloseWatcher support everything is a no-op.

interface CloseWatcherLike {
  oncancel: ((e: Event) => void) | null;
  onclose: ((e: Event) => void) | null;
  destroy(): void;
}
type CloseWatcherCtor = new () => CloseWatcherLike;

// Not in TypeScript's DOM lib yet.
function getCloseWatcher(): CloseWatcherCtor | null {
  return (
    (window as unknown as { CloseWatcher?: CloseWatcherCtor }).CloseWatcher ??
    null
  );
}

const STANDALONE = '(display-mode: standalone)';

function isAvailable(): boolean {
  return getCloseWatcher() != null && isMobileUserAgent();
}

export function useBackGuardEnabled(): boolean {
  const [enabled, setEnabled] = useState(
    () => isAvailable() && window.matchMedia(STANDALONE).matches,
  );
  useEffect(() => {
    if (!isAvailable()) return;
    const mql = window.matchMedia(STANDALONE);
    const onChange = () => setEnabled(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return enabled;
}

// Closes an overlay (dialog / dropdown / menu) on back while it is open.
// The watcher is created right after the tap that opened the overlay, so it
// forms its own group above the exit guard and one back closes only it.
export function useCloseOnBack(open: boolean, onClose: () => void): void {
  const enabled = useBackGuardEnabled();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const Ctor = getCloseWatcher();
    if (!enabled || !open || !Ctor) return;
    const w = new Ctor();
    w.onclose = () => onCloseRef.current();
    return () => w.destroy();
  }, [enabled, open]);
}

export function exitApp(): void {
  // Allowed because no history entries are ever added (see header comment).
  window.close();
}

// Bottom-most watcher: back with nothing open shows the exit confirm; back
// while that confirm is showing exits the app.
export function useExitConfirmOnBack(
  exitConfirmOpen: boolean,
  openExitConfirm: () => void,
): void {
  const enabled = useBackGuardEnabled();
  const openRef = useRef(exitConfirmOpen);
  openRef.current = exitConfirmOpen;
  const openExitRef = useRef(openExitConfirm);
  openExitRef.current = openExitConfirm;
  // Re-created whenever the confirm opens or closes. On a real device, a
  // watcher kept across "back → confirm → Cancel" (or re-created inside the
  // previous one's close event) did not catch the next back and the app
  // exited. Re-creating on close runs right after the Cancel tap, so the new
  // watcher gets its own group with fresh user activation. If the one made
  // while the confirm is up is ineffective, back falls through to the native
  // exit — the intended result in that state anyway.
  useEffect(() => {
    const Ctor = getCloseWatcher();
    if (!enabled || !Ctor) return;
    const w = new Ctor();
    w.oncancel = (e) => {
      // Confirm already up: let it through to `close` → exit.
      if (openRef.current) return;
      e.preventDefault();
      openExitRef.current();
    };
    w.onclose = () => {
      if (openRef.current) {
        exitApp();
        return;
      }
      // No user activation since the last back, so `cancel` was skipped and
      // this watcher is spent. Still ask; opening re-arms via this effect.
      openExitRef.current();
    };
    return () => w.destroy();
  }, [enabled, exitConfirmOpen]);
}
