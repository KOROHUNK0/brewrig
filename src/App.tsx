import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ConfirmState,
  FlavorKey,
  Lang,
  RecipeId,
  StrengthKey,
  Theme,
} from './types';
import { FINISH_TIME, getRecipeById } from './data/recipes';
import { getStrings } from './i18n/strings';
import { getCookie, setCookie } from './hooks/cookie';
import {
  ensureRunning,
  getAudioContext,
  playFinish,
  playStart,
  playStep,
} from './audio/se';
import { formatTime, isMobileUserAgent } from './utils/format';
import { Header } from './components/Header';
import { RecipeCard } from './components/RecipeCard';
import { SettingsCard } from './components/SettingsCard';
import { TimerCard } from './components/TimerCard';
import { ConfirmDialog, FlavorHelpDialog } from './components/Dialogs';

const FINISH_SENTINEL = 99;

export function App() {
  const mobile = useMemo(isMobileUserAgent, []);
  const seVolumeMax = mobile ? 5 : 1;
  const seVolumeStep = mobile ? 0.1 : 0.05;
  const seVolumeDefault = mobile ? seVolumeMax * 0.5 : 0.5;

  // Persisted values (cookies)
  const cookieRecipeId = (getCookie('recipeId') as RecipeId) ?? 'hot';
  const cookieSeVolumeRaw = getCookie('seVolume');
  const initialSeVolume = (() => {
    const parsed = cookieSeVolumeRaw == null ? NaN : parseFloat(cookieSeVolumeRaw);
    if (Number.isFinite(parsed)) return Math.min(seVolumeMax, Math.max(0, parsed));
    return seVolumeDefault;
  })();

  // State
  const [lang, setLang] = useState<Lang>('ja');
  const [dark, setDark] = useState(true);
  const [flavorHelpOpen, setFlavorHelpOpen] = useState(false);
  const [recipeId, setRecipeId] = useState<RecipeId>(cookieRecipeId);
  const [powder, setPowder] = useState(20);
  const [flavor, setFlavor] = useState<FlavorKey>('normal');
  const [strength, setStrength] = useState<StrengthKey>('normal');
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [seMuted, setSeMuted] = useState(false);
  const [seVolume, setSeVolume] = useState<number>(initialSeVolume);
  const [activeStep, setActiveStep] = useState<number | null>(0);
  const [finished, setFinished] = useState(false);
  const [highlightStep, setHighlightStep] = useState<number | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false,
    message: '',
    onOk: () => {},
  });
  const [menuOpen, setMenuOpen] = useState(false);

  // Refs
  const tickRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const firedRef = useRef<Set<number>>(new Set());

  // Persist
  useEffect(() => {
    setCookie('recipeId', recipeId);
  }, [recipeId]);
  useEffect(() => {
    setCookie('seVolume', String(seVolume));
  }, [seVolume]);

  const t = getStrings(lang);
  const recipe = useMemo(() => getRecipeById(recipeId), [recipeId]);
  const strengthOpts = recipe.getStrengthOptions?.(lang) ?? [];
  const effectiveStrength: StrengthKey = strengthOpts.some(
    (o) => o.value === strength,
  )
    ? strength
    : recipe.defaultStrength;

  const steps = useMemo(
    () => recipe.getPourSteps(flavor, effectiveStrength, lang, powder),
    [recipe, flavor, effectiveStrength, lang, powder],
  );

  const totalWater = useMemo(
    () => Math.round(powder * recipe.waterMultiplier),
    [powder, recipe],
  );

  // Tick
  useEffect(() => {
    if (isPlaying) {
      tickRef.current = window.setInterval(() => {
        setCurrentTime((e) => e + 1);
      }, 1000);
    } else if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [isPlaying]);

  // Step firing
  useEffect(() => {
    if (!isPlaying) return;
    steps.forEach((step, i) => {
      if (currentTime === step.timeSeconds && !firedRef.current.has(i)) {
        firedRef.current.add(i);
        setActiveStep(i);
        setHighlightStep(i);
        if (!seMuted) playStep(getAudioContext(), seVolume);
        window.setTimeout(() => setHighlightStep(null), 2000);
      }
    });
    if (currentTime === FINISH_TIME + 60 && finished) {
      setIsPlaying(false);
    }
    if (currentTime === FINISH_TIME && !firedRef.current.has(FINISH_SENTINEL)) {
      firedRef.current.add(FINISH_SENTINEL);
      setFinished(true);
      setActiveStep(null);
      if (!seMuted) playFinish(getAudioContext(), seVolume);
    }
  }, [currentTime, isPlaying, steps, seMuted, seVolume, finished]);

  // Theme attr on body? The bundle uses `data-theme` on the .app div itself.
  // No extra effect needed; we set it via attribute.

  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setActiveStep(0);
    setHighlightStep(null);
    setFinished(false);
    firedRef.current = new Set();
  }, []);

  const guardChange = useCallback(
    (fn: () => void) => {
      if (isPlaying || currentTime > 0) {
        setConfirmState({
          open: true,
          message: t.confirmChange,
          onOk: () => {
            reset();
            fn();
          },
        });
      } else {
        fn();
      }
    },
    [isPlaying, currentTime, reset, t.confirmChange],
  );

  const selectRecipe = (id: RecipeId) => {
    const next = getRecipeById(id);
    guardChange(() => {
      setRecipeId(id);
      setFlavor(next.defaultFlavor);
      setStrength(next.defaultStrength);
    });
  };

  function start() {
    if (finished) return;
    ensureRunning();
    const ctx = getAudioContext();
    if (currentTime === 0 && !firedRef.current.has(0)) {
      firedRef.current.add(0);
      setActiveStep(0);
      setHighlightStep(0);
      if (!seMuted) void playStart(ctx, seVolume);
      window.setTimeout(() => setHighlightStep(null), 2000);
    }
    setIsPlaying(true);
  }

  // `ct` in bundle: stop the timer (no SE).
  function pause() {
    setIsPlaying(false);
  }

  // `lt` in bundle: always opens the confirm dialog (no idle short-circuit).
  function requestReset() {
    setConfirmState({
      open: true,
      message: t.confirmReset,
      onOk: () => reset(),
    });
  }

  // Jump-helper $e in bundle. Builds the fired set from steps up to time `e`,
  // adds the finish sentinel only when `e >= FINISH_TIME`, and clears the
  // transient flags. NOTE: does not touch isPlaying — see jumpTo / jumpFinish.
  function jumpHelper(e: number) {
    const newSet = new Set<number>();
    let last: number | null = null;
    steps.forEach((st, i) => {
      if (st.timeSeconds <= e) {
        newSet.add(i);
        last = i;
      }
    });
    if (e >= FINISH_TIME) newSet.add(FINISH_SENTINEL);
    firedRef.current = newSet;
    setCurrentTime(e);
    setActiveStep(last);
    setHighlightStep(null);
    setFinished(false);
  }

  function jumpTo(idx: number) {
    const step = steps[idx];
    if (!step) return;
    const wasPlaying = isPlaying;
    const verb = step.timeSeconds < currentTime ? t.rewind : t.skip;
    setConfirmState({
      open: true,
      message: t.confirmSkip(step.label, formatTime(step.timeSeconds), verb),
      onOk: () => {
        jumpHelper(step.timeSeconds);
        if (wasPlaying) window.setTimeout(() => setIsPlaying(true), 50);
      },
    });
  }

  // Skip-to-finish (bundle `dt`). Pre-fills fired with every step index but
  // intentionally NOT the finish sentinel, sets currentTime to m-1, and lets
  // the next tick (m) trigger the finish SE through the normal step effect.
  function jumpFinish() {
    setConfirmState({
      open: true,
      message: t.confirmFinish(formatTime(FINISH_TIME)),
      onOk: () => {
        const newSet = new Set<number>();
        steps.forEach((_st, i) => newSet.add(i));
        firedRef.current = newSet;
        setCurrentTime(FINISH_TIME - 1);
        setActiveStep(null);
        setHighlightStep(null);
        setFinished(false);
        window.setTimeout(() => setIsPlaying(true), 50);
      },
    });
  }

  const cancelConfirm = useCallback(() => {
    setConfirmState((c) => ({ ...c, open: false }));
  }, []);

  // Audio context for SE (kept alive via ref; used implicitly by se.ts).
  useEffect(() => {
    if (!audioCtxRef.current) {
      // se.ts manages its own context; this ref reserved for future cleanup.
    }
  }, []);

  return (
    <div
      className="app"
      data-theme={dark ? 'dark' : 'light'}
      onClick={() => setMenuOpen(false)}
    >
      <ConfirmDialog
        state={confirmState}
        onCancel={cancelConfirm}
        lang={lang}
      />
      {flavorHelpOpen && (
        <FlavorHelpDialog
          onClose={() => setFlavorHelpOpen(false)}
          lang={lang}
        />
      )}

      <Header
        lang={lang}
        toggleLang={() => setLang((l) => (l === 'ja' ? 'en' : 'ja'))}
        theme={(dark ? 'dark' : 'light') as Theme}
        toggleTheme={() => setDark((v) => !v)}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
      />

      <main className="main">
        <RecipeCard
          lang={lang}
          recipe={recipe}
          selectRecipe={selectRecipe}
        />

        <SettingsCard
          lang={lang}
          recipe={recipe}
          powder={powder}
          setPowder={setPowder}
          flavor={flavor}
          setFlavor={setFlavor}
          strength={effectiveStrength}
          setStrength={setStrength}
          totalWater={totalWater}
          onOpenFlavorHelp={() => setFlavorHelpOpen(true)}
          guardChange={guardChange}
          locked={isPlaying || currentTime > 0}
        />

        <TimerCard
          lang={lang}
          steps={steps}
          currentTime={currentTime}
          isPlaying={isPlaying}
          finished={finished}
          activeIndex={activeStep}
          highlightIndex={highlightStep}
          seMuted={seMuted}
          seVolume={seVolume}
          seVolumeMax={seVolumeMax}
          seVolumeStep={seVolumeStep}
          toggleMute={() => setSeMuted((v) => !v)}
          setSeVolume={setSeVolume}
          onStart={start}
          onPause={pause}
          onReset={requestReset}
          onJump={jumpTo}
          onJumpFinish={jumpFinish}
        />
      </main>

      <footer className="app-footer">
        <span className="app-footer-copy">© 2025 KOROHUNK</span>
        <span className="app-footer-sep">·</span>
        <a
          className="app-footer-link"
          href="./credits.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          Credits
        </a>
      </footer>
    </div>
  );
}
