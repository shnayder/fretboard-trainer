// Key Signatures mode definition: key name <-> accidental count.
// Forward: "D major -> ?" -> "2#", Reverse: "3b -> ?" -> Eb
// 24 items: 12 major keys x 2 directions.
// Grouped by accidental count for progressive unlocking.

import type {
  CheckAnswerResult,
  GroupDef,
  MajorKey,
  ModeDefinition,
  NoteKeyHandler,
  ScopeState,
  StatsTableRow,
} from '../types.ts';
import {
  displayNote,
  keySignatureLabel,
  MAJOR_KEYS,
  spelledNoteMatchesSemitone,
} from '../music-data.ts';
import { createAdaptiveKeyHandler } from '../quiz-engine.ts';

// --- Question type ---

type KeySigQuestion = {
  key: MajorKey;
  dir: 'fwd' | 'rev';
};

// --- Group data ---

const KEY_GROUPS = [
  { keys: ['C', 'G', 'F'], label: 'C G F' },
  { keys: ['D', 'Bb'], label: 'D B\u266D' },
  { keys: ['A', 'Eb'], label: 'A E\u266D' },
  { keys: ['E', 'Ab'], label: 'E A\u266D' },
  { keys: ['B', 'Db', 'F#'], label: 'B D\u266D F\u266F' },
];

function getItemIdsForGroup(groupIndex: number): string[] {
  const roots = KEY_GROUPS[groupIndex].keys;
  const items: string[] = [];
  for (const root of roots) {
    items.push(root + ':fwd');
    items.push(root + ':rev');
  }
  return items;
}

// --- Mode definition factory ---

export function keySignaturesDefinition(): ModeDefinition<KeySigQuestion> {
  // Build full item list
  const ALL_ITEMS: string[] = [];
  for (const key of MAJOR_KEYS) {
    ALL_ITEMS.push(key.root + ':fwd');
    ALL_ITEMS.push(key.root + ':rev');
  }

  // Build GroupDef array
  const groups: GroupDef[] = KEY_GROUPS.map((g, i) => ({
    index: i,
    label: g.label,
    itemIds: getItemIdsForGroup(i),
  }));

  // Closure state
  let currentQuestion: KeySigQuestion | null = null;

  return {
    id: 'keySignatures',
    name: 'Key Signatures',
    storageNamespace: 'keySignatures',

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
      defaultEnabled: [0, 1],
      storageKey: 'keySignatures_enabledGroups',
      label: 'Keys',
      sortUnstarted: (a, b) => a.string - b.string,
    },

    getQuestion(itemId: string): KeySigQuestion {
      const [rootName, dir] = itemId.split(':');
      const key = MAJOR_KEYS.find((k) => k.root === rootName)!;
      currentQuestion = { key, dir: dir as 'fwd' | 'rev' };
      return currentQuestion;
    },

    checkAnswer(_itemId: string, input: string): CheckAnswerResult {
      const q = currentQuestion!;
      if (q.dir === 'fwd') {
        const expected = keySignatureLabel(q.key);
        return { correct: input === expected, correctAnswer: expected };
      } else {
        const correct = spelledNoteMatchesSemitone(q.key.root, input);
        return { correct, correctAnswer: displayNote(q.key.root) };
      }
    },

    prompt: {
      kind: 'text',
      getText(q: KeySigQuestion): string {
        if (q.dir === 'fwd') {
          return displayNote(q.key.root) + ' major';
        } else {
          return keySignatureLabel(q.key) + ' major';
        }
      },
    },

    response: {
      kind: 'bidirectional',
      groups: [
        {
          id: 'keysig',
          html: '',
          getButtonAnswer(btn: HTMLElement): string | null {
            return btn.dataset.sig ?? null;
          },
        },
        {
          id: 'notes',
          html: '',
          getButtonAnswer(btn: HTMLElement): string | null {
            return btn.dataset.note ?? null;
          },
        },
      ],
      getActiveGroup(question: unknown): string {
        const q = question as KeySigQuestion;
        return q.dir === 'fwd' ? 'keysig' : 'notes';
      },
      createKeyHandler(
        submitAnswer: (input: string) => void,
        _getScope: () => ScopeState,
      ): NoteKeyHandler {
        // Digit + #/b for key sigs in forward direction,
        // note keys for reverse direction
        let pendingSigDigit: string | null = null;
        let pendingSigTimeout: ReturnType<typeof setTimeout> | null = null;
        const noteHandler = createAdaptiveKeyHandler(
          submitAnswer,
          () => true,
        );

        return {
          handleKey(e: KeyboardEvent): boolean {
            if (currentQuestion?.dir === 'rev') {
              return noteHandler.handleKey(e);
            }
            // Forward: number keys for sig
            if (e.key >= '0' && e.key <= '7') {
              e.preventDefault();
              if (pendingSigTimeout) clearTimeout(pendingSigTimeout);
              pendingSigDigit = e.key;
              pendingSigTimeout = setTimeout(() => {
                if (pendingSigDigit === '0') {
                  submitAnswer('0');
                }
                pendingSigDigit = null;
                pendingSigTimeout = null;
              }, 600);
              return true;
            }
            if (
              pendingSigDigit !== null && (e.key === '#' || e.key === 'b')
            ) {
              e.preventDefault();
              clearTimeout(pendingSigTimeout!);
              const answer = pendingSigDigit + e.key;
              pendingSigDigit = null;
              pendingSigTimeout = null;
              submitAnswer(answer);
              return true;
            }
            return false;
          },
          reset(): void {
            if (pendingSigTimeout) clearTimeout(pendingSigTimeout);
            pendingSigDigit = null;
            pendingSigTimeout = null;
            noteHandler.reset();
          },
        };
      },
    },

    stats: {
      kind: 'table',
      fwdHeader: 'Key\u2192Sig',
      revHeader: 'Sig\u2192Key',
      getRows(): StatsTableRow[] {
        return MAJOR_KEYS.map((key) => ({
          label: displayNote(key.root) + ' major',
          sublabel: keySignatureLabel(key),
          _colHeader: 'Key',
          fwdItemId: key.root + ':fwd',
          revItemId: key.root + ':rev',
        }));
      },
    },

    getPracticingLabel(scope: ScopeState): string {
      if (scope.kind !== 'groups') return 'all keys';
      if (scope.enabledGroups.size === KEY_GROUPS.length) return 'all keys';
      const keys = [...scope.enabledGroups].sort((a, b) => a - b)
        .flatMap((g) => KEY_GROUPS[g].keys)
        .map((k) => displayNote(k));
      return keys.join(', ');
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
