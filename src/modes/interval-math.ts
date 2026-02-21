// Interval Math mode definition: note +/- interval = note.
// "C + m3 = ?" -> D#/Eb,  "G - P4 = ?" -> D
// 264 items: 12 notes x 11 intervals (m2-M7) x 2 directions (+/-).
// Grouped by interval pair into 6 distance groups.

import type {
  CheckAnswerResult,
  GroupDef,
  Interval,
  ModeDefinition,
  Note,
  QuizAreaEls,
  ScopeState,
} from '../types.ts';
import {
  displayNote,
  INTERVALS,
  noteAdd,
  noteMatchesInput,
  NOTES,
  noteSub,
  pickAccidentalName,
} from '../music-data.ts';
import {
  createAdaptiveKeyHandler,
  refreshNoteButtonLabels,
} from '../quiz-engine.ts';

// --- Question type ---

type IntervalMathQuestion = {
  note: Note;
  op: string;
  interval: Interval;
  answer: Note;
  useFlats: boolean;
  promptText: string;
};

// --- Intervals (1-11, no octave) ---

const MATH_INTERVALS = INTERVALS.filter((i) => i.num >= 1 && i.num <= 11);

// --- Distance groups ---

const DISTANCE_GROUPS = [
  { distances: [1, 2], label: 'm2 M2' },
  { distances: [3, 4], label: 'm3 M3' },
  { distances: [5, 6], label: 'P4 TT' },
  { distances: [7, 8], label: 'P5 m6' },
  { distances: [9, 10], label: 'M6 m7' },
  { distances: [11], label: 'M7' },
];

function getItemIdsForGroup(groupIndex: number): string[] {
  const distances = DISTANCE_GROUPS[groupIndex].distances;
  const intervals = MATH_INTERVALS.filter((i) => distances.includes(i.num));
  const items: string[] = [];
  for (const note of NOTES) {
    for (const interval of intervals) {
      items.push(note.name + '+' + interval.abbrev);
      items.push(note.name + '-' + interval.abbrev);
    }
  }
  return items;
}

// --- Mode definition factory ---

export function intervalMathDefinition(): ModeDefinition<IntervalMathQuestion> {
  // Build full item list
  const ALL_ITEMS: string[] = [];
  for (const note of NOTES) {
    for (const interval of MATH_INTERVALS) {
      ALL_ITEMS.push(note.name + '+' + interval.abbrev);
      ALL_ITEMS.push(note.name + '-' + interval.abbrev);
    }
  }

  // Build GroupDef array
  const groups: GroupDef[] = DISTANCE_GROUPS.map((g, i) => ({
    index: i,
    label: g.label,
    itemIds: getItemIdsForGroup(i),
  }));

  // Closure state
  let currentQuestion: IntervalMathQuestion | null = null;

  return {
    id: 'intervalMath',
    name: 'Interval Math',
    storageNamespace: 'intervalMath',

    allItemIds: ALL_ITEMS,

    getEnabledItems(scope: ScopeState): string[] {
      if (scope.kind !== 'groups') return ALL_ITEMS;
      const items: string[] = [];
      for (const g of scope.enabledGroups) {
        items.push(...getItemIdsForGroup(g));
      }
      return items;
    },

    scopeSpec: {
      kind: 'groups',
      groups,
      defaultEnabled: [0],
      storageKey: 'intervalMath_enabledGroups',
      label: 'Intervals',
      sortUnstarted: (a, b) => a.string - b.string,
    },

    getQuestion(itemId: string): IntervalMathQuestion {
      const match = itemId.match(/^([A-G]#?)([+-])(.+)$/)!;
      const noteName = match[1];
      const op = match[2];
      const abbrev = match[3];
      const note = NOTES.find((n) => n.name === noteName)!;
      const interval = MATH_INTERVALS.find((i) => i.abbrev === abbrev)!;
      const answer = op === '+'
        ? noteAdd(note.num, interval.num)
        : noteSub(note.num, interval.num);
      const useFlats = op === '-';
      const promptNoteName = displayNote(
        pickAccidentalName(note.displayName, useFlats),
      );
      currentQuestion = {
        note,
        op,
        interval,
        answer,
        useFlats,
        promptText: promptNoteName + ' ' + op + ' ' + interval.abbrev,
      };
      return currentQuestion;
    },

    checkAnswer(_itemId: string, input: string): CheckAnswerResult {
      const q = currentQuestion!;
      const correct = noteMatchesInput(q.answer, input);
      return {
        correct,
        correctAnswer: displayNote(
          pickAccidentalName(q.answer.displayName, q.useFlats),
        ),
      };
    },

    prompt: {
      kind: 'custom',
      render(q: IntervalMathQuestion, els: QuizAreaEls): void {
        els.promptEl.textContent = q.promptText;
        // Update answer button labels to match current accidental direction
        els.container.querySelectorAll<HTMLElement>('.answer-btn-note')
          .forEach((btn) => {
            const note = NOTES.find((n) => n.name === btn.dataset.note!);
            if (note) {
              btn.textContent = displayNote(
                pickAccidentalName(note.displayName, q.useFlats),
              );
            }
          });
      },
      clear(els: QuizAreaEls): void {
        refreshNoteButtonLabels(els.container);
      },
    },

    response: {
      kind: 'buttons',
      answerButtonsHTML: '',
      createKeyHandler(submitAnswer, _getScope) {
        return createAdaptiveKeyHandler(submitAnswer, () => true);
      },
      getButtonAnswer(btn: HTMLElement): string | null {
        return btn.dataset.note ?? null;
      },
    },

    stats: {
      kind: 'grid',
      colLabels: MATH_INTERVALS.map((i) => i.abbrev),
      getItemId(noteName: string, colIdx: number): string | string[] {
        const abbrev = MATH_INTERVALS[colIdx].abbrev;
        return [noteName + '+' + abbrev, noteName + '-' + abbrev];
      },
    },

    getPracticingLabel(scope: ScopeState): string {
      if (scope.kind !== 'groups') return 'all intervals';
      if (scope.enabledGroups.size === DISTANCE_GROUPS.length) {
        return 'all intervals';
      }
      const labels = [...scope.enabledGroups].sort((a, b) => a - b)
        .map((g) => DISTANCE_GROUPS[g].label);
      return labels.join(', ') + ' intervals';
    },

    getSessionSummary(scope: ScopeState): string {
      const count = this.getEnabledItems(scope).length;
      return count + ' items \u00B7 60s';
    },

    calibrationSpec: {
      getButtons(container: HTMLElement): HTMLElement[] {
        return Array.from(container.querySelectorAll('.answer-btn-note'));
      },
    },
  };
}
