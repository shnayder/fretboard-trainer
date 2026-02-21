// Speed Tap mode definition: tap all positions of a given note on the fretboard.
// Uses spatial response — user taps fretboard positions directly.
// Items: 7 natural or 12 chromatic notes, filtered by note selection.

import type {
  CheckAnswerResult,
  ModeDefinition,
  QuizAreaEls,
  ScopeState,
} from '../types.ts';
import {
  displayNote,
  NATURAL_NOTES,
  NOTES,
  pickRandomAccidental,
  STRING_OFFSETS,
} from '../music-data.ts';
import {
  buildStatsLegend,
  getAutomaticityColor,
  getSpeedHeatmapColor,
} from '../stats-display.ts';

// --- Question type ---

type SpeedTapQuestion = {
  noteName: string;
  displayName: string;
  targetPositions: { string: number; fret: number }[];
};

// --- Note / position helpers ---

const noteNames: string[] = NOTES.map((n) => n.name);

function getNoteAtPosition(string: number, fret: number): string {
  const offset = STRING_OFFSETS[string];
  return noteNames[(offset + fret) % 12];
}

function getPositionsForNote(
  noteName: string,
): { string: number; fret: number }[] {
  const positions: { string: number; fret: number }[] = [];
  for (let s = 0; s < 6; s++) {
    for (let f = 0; f <= 12; f++) {
      if (getNoteAtPosition(s, f) === noteName) {
        positions.push({ string: s, fret: f });
      }
    }
  }
  return positions;
}

// --- SVG circle helpers ---

function setCircleFill(
  container: HTMLElement,
  string: number,
  fret: number,
  color: string,
): void {
  const circle = container.querySelector(
    'circle.fb-pos[data-string="' + string + '"][data-fret="' + fret + '"]',
  ) as SVGElement | null;
  if (circle) circle.style.fill = color;
}

function clearAllCircles(container: HTMLElement): void {
  container.querySelectorAll<SVGElement>('.fb-pos').forEach((c) => {
    c.style.fill = '';
  });
}

// --- Colors ---

const FB_TAP_NEUTRAL = 'hsl(30, 4%, 90%)';
const FB_TAP_CORRECT = 'hsl(90, 45%, 35%)';

// --- Mode definition factory ---

export function speedTapDefinition(): ModeDefinition<SpeedTapQuestion> {
  // Item list (all 12 chromatic notes)
  const ALL_ITEMS = NOTES.map((n) => n.name);

  // Closure state for spatial tracking
  let currentNote: string | null = null;
  let targetPositions: { string: number; fret: number }[] = [];
  let foundPositions = new Set<string>();
  let roundActive = false;
  const wrongFlashTimeouts = new Set<ReturnType<typeof setTimeout>>();

  // Cache error color from CSS
  let colorError = '#d32f2f';
  try {
    const cs = getComputedStyle(document.documentElement);
    const val = cs.getPropertyValue('--color-error').trim();
    if (val) colorError = val;
  } catch (_) { /* expected in tests */ }

  return {
    id: 'speedTap',
    name: 'Speed Tap',
    storageNamespace: 'speedTap',

    allItemIds: ALL_ITEMS,

    getEnabledItems(scope: ScopeState): string[] {
      const filter = scope.kind === 'note-filter'
        ? scope.noteFilter
        : 'natural';
      if (filter === 'natural') return NATURAL_NOTES.slice();
      if (filter === 'sharps-flats') {
        return NOTES.filter((n) => !NATURAL_NOTES.includes(n.name))
          .map((n) => n.name);
      }
      return NOTES.map((n) => n.name);
    },

    getExpectedResponseCount(itemId: string): number {
      return getPositionsForNote(itemId).length;
    },

    scopeSpec: {
      kind: 'note-filter',
      storageKey: 'speedTap_noteFilter',
    },

    getQuestion(itemId: string): SpeedTapQuestion {
      const note = NOTES.find((n) => n.name === itemId);
      const name = note
        ? displayNote(pickRandomAccidental(note.displayName))
        : displayNote(itemId);
      return {
        noteName: itemId,
        displayName: name,
        targetPositions: getPositionsForNote(itemId),
      };
    },

    checkAnswer(_itemId: string, input: string): CheckAnswerResult {
      const allFound = input === 'complete';
      return { correct: allFound, correctAnswer: displayNote(currentNote!) };
    },

    prompt: {
      kind: 'custom',
      render(q: SpeedTapQuestion, els: QuizAreaEls): void {
        // Clear any pending wrong-flash timeouts
        wrongFlashTimeouts.forEach((t) => clearTimeout(t));
        wrongFlashTimeouts.clear();
        clearAllCircles(els.container);

        currentNote = q.noteName;
        targetPositions = q.targetPositions;
        foundPositions = new Set();
        roundActive = true;

        // Set all circles to neutral
        els.container.querySelectorAll<SVGElement>('.fb-pos').forEach((c) => {
          c.style.fill = FB_TAP_NEUTRAL;
        });

        els.promptEl.textContent = 'Tap all ' + q.displayName;

        // Update round progress display
        const progressEl = els.container.querySelector('.speed-tap-progress');
        if (progressEl) {
          progressEl.textContent = '0 / ' + targetPositions.length;
        }
      },
      clear(els: QuizAreaEls): void {
        wrongFlashTimeouts.forEach((t) => clearTimeout(t));
        wrongFlashTimeouts.clear();
        clearAllCircles(els.container);
        currentNote = null;
        const progressEl = els.container.querySelector('.speed-tap-progress');
        if (progressEl) progressEl.textContent = '';
      },
      onAnswer(
        _q: SpeedTapQuestion,
        result: CheckAnswerResult,
        els: QuizAreaEls,
      ): void {
        roundActive = false;
        if (!result.correct) {
          // Reveal remaining target positions on timeout
          for (const pos of targetPositions) {
            const key = pos.string + '-' + pos.fret;
            if (!foundPositions.has(key)) {
              setCircleFill(els.container, pos.string, pos.fret, colorError);
            }
          }
        }
      },
    },

    response: {
      kind: 'spatial',
      handleTap(target: HTMLElement, _itemId: string): string | null {
        if (!roundActive || !currentNote) return null;
        const el = (target as Element).closest(
          'circle.fb-pos[data-string][data-fret]',
        ) as SVGElement | null;
        if (!el) return null;

        const s = parseInt(el.dataset!.string!);
        const f = parseInt(el.dataset!.fret!);
        const key = s + '-' + f;
        if (foundPositions.has(key)) return null;

        const tappedNote = getNoteAtPosition(s, f);
        const container = el.closest('.mode-screen') as HTMLElement;

        if (tappedNote === currentNote) {
          foundPositions.add(key);
          setCircleFill(container, s, f, FB_TAP_CORRECT);

          // Update round progress
          const progressEl = container.querySelector('.speed-tap-progress');
          if (progressEl) {
            progressEl.textContent = foundPositions.size + ' / ' +
              targetPositions.length;
          }

          if (foundPositions.size === targetPositions.length) {
            roundActive = false;
            return 'complete';
          }
          return null;
        } else {
          // Wrong tap — flash red, then reset
          setCircleFill(container, s, f, colorError);
          const timeout = setTimeout(() => {
            wrongFlashTimeouts.delete(timeout);
            if (!foundPositions.has(key)) {
              setCircleFill(container, s, f, FB_TAP_NEUTRAL);
            }
          }, 800);
          wrongFlashTimeouts.add(timeout);
          return null;
        }
      },
    },

    stats: {
      kind: 'custom',
      render(
        mode: string,
        el: HTMLElement,
        selector,
        baseline,
        _container,
      ): void {
        let html = '<table class="stats-table speed-tap-stats"><thead><tr>';
        for (let i = 0; i < NOTES.length; i++) {
          html += '<th>' + displayNote(NOTES[i].name) + '</th>';
        }
        html += '</tr></thead><tbody><tr>';
        for (let j = 0; j < NOTES.length; j++) {
          if (mode === 'retention') {
            const auto = selector.getAutomaticity(NOTES[j].name);
            html += '<td class="stats-cell" style="background:' +
              getAutomaticityColor(auto) + '"></td>';
          } else {
            const stats = selector.getStats(NOTES[j].name);
            const posCount = getPositionsForNote(NOTES[j].name).length;
            const perPosMs = stats ? stats.ewma / posCount : null;
            html += '<td class="stats-cell" style="background:' +
              getSpeedHeatmapColor(perPosMs, baseline ?? undefined) +
              '"></td>';
          }
        }
        html += '</tr></tbody></table>';
        html += buildStatsLegend(mode, baseline ?? undefined);
        el.innerHTML = html;
      },
    },

    getPracticingLabel(scope: ScopeState): string {
      const filter = scope.kind === 'note-filter'
        ? scope.noteFilter
        : 'natural';
      if (filter === 'all') return 'all notes';
      if (filter === 'sharps-flats') return 'sharps & flats';
      return 'natural notes';
    },

    getSessionSummary(scope: ScopeState): string {
      const count = this.getEnabledItems(scope).length;
      return count + ' notes \u00B7 60s';
    },

    onStart(els: QuizAreaEls): void {
      // Show fretboard during quiz
      const fb = els.container.querySelector('.fretboard-wrapper');
      if (fb) fb.classList.remove('fretboard-hidden');
    },

    onStop(els: QuizAreaEls): void {
      roundActive = false;
      wrongFlashTimeouts.forEach((t) => clearTimeout(t));
      wrongFlashTimeouts.clear();
      clearAllCircles(els.container);
      currentNote = null;
      const progressEl = els.container.querySelector('.speed-tap-progress');
      if (progressEl) progressEl.textContent = '';
      // Hide fretboard during idle
      const fb = els.container.querySelector('.fretboard-wrapper');
      if (fb) fb.classList.add('fretboard-hidden');
    },

    calibrationSpec: {
      getButtons(container: HTMLElement): HTMLElement[] {
        return Array.from(container.querySelectorAll('.answer-btn-note'));
      },
    },
  };
}
