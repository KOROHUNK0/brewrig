import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Timer Picture-in-Picture (experimental). The timer is drawn onto a canvas
// whose captureStream() feeds a muted <video>, which is then put into video
// PiP. Document PiP would be simpler but is desktop-only, while video PiP
// also works on Android Chrome. The PiP window's play/pause buttons are wired
// through Media Session action handlers (MediaStream video shows no play/pause
// button unless both handlers are registered).

export interface PipView {
  time: string;
  overtime: string;
  status: string;
  target: string;
  finished: boolean;
  paused: boolean;
  dark: boolean;
}

const W = 480;
const H = 270;

// Mirrors the --bg / --text-* / --accent tokens in index.css.
const PALETTE = {
  dark: { bg: '#1a1108', text: '#f5ead8', muted: '#c4a882', accent: '#c8874a' },
  light: { bg: '#f5ede0', text: '#1a0e04', muted: '#4a2e12', accent: '#a85f2a' },
};

export function isPipSupported(): boolean {
  return (
    document.pictureInPictureEnabled === true &&
    'captureStream' in HTMLCanvasElement.prototype &&
    'requestPictureInPicture' in HTMLVideoElement.prototype
  );
}

function draw(canvas: HTMLCanvasElement, v: PipView): void {
  const g = canvas.getContext('2d');
  if (!g) return;
  const c = v.dark ? PALETTE.dark : PALETTE.light;
  g.fillStyle = c.bg;
  g.fillRect(0, 0, W, H);
  g.textAlign = 'center';
  g.textBaseline = 'middle';

  g.fillStyle = v.finished ? c.accent : c.muted;
  g.font = '600 30px "Noto Sans JP", sans-serif';
  g.fillText(v.status, W / 2, 48);

  g.fillStyle = v.finished ? c.accent : v.paused ? c.muted : c.text;
  g.font = '500 96px "DM Mono", monospace';
  g.fillText(v.time, W / 2, v.overtime ? 128 : 140);

  // Overtime sits small under the time (only after finish, when no target).
  if (v.overtime) {
    g.fillStyle = c.muted;
    g.font = '500 30px "DM Mono", monospace';
    g.fillText(v.overtime, W / 2, 205);
  }

  if (v.target) {
    g.fillStyle = c.accent;
    g.font = '700 36px "Noto Sans JP", sans-serif';
    g.fillText(v.target, W / 2, 230);
  }
}

function setHandler(
  action: MediaSessionAction,
  fn: MediaSessionActionHandler | null,
): void {
  try {
    navigator.mediaSession.setActionHandler(action, fn);
  } catch {
    // Unsupported action on this browser.
  }
}

export function useTimerPip(
  view: PipView,
  isPlaying: boolean,
  onPlay: () => void,
  onPause: () => void,
) {
  const supported = useMemo(isPipSupported, []);
  const [active, setActive] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const viewRef = useRef(view);
  const handlersRef = useRef({ onPlay, onPause });
  useEffect(() => {
    viewRef.current = view;
    handlersRef.current = { onPlay, onPause };
  });

  const teardown = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      (video.srcObject as MediaStream | null)
        ?.getTracks()
        .forEach((tr) => tr.stop());
      video.srcObject = null;
      video.remove();
    }
    videoRef.current = null;
    canvasRef.current = null;
    if ('mediaSession' in navigator) {
      setHandler('play', null);
      setHandler('pause', null);
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
    }
    setActive(false);
  }, []);

  const open = useCallback(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    draw(canvas, viewRef.current);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    // Kept in the DOM (some browsers refuse PiP for detached video) but
    // visually hidden.
    video.style.cssText =
      'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:0;bottom:0';
    video.srcObject = canvas.captureStream();
    document.body.appendChild(video);
    canvasRef.current = canvas;
    videoRef.current = video;

    video.addEventListener('enterpictureinpicture', () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({ title: 'BrewRig' });
        setHandler('play', () => handlersRef.current.onPlay());
        setHandler('pause', () => handlersRef.current.onPause());
      }
      setActive(true);
    });
    video.addEventListener('leavepictureinpicture', teardown, { once: true });

    try {
      await video.play();
      await video.requestPictureInPicture();
    } catch (e) {
      console.warn(e);
      teardown();
    }
  }, [teardown]);

  const toggle = useCallback(() => {
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    } else {
      void open();
    }
  }, [open]);

  // Redraw whenever the displayed state changes, and mirror isPlaying onto the
  // <video> itself. The PiP play/pause button follows the *actual* playback
  // state, which stays "playing" while any media element plays regardless of
  // the declared playbackState — so an always-playing video leaves the button
  // stuck on pause and the "play" action never fires. While stopped, the video
  // plays just long enough for the new frame to reach the stream, then pauses.
  useEffect(() => {
    if (!active || !canvasRef.current) return;
    draw(canvasRef.current, view);
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    if (isPlaying) return;
    const id = window.setTimeout(() => video.pause(), 200);
    return () => clearTimeout(id);
  }, [
    active,
    isPlaying,
    view.time,
    view.overtime,
    view.status,
    view.target,
    view.finished,
    view.paused,
    view.dark,
  ]);

  // Close PiP on unmount.
  useEffect(
    () => () => {
      if (videoRef.current && document.pictureInPictureElement === videoRef.current) {
        document.exitPictureInPicture().catch(() => {});
      }
    },
    [],
  );

  return { supported, active, toggle };
}
