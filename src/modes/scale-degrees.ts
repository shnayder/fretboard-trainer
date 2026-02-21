// Scale Degrees mode definition: key + degree <-> note name.
// Forward: "5th of D major?" -> A, Reverse: "In D major, A is the ?" -> 5th
// 168 items: 12 keys x 7 degrees x 2 directions.
// Grouped by degree for progressive unlocking.

import type {
  CheckAnswerResult,
  GroupDef,
  MajorKey,
  ModeDefinition,
  NoteKeyHandler,
  ScopeState,
} from '../types.ts';
import {
  displayNote,
  getScaleDegreeNote,
  MAJOR_KEYS,
  spelledNoteMatchesSemitone,
} from '../music-data.ts';
import { createAdaptiveKeyHandler } from '../quiz-engine.ts';

// --- Question type ---

type ScaleDegreeQuestion = {
  key: MajorKey;
  degree: number;
  dir: 'fwd' | 'rev';
  noteName: string;
};

// --- Group data ---

const DEGREE_LABELS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th'];

const DEGREE_GROUPS = [
  { degrees: [1, 5], label: '1st,5th' },
  { degrees: [4], label: '4th' },
  { degrees: [3, 7], label: '3rd,7th' },
  { degrees: [2, 6], label: '2nd,6th' },
];

function getItemIdsForGroup(groupIndex: number): string[] {
  const degrees = DEGREE_GROUPS[groupIndex].degrees;
  const items: string[] = [];
  for (const key of MAJOR_KEYS) {
    for (const d of degrees) {
      items.push(key.root + ':' + d + ':fwd');
      items.push(key.root + ':' + d + ':rev');
    }
  }
  return items;
}

// --- Mode definition factory ---

export function scaleDegreesDefinition(): ModeDefinition<ScaleDegreeQuestion> {
  // Build full item list
  const ALL_ITEMS: string[] = [];
  for (const key of MAJOR_KEYS) {
    for (let d = 1; d <= 7; d++) {
      ALL_ITEMS.push(key.root + ':' + d + ':fwd');
      ALL_ITEMS.push(key.root + ':' + d + ':rev');
    }
  }

  // Build GroupDef array
  const groups: GroupDef[] = DEGREE_GROUPS.map((g, i) => ({
    index: i,
    label: g.label,
    itemIds: getItemIdsForGroup(i),
  }));

  // Closure state
  let currentQuestion: ScaleDegreeQuestion | null = null;

  return {
    id: 'scaleDegrees',
    name: 'Scale Degrees',
    storageNamespace: 'scaleDegrees',

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
      storageKey: 'scaleDegrees_enabledGroups',
      label: 'Degrees',
      sortUnstarted: (a, b) => a.string - b.string,
    },

    getQuestion(itemId: string): ScaleDegreeQuestion {
      const parts = itemId.split(':');
      const keyRoot = parts[0];
      const degree = parseInt(parts[1]);
      const dir = parts[2] as 'fwd' | 'rev';
      const key = MAJOR_KEYS.find((k) => k.root === keyRoot)!;
      const noteName = getScaleDegreeNote(keyRoot, degree);
      currentQuestion = { key, degree, dir, noteName };
      return currentQuestion;
    },

    checkAnswer(_itemId: string, input: string): CheckAnswerResult {
      const q = currentQuestion!;
      if (q.dir === 'fwd') {
        const correct = spelledNoteMatchesSemitone(q.noteName, input);
        return { correct, correctAnswer: displayNote(q.noteName) };
      } else {
        const expectedDegree = String(q.degree);
        return {
          correct: input === expectedDegree,
          correctAnswer: DEGREE_LABELS[q.degree - 1],
        };
      }
    },

    prompt: {
      kind: 'text',
      getText(q: ScaleDegreeQuestion): string {
        if (q.dir === 'fwd') {
          return DEGREE_LABELS[q.degree - 1] + ' of ' +
            displayNote(q.key.root) + ' major';
        } else {
          return displayNote(q.key.root) + ' major: ' +
            displayNote(q.noteName);
        }
      },
    },

    response: {
      kind: 'bidirectional',
      groups: [
        {
          id: 'notes',
          html: '',
          getButtonAnswer(btn: HTMLElement): string | null {
            return btn.dataset.note ?? null;
          },
        },
        {
          id: 'degrees',
          html: '',
          getButtonAnswer(btn: HTMLElement): string | null {
            return btn.dataset.degree ?? null;
          },
        },
      ],
      getActiveGroup(question: unknown): string {
        const q = question as ScaleDegreeQuestion;
        return q.dir === 'fwd' ? 'notes' : 'degrees';
      },
      createKeyHandler(
        submitAnswer: (input: string) => void,
        _getScope: () => ScopeState,
      ): NoteKeyHandler {
        const noteHandler = createAdaptiveKeyHandler(
          submitAnswer,
          () => true,
        );

        return {
          handleKey(e: KeyboardEvent): boolean {
            if (currentQuestion?.dir === 'fwd') {
              return noteHandler.handleKey(e);
            }
            // Reverse: number keys 1-7 for degree
            if (e.key >= '1' && e.key <= '7') {
              e.preventDefault();
              submitAnswer(e.key);
              return true;
            }
            return false;
          },
          reset(): void {
            noteHandler.reset();
          },
        };
      },
    },

    stats: {
      kind: 'grid',
      colLabels: DEGREE_LABELS,
      notes: MAJOR_KEYS.map((k) => ({
        name: k.root,
        displayName: k.root,
      })),
      getItemId(keyRoot: string, colIdx: number): string | string[] {
        const d = colIdx + 1;
        return [keyRoot + ':' + d + ':fwd', keyRoot + ':' + d + ':rev'];
      },
    },

    getPracticingLabel(scope: ScopeState): string {
      if (scope.kind !== 'groups') return 'all degrees';
      if (scope.enabledGroups.size === DEGREE_GROUPS.length) {
        return 'all degrees';
      }
      const degrees = [...scope.enabledGroups].sort((a, b) => a - b)
        .flatMap((g) => DEGREE_GROUPS[g].degrees)
        .sort((a, b) => a - b);
      return degrees.map((d) => DEGREE_LABELS[d - 1]).join(', ') + ' degrees';
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
