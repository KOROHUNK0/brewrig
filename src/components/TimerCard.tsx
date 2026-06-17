import { Fragment } from 'react';
import type { Lang, PourStep, SoundMode } from '../types';
import { FINISH_TIME } from '../data/recipes';
import { getStrings } from '../i18n/strings';
import { formatTime } from '../utils/format';
import { SegSlider } from './SegSlider';
interface Props {
  lang: Lang;
  steps: PourStep[];
  currentTime: number;
  isPlaying: boolean;
  finished: boolean;
  activeIndex: number | null;
  highlightIndex: number | null;
  soundEnabled: boolean;
  soundMode: SoundMode;
  ttsSupported: boolean;
  seVolume: number;
  seVolumeMax: number;
  seVolumeStep: number;
  toggleSoundEnabled(): void;
  setSoundMode(m: SoundMode): void;
  setSeVolume(n: number): void;
  onStart(): void;
  onPause(): void;
  onReset(): void;
  onJump(stepIdx: number): void;
  onJumpFinish(): void;
}
const STRONG_TOKENS = ['(透過)', '(浸漬)', '撹拌', '開放', '閉鎖'];
const STRONG_REGEX = new RegExp(
  `(${STRONG_TOKENS.map((s) => s.replace(/[()]/g, '\\$&')).join('|')})`,
);
function ActionInstruction({ text }: { text: string }) {
  return (
    <span className="action-instruction">
      {text.split(' / ').map((line, i) => (
        <span key={i} className="action-instruction-line">
          {i > 0 && <br />}
          {line.split(STRONG_REGEX).map((part, j) =>
            STRONG_TOKENS.includes(part) ? (
              <strong key={j}>{part}</strong>
            ) : (
              <span key={j}>{part}</span>
            ),
          )}
        </span>
      ))}
    </span>
  );
}
export function TimerCard({
  lang,
  steps,
  currentTime,
  isPlaying,
  finished,
  activeIndex,
  highlightIndex,
  soundEnabled,
  soundMode,
  ttsSupported,
  seVolume,
  seVolumeMax,
  seVolumeStep,
  toggleSoundEnabled,
  setSoundMode,
  setSeVolume,
  onStart,
  onPause,
  onReset,
  onJump,
  onJumpFinish,
}: Props) {
  const s = getStrings(lang);
  const activeStep = activeIndex != null ? (steps[activeIndex] ?? null) : null;
  // Match bundle: idle class checks only time+playing (not finished).
  const idleClass = currentTime === 0 && !isPlaying;
  const idleLabelOn = currentTime === 0 && !isPlaying && !finished;
  const paused = !isPlaying && currentTime > 0 && !finished;
  const overtime = currentTime - FINISH_TIME;
  const pulse =
    activeStep != null &&
    highlightIndex === activeIndex &&
    highlightIndex !== null;
  const cumulativeAtActive =
    activeIndex == null
      ? 0
      : steps.slice(0, activeIndex + 1).reduce((a, x) => a + x.amount, 0);
  const actionInlineClass = paused
    ? 'action-inline paused'
    : currentTime === 0 && !isPlaying
      ? 'action-inline idle'
      : 'action-inline';
  let instrEl: React.ReactNode = null;
  if (activeStep && !finished) {
    if (activeStep.instruction) {
      instrEl = <ActionInstruction text={activeStep.instruction} />;
    } else if (activeStep.stir) {
      instrEl = <span className="action-stir">{s.stirInstruction}</span>;
    }
  }
  return (
    <section className={`card timer-card ${pulse ? 'pulse' : ''}`}>
      <div className="timer-card-inner">
        <div className="timer-panel">
          <div
            className={`timer-display ${finished ? 'finished' : ''} ${paused ? 'paused' : ''} ${idleClass ? 'idle' : ''}`.replace(/\s+/g, ' ')}
          >
            <span className="timer-text-wrap">
              <span className="timer-text">
                {finished ? formatTime(FINISH_TIME) : formatTime(currentTime)}
              </span>
              {finished && currentTime > FINISH_TIME && (
                <span className="overtime-display">
                  <span className="overtime-label">+</span>
                  <span className="overtime-value">
                    {String(Math.min(overtime, 60))}
                    {overtime >= 60 ? 's over' : 's'}
                  </span>
                </span>
              )}
            </span>
            {idleLabelOn && (
              <span className="idle-label">
                {lang === 'ja' ? '⏵ スタート待機中' : '⏵ Ready'}
              </span>
            )}
            {paused && (
              <span className="paused-label">
                {lang === 'ja' ? '⏸ 一時停止中' : '⏸ Paused'}
              </span>
            )}
          </div>
          {!finished && activeStep && (
            <Fragment>
              <div className={actionInlineClass}>
                {!activeStep.noWater && (
                  <>
                    {activeStep.amountMin &&
                    activeStep.amountMax &&
                    activeIndex === 0 ? (
                      <span className="action-amount-inline">
                        {activeStep.amountMin}~{activeStep.amountMax}g
                      </span>
                    ) : (
                      <span className="action-amount-inline">
                        {cumulativeAtActive}g
                      </span>
                    )}
                    <span className="action-text-inline">
                      {lang === 'ja' ? 'まで注いでください' : 'pour up to'}
                    </span>
                  </>
                )}
              </div>
              {instrEl && (
                <div className="action-instr-wrap">{instrEl}</div>
              )}
            </Fragment>
          )}
          {finished && (
            <div className="finish-banner">
              <p className="finish-text">{s.finishMsg}</p>
            </div>
          )}
          <div className="controls">
            <div className="controls-main">
              {isPlaying ? (
                <button
                  className="btn btn-pause"
                  onClick={onPause}
                  disabled={finished}
                >
                  <span className="btn-icon">⏸</span>
                  {s.pause}
                </button>
              ) : (
                <button
                  className="btn btn-primary btn-play"
                  onClick={onStart}
                  disabled={finished}
                >
                  <span className="btn-icon">▶</span>
                  {currentTime === 0 ? s.start : s.resume}
                </button>
              )}
              <button
                className="btn btn-primary btn-reset"
                onClick={onReset}
              >
                {s.reset}
              </button>
            </div>
            <div className="controls-se">
              <div className="sound-row sound-row-top">
                <button
                  className={`btn-se-toggle ${soundEnabled ? 'se-on' : 'se-off'}`}
                  onClick={toggleSoundEnabled}
                >
                  <span className="se-toggle-icon">
                    {soundEnabled ? '🔔' : '🔇'}
                  </span>
                  <span className="se-toggle-track">
                    <span className="se-toggle-thumb" />
                  </span>
                  <span className="se-toggle-label">{s.soundLabel}</span>
                </button>
                {soundEnabled && ttsSupported && (
                  <div className="sound-mode-seg">
                    <SegSlider<SoundMode>
                      options={[
                        { value: 'se', label: s.soundSe },
                        { value: 'tts', label: s.soundTts },
                      ]}
                      value={soundMode}
                      onChange={setSoundMode}
                    />
                  </div>
                )}
              </div>
              {soundEnabled && (
                <div className="sound-row sound-row-bottom">
                  <div className="se-volume-wrap">
                    <span className="se-vol-icon">🔈</span>
                    <input
                      type="range"
                      min={0}
                      max={seVolumeMax}
                      step={seVolumeStep}
                      value={seVolume}
                      onChange={(e) => setSeVolume(Number(e.target.value))}
                      className="se-volume-slider"
                    />
                    <span className="se-vol-icon">🔊</span>
                    <span className="se-vol-pct">
                      {Math.round((seVolume / seVolumeMax) * 100)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="timeline-panel">
          <div className="tl-divider timer-card-divider" />
          <p className="steps-hint">{s.timelineHint}</p>
          <div className="tl-wrap">
            <div className="tl-track">
              {steps.map((step, t) => {
                const past = currentTime >= step.timeSeconds && currentTime > 0;
                const active = activeIndex === t;
                const nextTime =
                  t < steps.length - 1
                    ? steps[t + 1].timeSeconds
                    : FINISH_TIME;
                const segLen = nextTime - step.timeSeconds;
                const elapsed = Math.min(
                  Math.max(currentTime - step.timeSeconds, 0),
                  segLen,
                );
                const pct =
                  currentTime >= nextTime
                    ? 100
                    : currentTime >= step.timeSeconds
                      ? (elapsed / segLen) * 100
                      : 0;
                return (
                  <div
                    key={t}
                    className="tl-track-seg"
                    onClick={() => onJump(t)}
                  >
                    <div
                      className={`tl-dot ${past ? 'past' : ''} ${active ? 'active' : ''}`}
                    />
                    <div className={`tl-line ${active ? 'active-seg' : ''}`}>
                      <div
                        className="tl-line-fill"
                        style={{ height: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              <div
                className="tl-track-seg tl-finish-seg"
                onClick={onJumpFinish}
              >
                <div
                  className={`tl-dot finish ${currentTime >= FINISH_TIME && currentTime > 0 ? 'past' : ''}`}
                />
              </div>
            </div>
            <div className="tl-labels">
              {steps.map((step, t) => {
                const past = currentTime >= step.timeSeconds && currentTime > 0;
                const active = activeIndex === t;
                const highlight = highlightIndex === t;
                const cumulative = steps
                  .slice(0, t + 1)
                  .reduce((a, st) => a + st.amount, 0);
                return (
                  <div
                    key={t}
                    className={`tl-row clickable ${past ? 'past' : ''} ${active ? 'active' : ''} ${highlight ? 'highlight' : ''} ${step.noWater ? 'tl-row-nowater' : ''}`.replace(/\s+/g, ' ')}
                    onClick={() => onJump(t)}
                    title={`${step.label}（${formatTime(step.timeSeconds)}）`}
                  >
                    <span className="tl-time">
                      {formatTime(step.timeSeconds)}
                    </span>
                    <span className="tl-label">{step.label}</span>
                    <span className="tl-amount">
                      {!step.noWater &&
                        (step.amountMin && step.amountMax
                          ? lang === 'ja'
                            ? `${step.amountMin}~${step.amountMax}g 投入`
                            : `${step.amountMin}~${step.amountMax}g`
                          : s.pourAmount(step.amount))}
                    </span>
                    <span className="tl-cumulative">
                      {step.cumTarget
                        ? s.pourTotal(step.cumTarget)
                        : step.amountMin && step.amountMax
                          ? lang === 'ja'
                            ? `計 ${step.amountMin}~${step.amountMax}g`
                            : `Total ${step.amountMin}~${step.amountMax}g`
                          : s.pourTotal(cumulative)}
                    </span>
                    <span className="tl-badges">
                      {step.stir && (
                        <span className="step-stir-badge">{s.stir}</span>
                      )}
                      {step.flowType === 'immersion' && (
                        <span className="step-flow-badge step-flow-immersion">
                          {lang === 'ja' ? '浸漬' : 'Imm.'}
                        </span>
                      )}
                      {step.flowType === 'percolation' && (
                        <span className="step-flow-badge step-flow-percolation">
                          {lang === 'ja' ? '透過' : 'Perc.'}
                        </span>
                      )}
                      {step.stepTag && (
                        <span className="step-flow-badge step-tag-temp">
                          {step.stepTag}
                        </span>
                      )}
                    </span>
                    <span className="tl-jump">{s.jumpLink}</span>
                  </div>
                );
              })}
              <div
                className={`tl-row tl-row-finish clickable ${currentTime >= FINISH_TIME && currentTime > 0 ? 'past' : ''}`}
                onClick={onJumpFinish}
              >
                <span className="tl-time">{formatTime(FINISH_TIME)}</span>
                <span className="tl-label">{s.finish}</span>
                <span className="tl-amount">{s.removeFilter}</span>
                <span className="tl-jump">{s.jumpLink}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
