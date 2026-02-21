// Interval Semitones mode definition: bidirectional interval <-> semitone number.
// Forward: "minor 3rd = ?" -> 3, Reverse: "7 = ?" -> Perfect 5th
// 24 items total (12 intervals x 2 directions).

import type {
  CheckAnswerResult,
  Interval,
  ModeDefinition,
  NoteKeyHandler,
  ScopeState,
  StatsTableRow,
} from '../types.ts';
import { intervalMatchesInput, INTERVALS } from '../music-data.ts';

// --- Question type ---

type IntervalSemitonesQuestion = {
  interval: Interval;
  dir: 'fwd' | 'rev';
};

// --- Mode definition factory ---

export function intervalSemitonesDefinition(): ModeDefinition<
  IntervalSemitonesQuestion
> {
  // Build item list: 12 intervals x 2 directions
  const ALL_ITEMS: string[] = [];
  for (const interval of INTERVALS) {
    ALL_ITEMS.push(interval.abbrev + ':fwd');
    ALL_ITEMS.push(interval.abbrev + ':rev');
  }

  // Closure state: tracks current question for key handler
  let currentQuestion: IntervalSemitonesQuestion | null = null;

  return {
    id: 'intervalSemitones',
    name: 'Interval \u2194 Semitones',
    storageNamespace: 'intervalSemitones',

    allItemIds: ALL_ITEMS,

    getEnabledItems(_scope: ScopeState): string[] {
      return ALL_ITEMS;
    },

    scopeSpec: { kind: 'none' },

    getQuestion(itemId: string): IntervalSemitonesQuestion {
      const [abbrev, dir] = itemId.split(':');
      const interval = INTERVALS.find((i) => i.abbrev === abbrev)!;
      currentQuestion = { interval, dir: dir as 'fwd' | 'rev' };
      return currentQuestion;
    },

    checkAnswer(_itemId: string, input: string): CheckAnswerResult {
      const q = currentQuestion!;
      if (q.dir === 'fwd') {
        const correct = parseInt(input, 10) === q.interval.num;
        return { correct, correctAnswer: String(q.interval.num) };
      } else {
        const correct = intervalMatchesInput(q.interval, input);
        return { correct, correctAnswer: q.interval.abbrev };
      }
    },

    prompt: {
      kind: 'text',
      getText(q: IntervalSemitonesQuestion): string {
        return q.dir === 'fwd' ? q.interval.name : String(q.interval.num);
      },
    },

    response: {
      kind: 'bidirectional',
      groups: [
        {
          id: 'intervals',
          html: '',
          getButtonAnswer(btn: HTMLElement): string | null {
            return btn.dataset.interval ?? null;
          },
        },
        {
          id: 'numbers',
          html: '',
          getButtonAnswer(btn: HTMLElement): string | null {
            return btn.dataset.num ?? null;
          },
        },
      ],
      getActiveGroup(question: unknown): string {
        const q = question as IntervalSemitonesQuestion;
        return q.dir === 'fwd' ? 'numbers' : 'intervals';
      },
      createKeyHandler(
        submitAnswer: (input: string) => void,
        _getScope: () => ScopeState,
      ): NoteKeyHandler {
        // Digit buffering for forward direction (handles 10, 11, 12)
        let pendingDigit: number | null = null;
        let pendingDigitTimeout: ReturnType<typeof setTimeout> | null = null;

        return {
          handleKey(e: KeyboardEvent): boolean {
            if (currentQuestion?.dir === 'rev') {
              // No keyboard for interval buttons
              return false;
            }
            // Forward: number keys for semitone answer
            if (e.key >= '0' && e.key <= '9') {
              e.preventDefault();
              if (pendingDigit !== null) {
                const num = pendingDigit * 10 + parseInt(e.key);
                clearTimeout(pendingDigitTimeout!);
                pendingDigit = null;
                pendingDigitTimeout = null;
                if (num >= 1 && num <= 12) submitAnswer(String(num));
                return true;
              }
              const d = parseInt(e.key);
              if (d >= 2 && d <= 9) {
                submitAnswer(String(d));
              } else {
                // 0 or 1 — could be 10, 11, 12
                pendingDigit = d;
                pendingDigitTimeout = setTimeout(() => {
                  if (pendingDigit! >= 1) submitAnswer(String(pendingDigit));
                  pendingDigit = null;
                  pendingDigitTimeout = null;
                }, 400);
              }
              return true;
            }
            return false;
          },
          reset(): void {
            if (pendingDigitTimeout) clearTimeout(pendingDigitTimeout);
            pendingDigit = null;
            pendingDigitTimeout = null;
          },
        };
      },
    },

    stats: {
      kind: 'table',
      fwdHeader: 'I\u2192#',
      revHeader: '#\u2192I',
      getRows(): StatsTableRow[] {
        return INTERVALS.map((interval) => ({
          label: interval.abbrev,
          sublabel: String(interval.num),
          _colHeader: 'Interval',
          fwdItemId: interval.abbrev + ':fwd',
          revItemId: interval.abbrev + ':rev',
        }));
      },
    },

    getPracticingLabel(_scope: ScopeState): string {
      return 'all items';
    },

    getSessionSummary(_scope: ScopeState): string {
      return ALL_ITEMS.length + ' items \u00B7 60s';
    },

    calibrationSpec: {
      getButtons(container: HTMLElement): HTMLElement[] {
        return Array.from(container.querySelectorAll('.answer-btn-interval'));
      },
      getTrialConfig(
        buttons: HTMLElement[],
        prevBtn: HTMLElement | null,
      ) {
        let btn: HTMLElement;
        do {
          btn = buttons[Math.floor(Math.random() * buttons.length)];
        } while (btn === prevBtn && buttons.length > 1);
        return { prompt: 'Press ' + btn.textContent, targetButtons: [btn] };
      },
    },
  };
}
