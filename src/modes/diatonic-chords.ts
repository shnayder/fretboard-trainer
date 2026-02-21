// Diatonic Chords mode definition: key + roman numeral <-> chord root.
// Forward: "IV in Bb major?" -> Eb, Reverse: "Dm is what in C major?" -> ii
// 168 items: 12 keys x 7 degrees x 2 directions.
// Grouped by degree importance for progressive unlocking.

import type {
  CheckAnswerResult,
  DiatonicChord,
  GroupDef,
  MajorKey,
  ModeDefinition,
  NoteKeyHandler,
  ScopeState,
} from '../types.ts';
import {
  DIATONIC_CHORDS,
  displayNote,
  getScaleDegreeNote,
  MAJOR_KEYS,
  ROMAN_NUMERALS,
  spelledNoteMatchesSemitone,
} from '../music-data.ts';
import { createAdaptiveKeyHandler } from '../quiz-engine.ts';

// --- Question type ---

type DiatonicChordQuestion = {
  key: MajorKey;
  degree: number;
  chord: DiatonicChord;
  dir: 'fwd' | 'rev';
  rootNote: string;
};

// --- Group data ---

const CHORD_GROUPS = [
  { degrees: [1, 4, 5], label: 'I,IV,V' },
  { degrees: [2, 6], label: 'ii,vi' },
  { degrees: [3, 7], label: 'iii,vii\u00B0' },
];

function getItemIdsForGroup(groupIndex: number): string[] {
  const degrees = CHORD_GROUPS[groupIndex].degrees;
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

export function diatonicChordsDefinition(): ModeDefinition<
  DiatonicChordQuestion
> {
  // Build full item list
  const ALL_ITEMS: string[] = [];
  for (const key of MAJOR_KEYS) {
    for (let d = 1; d <= 7; d++) {
      ALL_ITEMS.push(key.root + ':' + d + ':fwd');
      ALL_ITEMS.push(key.root + ':' + d + ':rev');
    }
  }

  // Build GroupDef array
  const groups: GroupDef[] = CHORD_GROUPS.map((g, i) => ({
    index: i,
    label: g.label,
    itemIds: getItemIdsForGroup(i),
  }));

  // Closure state
  let currentQuestion: DiatonicChordQuestion | null = null;

  return {
    id: 'diatonicChords',
    name: 'Diatonic Chords',
    storageNamespace: 'diatonicChords',

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
      storageKey: 'diatonicChords_enabledGroups',
      label: 'Chords',
      sortUnstarted: (a, b) => a.string - b.string,
    },

    getQuestion(itemId: string): DiatonicChordQuestion {
      const parts = itemId.split(':');
      const keyRoot = parts[0];
      const degree = parseInt(parts[1]);
      const dir = parts[2] as 'fwd' | 'rev';
      const key = MAJOR_KEYS.find((k) => k.root === keyRoot)!;
      const chord = DIATONIC_CHORDS[degree - 1];
      const rootNote = getScaleDegreeNote(keyRoot, degree);
      currentQuestion = { key, degree, chord, dir, rootNote };
      return currentQuestion;
    },

    checkAnswer(_itemId: string, input: string): CheckAnswerResult {
      const q = currentQuestion!;
      if (q.dir === 'fwd') {
        const correct = spelledNoteMatchesSemitone(q.rootNote, input);
        const fullAnswer = displayNote(q.rootNote) + ' ' + q.chord.quality;
        return { correct, correctAnswer: fullAnswer };
      } else {
        const expectedNumeral = q.chord.numeral;
        return {
          correct: input === expectedNumeral,
          correctAnswer: expectedNumeral,
        };
      }
    },

    prompt: {
      kind: 'text',
      getText(q: DiatonicChordQuestion): string {
        if (q.dir === 'fwd') {
          return q.chord.numeral + ' in ' +
            displayNote(q.key.root) + ' major';
        } else {
          const chordName = displayNote(q.rootNote) + q.chord.qualityLabel;
          return chordName + ' in ' + displayNote(q.key.root) + ' major';
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
          id: 'numerals',
          html: '',
          getButtonAnswer(btn: HTMLElement): string | null {
            return btn.dataset.numeral ?? null;
          },
        },
      ],
      getActiveGroup(question: unknown): string {
        const q = question as DiatonicChordQuestion;
        return q.dir === 'fwd' ? 'notes' : 'numerals';
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
            // Reverse: number keys 1-7 for roman numeral
            if (e.key >= '1' && e.key <= '7') {
              e.preventDefault();
              submitAnswer(ROMAN_NUMERALS[parseInt(e.key) - 1]);
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
      colLabels: ROMAN_NUMERALS,
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
      if (scope.kind !== 'groups') return 'all chords';
      if (scope.enabledGroups.size === CHORD_GROUPS.length) {
        return 'all chords';
      }
      const numerals = [...scope.enabledGroups].sort((a, b) => a - b)
        .flatMap((g) => CHORD_GROUPS[g].degrees)
        .sort((a, b) => a - b)
        .map((d) => ROMAN_NUMERALS[d - 1]);
      return numerals.join(', ') + ' chords';
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
