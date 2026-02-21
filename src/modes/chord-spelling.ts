// Chord Spelling mode definition: spell out all notes of a chord in root-up order.
// "Cm7" -> user enters C, Eb, G, Bb in sequence.
// ~132 items: 12 roots x chord types, grouped by chord type.

import type {
  CheckAnswerResult,
  ChordType,
  GroupDef,
  ModeDefinition,
  QuizAreaEls,
  ScopeState,
  SequentialInputResult,
  SequentialState,
} from '../types.ts';
import {
  CHORD_ROOTS,
  CHORD_TYPES,
  displayNote,
  getChordTones,
  spelledNoteMatchesInput,
  spelledNoteMatchesSemitone,
} from '../music-data.ts';
import {
  createAdaptiveKeyHandler,
  pickCalibrationButton,
} from '../quiz-engine.ts';

// --- Question type ---

type ChordSpellingQuestion = {
  rootName: string;
  chordType: ChordType;
  tones: string[];
};

// --- Group data ---

// Build groups from CHORD_TYPES' group property
function buildGroups(): { types: ChordType[]; label: string }[] {
  let maxGroup = 0;
  for (const ct of CHORD_TYPES) {
    if (ct.group > maxGroup) maxGroup = ct.group;
  }
  const result: { types: ChordType[]; label: string }[] = [];
  for (let g = 0; g <= maxGroup; g++) {
    const types = CHORD_TYPES.filter((t) => t.group === g);
    const label = types.map((t) => t.symbol || 'maj').join(', ');
    result.push({ types, label });
  }
  return result;
}

const SPELLING_GROUPS = buildGroups();

function getItemIdsForGroup(groupIndex: number): string[] {
  const types = SPELLING_GROUPS[groupIndex].types;
  const items: string[] = [];
  for (const root of CHORD_ROOTS) {
    for (const type of types) {
      items.push(root + ':' + type.name);
    }
  }
  return items;
}

// --- Mode definition factory ---

export function chordSpellingDefinition(): ModeDefinition<
  ChordSpellingQuestion
> {
  // Build full item list
  const ALL_ITEMS: string[] = [];
  for (const root of CHORD_ROOTS) {
    for (const type of CHORD_TYPES) {
      ALL_ITEMS.push(root + ':' + type.name);
    }
  }

  // Build GroupDef array
  const groups: GroupDef[] = SPELLING_GROUPS.map((g, i) => ({
    index: i,
    label: g.label,
    itemIds: getItemIdsForGroup(i),
  }));

  return {
    id: 'chordSpelling',
    name: 'Chord Spelling',
    storageNamespace: 'chordSpelling',

    allItemIds: ALL_ITEMS,

    getEnabledItems(scope: ScopeState): string[] {
      if (scope.kind !== 'groups') return ALL_ITEMS;
      const items: string[] = [];
      for (const g of scope.enabledGroups) {
        items.push(...getItemIdsForGroup(g));
      }
      return items;
    },

    getExpectedResponseCount(itemId: string): number {
      return parseItem(itemId).tones.length;
    },

    scopeSpec: {
      kind: 'groups',
      groups,
      defaultEnabled: [0],
      storageKey: 'chordSpelling_enabledGroups',
      label: 'Chord types',
      sortUnstarted: (a, b) => a.string - b.string,
    },

    getQuestion(itemId: string): ChordSpellingQuestion {
      return parseItem(itemId);
    },

    checkAnswer(_itemId: string, input: string): CheckAnswerResult {
      // Called with '__correct__' or '__wrong__' from sequential handler
      const allCorrect = input === '__correct__';
      // Reconstruct correct answer for display
      const item = parseItem(_itemId);
      const correctAnswer = item.tones.map(displayNote).join(' ');
      return { correct: allCorrect, correctAnswer };
    },

    prompt: {
      kind: 'text',
      getText(q: ChordSpellingQuestion): string {
        return displayNote(q.rootName) + q.chordType.symbol;
      },
    },

    response: {
      kind: 'sequential',
      answerButtonsHTML: '',
      createKeyHandler(submitAnswer, _getScope) {
        // Key handler routes through sequential input, not engine.submitAnswer
        return createAdaptiveKeyHandler(submitAnswer, () => true);
      },

      initSequentialState(itemId: string): SequentialState {
        const item = parseItem(itemId);
        return {
          expectedCount: item.tones.length,
          entries: [],
        };
      },

      handleInput(
        itemId: string,
        input: string,
        state: SequentialState,
      ): SequentialInputResult {
        const item = parseItem(itemId);
        const idx = state.entries.length;
        if (idx >= item.tones.length) {
          // All entries done — shouldn't get here
          const allCorrect = state.entries.every((e) => e.correct);
          return {
            status: 'complete',
            correct: allCorrect,
            correctAnswer: item.tones.map(displayNote).join(' '),
          };
        }

        // Resolve enharmonic: if button pitch matches expected, use expected spelling
        const expected = item.tones[idx];
        if (spelledNoteMatchesSemitone(expected, input)) {
          input = expected;
        }

        const isCorrect = spelledNoteMatchesInput(expected, input);
        const entries = [
          ...state.entries,
          {
            input,
            display: isCorrect ? displayNote(expected) : displayNote(input),
            correct: isCorrect,
          },
        ];

        const newState: SequentialState = {
          expectedCount: item.tones.length,
          entries,
        };

        if (entries.length === item.tones.length) {
          const allCorrect = entries.every((e) => e.correct);
          return {
            status: 'complete',
            correct: allCorrect,
            correctAnswer: item.tones.map(displayNote).join(' '),
          };
        }

        return { status: 'continue', state: newState };
      },

      renderProgress(state: SequentialState, els: QuizAreaEls): void {
        const slotsDiv = els.container.querySelector('.chord-slots');
        if (!slotsDiv) return;
        let html = '';
        for (let i = 0; i < state.expectedCount; i++) {
          let cls = 'chord-slot';
          let content = '_';
          if (i < state.entries.length) {
            content = state.entries[i].display;
            cls += state.entries[i].correct ? ' correct' : ' wrong';
          } else if (i === state.entries.length) {
            cls += ' active';
          }
          html += '<span class="' + cls + '">' + content + '</span>';
        }
        slotsDiv.innerHTML = html;
      },
    },

    stats: {
      kind: 'grid',
      colLabels: CHORD_TYPES.map((t) => t.symbol || 'maj'),
      notes: CHORD_ROOTS.map((r) => ({ name: r, displayName: r })),
      getItemId(rootName: string, colIdx: number): string | string[] {
        return rootName + ':' + CHORD_TYPES[colIdx].name;
      },
    },

    getPracticingLabel(scope: ScopeState): string {
      if (scope.kind !== 'groups') return 'all chord types';
      if (scope.enabledGroups.size === SPELLING_GROUPS.length) {
        return 'all chord types';
      }
      const labels = [...scope.enabledGroups].sort((a, b) => a - b)
        .map((g) => SPELLING_GROUPS[g].label);
      return labels.join(', ') + ' chords';
    },

    getSessionSummary(scope: ScopeState): string {
      const count = this.getEnabledItems(scope).length;
      return count + ' items \u00B7 60s';
    },

    calibrationProvider: 'button',

    calibrationSpec: {
      introHint:
        'We\u2019ll measure your response speed to set personalized targets. Press the notes shown in the prompt, in order \u2014 10 rounds total.',
      getButtons(container: HTMLElement): HTMLElement[] {
        return Array.from(container.querySelectorAll('.answer-btn-note'));
      },
      getTrialConfig(
        buttons: HTMLElement[],
        prevBtn: HTMLElement | null,
      ) {
        // Multi-press: pick 2–4 random note buttons
        const count = 2 + Math.floor(Math.random() * 3);
        const targets: HTMLElement[] = [];
        let prev = prevBtn;
        for (let i = 0; i < count; i++) {
          const btn = pickCalibrationButton(buttons, prev);
          targets.push(btn);
          prev = btn;
        }
        const labels = targets.map((b) => b.textContent);
        return { prompt: 'Press ' + labels.join(' '), targetButtons: targets };
      },
    },
  };
}

// --- Helpers ---

function parseItem(
  itemId: string,
): ChordSpellingQuestion {
  const colonIdx = itemId.indexOf(':');
  const rootName = itemId.substring(0, colonIdx);
  const typeName = itemId.substring(colonIdx + 1);
  const chordType = CHORD_TYPES.find((t) => t.name === typeName)!;
  const tones = getChordTones(rootName, chordType);
  return { rootName, chordType, tones };
}
