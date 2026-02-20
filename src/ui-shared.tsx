// Shared Preact UI components: FretboardSVG, answer buttons, etc.

import type { ComponentChildren } from 'preact';
import { useCallback } from 'preact/hooks';
import { fretPositions, noteX, stringY, svgHeight } from './fretboard.ts';
import { displayNote, NOTES } from './music-data.ts';

// ---------------------------------------------------------------------------
// Fretboard SVG
// ---------------------------------------------------------------------------

export function FretboardSVG({
  stringCount = 6,
  fretCount = 13,
  markers = [3, 5, 7, 9, 12],
  highlights,
  onCircleClick,
}: {
  stringCount?: number;
  fretCount?: number;
  markers?: number[];
  highlights?: Map<string, string>;
  onCircleClick?: (string: number, fret: number) => void;
}) {
  const height = svgHeight(stringCount);

  return (
    <div class='fretboard-wrapper'>
      <svg viewBox={`0 0 600 ${height}`} class='fretboard-svg'>
        {/* Nut */}
        <line
          class='fb-nut'
          x1={fretPositions[1]}
          y1={0}
          x2={fretPositions[1]}
          y2={height}
          stroke-width={3}
        />
        {/* Fret lines */}
        {fretPositions.slice(2).map((x) => (
          <line
            key={x}
            class='fb-fret'
            x1={x}
            y1={0}
            x2={x}
            y2={height}
            stroke-width={1}
          />
        ))}
        {/* String lines */}
        {Array.from({ length: stringCount }, (_, i) => (
          <line
            key={i}
            class='fb-string'
            x1={0}
            y1={stringY(i)}
            x2={600}
            y2={stringY(i)}
            stroke-width={1 + i * 0.4}
          />
        ))}
        {/* Fret markers */}
        {markers
          .filter((f) => f < fretCount)
          .map((fret) => {
            const cx = noteX(fret);
            if (fret === 12) {
              const y1 = stringCount <= 4
                ? stringY(1)
                : (stringY(1) + stringY(2)) / 2;
              const y2 = stringCount <= 4
                ? stringY(stringCount - 2)
                : (stringY(stringCount - 3) + stringY(stringCount - 2)) / 2;
              return (
                <g key={fret}>
                  <circle class='fb-marker' cx={cx} cy={y1} r={4} />
                  <circle class='fb-marker' cx={cx} cy={y2} r={4} />
                </g>
              );
            }
            return (
              <circle
                key={fret}
                class='fb-marker'
                cx={cx}
                cy={height / 2}
                r={4}
              />
            );
          })}
        {/* Position circles */}
        {Array.from({ length: stringCount }, (_, s) =>
          Array.from({ length: fretCount }, (_, f) => {
            const key = `${s}-${f}`;
            const fill = highlights?.get(key);
            return (
              <circle
                key={key}
                class='fb-pos'
                data-string={s}
                data-fret={f}
                cx={noteX(f)}
                cy={stringY(s)}
                r={10}
                style={fill ? { fill } : undefined}
                onClick={onCircleClick
                  ? () => onCircleClick(s, f)
                  : undefined}
              />
            );
          }))}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Note answer buttons (piano layout: naturals top, accidentals bottom)
// ---------------------------------------------------------------------------

export function NoteButtons({
  onAnswer,
  disabled,
  useFlats,
  hideAccidentals,
}: {
  onAnswer: (note: string) => void;
  disabled: boolean;
  useFlats?: boolean;
  hideAccidentals?: boolean;
}) {
  const naturals = NOTES.filter((n) => !n.name.includes('#'));
  const accidentals = NOTES.filter((n) => n.name.includes('#'));

  const label = useCallback(
    (name: string) => {
      if (useFlats) {
        const note = NOTES.find((n) => n.name === name);
        if (note && note.displayName !== name) {
          return displayNote(note.displayName);
        }
      }
      return displayNote(name);
    },
    [useFlats],
  );

  return (
    <div class='note-buttons'>
      <div class='note-row-naturals'>
        {naturals.map((n) => (
          <button
            type='button'
            key={n.name}
            class='answer-btn answer-btn-note note-btn'
            data-note={n.name}
            disabled={disabled}
            onClick={() => onAnswer(n.name)}
          >
            {label(n.name)}
          </button>
        ))}
      </div>
      <div
        class={`note-row-accidentals${hideAccidentals ? ' hidden' : ''}`}
      >
        {accidentals.map((n) => (
          <button
            type='button'
            key={n.name}
            class='answer-btn answer-btn-note note-btn'
            data-note={n.name}
            disabled={disabled}
            onClick={() => onAnswer(n.name)}
          >
            {label(n.name)}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Number buttons
// ---------------------------------------------------------------------------

export function NumberButtons({
  min,
  max,
  onAnswer,
  disabled,
}: {
  min: number;
  max: number;
  onAnswer: (num: string) => void;
  disabled: boolean;
}) {
  const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div class='answer-buttons answer-buttons-numbers'>
      {nums.map((n) => (
        <button
          type='button'
          key={n}
          class='answer-btn'
          data-num={n}
          disabled={disabled}
          onClick={() => onAnswer(String(n))}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Countdown bar
// ---------------------------------------------------------------------------

export function CountdownBar({
  pct,
  warning,
}: {
  pct: number;
  warning: boolean;
}) {
  return (
    <div
      class={`quiz-countdown-bar${warning ? ' round-timer-warning' : ''}`}
    >
      <div class='quiz-countdown-fill' style={{ width: pct + '%' }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Round complete screen
// ---------------------------------------------------------------------------

export function RoundComplete({
  state,
  practicingLabel,
  onContinue,
  onStop,
}: {
  state: {
    roundCorrect: number;
    roundAnswered: number;
    roundDurationMs: number;
    roundResponseTimes: number[];
    masteredCount: number;
    totalEnabledCount: number;
  };
  practicingLabel: string;
  onContinue: () => void;
  onStop: () => void;
}) {
  const durationSec = Math.round((state.roundDurationMs || 0) / 1000);
  const fluencyText = state.masteredCount + ' / ' + state.totalEnabledCount +
    ' fluent';
  const contextText = practicingLabel
    ? practicingLabel + ' \u00B7 ' + fluencyText
    : fluencyText;

  let medianText = '';
  if (state.roundResponseTimes.length > 0) {
    const sorted = state.roundResponseTimes.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
    medianText = (median / 1000).toFixed(1) + 's median response time';
  }

  return (
    <div class='round-complete'>
      <div class='round-complete-context'>{contextText}</div>
      <div class='round-complete-heading'>Round complete</div>
      <div class='round-stat-line round-stat-correct'>
        {state.roundCorrect} / {state.roundAnswered} correct &middot;{' '}
        {durationSec}s
      </div>
      <div class='round-stat-line round-stat-median'>{medianText}</div>
      <div class='round-complete-actions'>
        <button
          type='button'
          class='round-complete-continue'
          onClick={onContinue}
        >
          Keep going
        </button>
        <button type='button' class='round-complete-stop' onClick={onStop}>
          Stop
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------

export function ProgressBar({
  masteredCount,
  totalEnabledCount,
}: {
  masteredCount: number;
  totalEnabledCount: number;
}) {
  const pct = totalEnabledCount > 0
    ? Math.round((masteredCount / totalEnabledCount) * 100)
    : 0;
  return (
    <div class='progress-bar'>
      <div class='progress-fill' style={{ width: pct + '%' }} />
      <div class='progress-text'>
        {masteredCount} / {totalEnabledCount} fluent
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Generic wrapper
// ---------------------------------------------------------------------------

export function Section({
  className,
  children,
}: {
  className?: string;
  children: ComponentChildren;
}) {
  return <div class={className}>{children}</div>;
}
