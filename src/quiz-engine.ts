// Quiz engine utilities: keyboard handlers, note button labels, and
// calibration helpers. Used by Preact mode components and the
// useQuizEngine hook.

import { displayNote, getUseSolfege, NOTES } from './music-data.ts';
import type { NoteKeyHandler } from './types.ts';

/**
 * Create a keyboard handler for note input (C D E F G A B + #/s/b for accidentals).
 * Used by any mode where the answer is a note name.
 *
 * The handler keeps an internal timeout to allow a short window after a note key
 * is pressed for an accidental key (`#` / `b`) to be entered. Callers should
 * invoke `reset()` when the quiz stops and before restarting to clear any pending
 * note and prevent stale input from being submitted after the quiz has ended.
 */
export function createNoteKeyHandler(
  submitAnswer: (note: string) => void,
  allowAccidentals: () => boolean = () => true,
): NoteKeyHandler {
  let pendingNote: string | null = null;
  let pendingTimeout: number | null = null;

  function reset(): void {
    if (pendingTimeout) clearTimeout(pendingTimeout);
    pendingNote = null;
    pendingTimeout = null;
  }

  function handleKey(e: KeyboardEvent): boolean {
    const key = e.key.toUpperCase();

    // Handle #/s for sharps or b for flats after a pending note
    if (pendingNote && allowAccidentals()) {
      if (
        e.key === '#' || e.key === 's' || e.key === 'S' ||
        (e.shiftKey && e.key === '3')
      ) {
        e.preventDefault();
        if (pendingTimeout) clearTimeout(pendingTimeout);
        submitAnswer(pendingNote + '#');
        pendingNote = null;
        pendingTimeout = null;
        return true;
      }
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        if (pendingTimeout) clearTimeout(pendingTimeout);
        submitAnswer(pendingNote + 'b');
        pendingNote = null;
        pendingTimeout = null;
        return true;
      }
    }

    if ('CDEFGAB'.includes(key)) {
      e.preventDefault();
      if (pendingTimeout) clearTimeout(pendingTimeout);

      if (!allowAccidentals()) {
        submitAnswer(key);
      } else {
        pendingNote = key;
        pendingTimeout = setTimeout(() => {
          submitAnswer(pendingNote!);
          pendingNote = null;
          pendingTimeout = null;
        }, 400);
      }
      return true;
    }

    return false;
  }

  return { handleKey, reset };
}

/**
 * Create a keyboard handler for solfège input (Do Re Mi Fa Sol La Si + #/b).
 * Case-insensitive. Buffers two characters to identify the syllable, then
 * waits for an optional accidental. All syllables are unambiguous after 2 chars.
 */
export function createSolfegeKeyHandler(
  submitAnswer: (note: string) => void,
  allowAccidentals: () => boolean = () => true,
): NoteKeyHandler {
  const SOLFEGE_TO_NOTE: Record<string, string> = {
    'do': 'C',
    're': 'D',
    'mi': 'E',
    'fa': 'F',
    'so': 'G',
    'la': 'A',
    'si': 'B',
  };
  const FIRST_CHARS = new Set(['d', 'r', 'm', 'f', 's', 'l']);

  let buffer: string = '';
  let pendingNote: string | null = null;
  let pendingTimeout: number | null = null;

  function reset(): void {
    buffer = '';
    if (pendingTimeout) clearTimeout(pendingTimeout);
    pendingTimeout = null;
    pendingNote = null;
  }

  function submitPending(): void {
    if (pendingNote) {
      if (pendingTimeout) clearTimeout(pendingTimeout);
      submitAnswer(pendingNote);
      pendingNote = null;
      pendingTimeout = null;
    }
  }

  function handleKey(e: KeyboardEvent): boolean {
    const key = e.key.toLowerCase();

    // Handle accidental after resolved syllable
    if (pendingNote && allowAccidentals()) {
      if (e.key === '#' || (e.shiftKey && e.key === '3')) {
        e.preventDefault();
        if (pendingTimeout) clearTimeout(pendingTimeout);
        submitAnswer(pendingNote + '#');
        pendingNote = null;
        pendingTimeout = null;
        return true;
      }
      // 'b' is flat (no solfège syllable starts with 'b')
      if (key === 'b') {
        e.preventDefault();
        if (pendingTimeout) clearTimeout(pendingTimeout);
        submitAnswer(pendingNote + 'b');
        pendingNote = null;
        pendingTimeout = null;
        return true;
      }
    }

    // Submit any pending note before starting new input
    if (pendingNote && FIRST_CHARS.has(key)) {
      submitPending();
    }

    // Continue building syllable
    if (buffer.length > 0) {
      e.preventDefault();
      buffer += key;
      const note = SOLFEGE_TO_NOTE[buffer];
      if (note) {
        buffer = '';
        if (!allowAccidentals()) {
          submitAnswer(note);
        } else {
          pendingNote = note;
          pendingTimeout = setTimeout(() => {
            submitAnswer(pendingNote!);
            pendingNote = null;
            pendingTimeout = null;
          }, 400);
        }
      } else if (buffer.length >= 2) {
        // Invalid pair — reset
        buffer = '';
      }
      return true;
    }

    // Start new syllable
    if (FIRST_CHARS.has(key)) {
      e.preventDefault();
      // Submit any pending note first
      submitPending();
      buffer = key;
      return true;
    }

    return false;
  }

  return { handleKey, reset };
}

/**
 * Adaptive key handler: delegates to letter or solfège handler based on
 * current notation mode. Drop-in replacement for createNoteKeyHandler.
 */
export function createAdaptiveKeyHandler(
  submitAnswer: (note: string) => void,
  allowAccidentals: () => boolean = () => true,
): NoteKeyHandler {
  const letterHandler = createNoteKeyHandler(submitAnswer, allowAccidentals);
  const solfegeHandler = createSolfegeKeyHandler(
    submitAnswer,
    allowAccidentals,
  );

  return {
    handleKey(e: KeyboardEvent): boolean {
      return getUseSolfege()
        ? solfegeHandler.handleKey(e)
        : letterHandler.handleKey(e);
    },
    reset(): void {
      letterHandler.reset();
      solfegeHandler.reset();
    },
  };
}

/**
 * Update all note button labels in a container to reflect current notation mode.
 * Handles .answer-btn-note, .note-btn, and .string-toggle elements.
 */
export function refreshNoteButtonLabels(container: HTMLElement): void {
  container.querySelectorAll<HTMLButtonElement>('.answer-btn-note').forEach(
    function (btn) {
      const note = NOTES.find(function (n) {
        return n.name === btn.dataset.note;
      });
      if (note) btn.textContent = displayNote(note.name);
    },
  );
  container.querySelectorAll<HTMLButtonElement>('.note-btn').forEach(
    function (btn) {
      const noteName = btn.dataset.note;
      if (noteName) btn.textContent = displayNote(noteName);
    },
  );
  container.querySelectorAll<HTMLButtonElement>('.string-toggle').forEach(
    function (btn) {
      const stringNote = btn.dataset.stringNote;
      if (stringNote) btn.textContent = displayNote(stringNote);
    },
  );
}

/**
 * Build human-readable threshold descriptions from a motor baseline.
 * Used by the calibration results screen.
 */
export function getCalibrationThresholds(
  baseline: number,
): { label: string; maxMs: number | null; meaning: string }[] {
  return [
    {
      label: 'Automatic',
      maxMs: Math.round(baseline * 1.5),
      meaning: 'Fully memorized — instant recall',
    },
    {
      label: 'Good',
      maxMs: Math.round(baseline * 3.0),
      meaning: 'Solid recall, minor hesitation',
    },
    {
      label: 'Developing',
      maxMs: Math.round(baseline * 4.5),
      meaning: 'Working on it — needs practice',
    },
    {
      label: 'Slow',
      maxMs: Math.round(baseline * 6.0),
      meaning: 'Significant hesitation',
    },
    { label: 'Very slow', maxMs: null, meaning: 'Not yet learned' },
  ];
}

/**
 * Pick a random calibration button, weighted toward accidentals ~35% of the time.
 * Shared helper for mode getCalibrationTrialConfig implementations.
 */
export function pickCalibrationButton(
  buttons: HTMLElement[],
  prevBtn: HTMLElement | null,
  rng?: () => number,
): HTMLElement {
  const rand = rng || Math.random;
  const sharpBtns = buttons.filter((b) => {
    const note = b.dataset.note;
    return note && note.includes('#');
  });
  const naturalBtns = buttons.filter((b) => {
    const note = b.dataset.note;
    return note && !note.includes('#');
  });

  // ~35% chance of sharp if available
  const useSharp = sharpBtns.length > 0 && rand() < 0.35;
  const pool = useSharp
    ? sharpBtns
    : (naturalBtns.length > 0 ? naturalBtns : buttons);

  let btn;
  do {
    btn = pool[Math.floor(rand() * pool.length)];
  } while (btn === prevBtn && pool.length > 1);
  return btn;
}
