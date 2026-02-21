// Interval Math Preact mode: note +/- interval = note.
// "C + m3 = ?" -> D#/Eb.  Nearly identical to Semitone Math but with
// interval abbreviations instead of semitone counts.

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'preact/hooks';
import type { Interval, Note, RecommendationResult } from '../../types.ts';
import {
  displayNote,
  INTERVALS,
  noteAdd,
  noteMatchesInput,
  NOTES,
  noteSub,
  pickAccidentalName,
} from '../../music-data.ts';
import { createAdaptiveKeyHandler } from '../../quiz-engine.ts';
import { computeRecommendations } from '../../recommendations.ts';
import {
  buildRecommendationText,
  computePracticeSummary,
} from '../../mode-ui-state.ts';
import { computeMedian } from '../../adaptive.ts';

import { useLearnerModel } from '../../hooks/use-learner-model.ts';
import { useScopeState } from '../../hooks/use-scope-state.ts';
import type { QuizEngineConfig } from '../../hooks/use-quiz-engine.ts';
import { useQuizEngine } from '../../hooks/use-quiz-engine.ts';

import { NoteButtons } from '../buttons.tsx';
import { GroupToggles } from '../scope.tsx';
import {
  ModeTopBar,
  PracticeCard,
  QuizArea,
  QuizSession,
  RoundComplete,
  TabbedIdle,
} from '../mode-screen.tsx';
import type { StatsSelector } from '../stats.tsx';
import { StatsGrid, StatsToggle } from '../stats.tsx';
import { FeedbackDisplay } from '../quiz-ui.tsx';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MATH_INTERVALS = INTERVALS.filter((i) => i.num >= 1 && i.num <= 11);

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

const ALL_ITEMS: string[] = [];
for (const note of NOTES) {
  for (const interval of MATH_INTERVALS) {
    ALL_ITEMS.push(note.name + '+' + interval.abbrev);
    ALL_ITEMS.push(note.name + '-' + interval.abbrev);
  }
}

const ALL_GROUP_INDICES = DISTANCE_GROUPS.map((_, i) => i);

type Question = {
  note: Note;
  op: string;
  interval: Interval;
  answer: Note;
  useFlats: boolean;
  promptText: string;
};

function getQuestion(itemId: string): Question {
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
  return {
    note,
    op,
    interval,
    answer,
    useFlats,
    promptText: promptNoteName + ' ' + op + ' ' + interval.abbrev,
  };
}

function checkAnswer(q: Question, input: string) {
  const correct = noteMatchesInput(q.answer, input);
  return {
    correct,
    correctAnswer: displayNote(
      pickAccidentalName(q.answer.displayName, q.useFlats),
    ),
  };
}

// Stats grid column config
const GRID_COL_LABELS = MATH_INTERVALS.map((i) => i.abbrev);
function getGridItemId(
  noteName: string,
  colIdx: number,
): string[] {
  const abbrev = MATH_INTERVALS[colIdx].abbrev;
  return [noteName + '+' + abbrev, noteName + '-' + abbrev];
}

// ---------------------------------------------------------------------------
// Mode handle for navigation integration
// ---------------------------------------------------------------------------

export type ModeHandle = {
  activate(): void;
  deactivate(): void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function IntervalMathMode(
  { container, navigateHome, onMount }: {
    container: HTMLElement;
    navigateHome: () => void;
    onMount: (handle: ModeHandle) => void;
  },
) {
  // --- Scope ---
  const [scope, scopeActions] = useScopeState({
    kind: 'groups',
    groups: DISTANCE_GROUPS.map((g, i) => ({
      index: i,
      label: g.label,
      itemIds: getItemIdsForGroup(i),
    })),
    defaultEnabled: [0],
    storageKey: 'intervalMath_enabledGroups',
    label: 'Intervals',
    sortUnstarted: (a, b) => a.string - b.string,
  });

  const enabledGroups = scope.kind === 'groups'
    ? scope.enabledGroups
    : new Set([0]);

  // --- Core hooks ---
  const learner = useLearnerModel('intervalMath', ALL_ITEMS);

  // --- Enabled items (derived from scope) ---
  const enabledItems = useMemo(() => {
    const items: string[] = [];
    for (const g of enabledGroups) {
      items.push(...getItemIdsForGroup(g));
    }
    return items;
  }, [enabledGroups]);

  // --- Question state ---
  const [currentQ, setCurrentQ] = useState<Question | null>(null);
  const currentQRef = useRef<Question | null>(null);

  // --- Key handler ---
  const engineSubmitRef = useRef<(input: string) => void>(() => {});
  const noteHandler = useMemo(
    () =>
      createAdaptiveKeyHandler(
        (note: string) => engineSubmitRef.current(note),
        () => true,
      ),
    [],
  );

  // --- Recommendations ---
  const recommendation = useMemo((): RecommendationResult => {
    return computeRecommendations(
      learner.selector,
      ALL_GROUP_INDICES,
      getItemIdsForGroup,
      { expansionThreshold: 0.7 },
      { sortUnstarted: (a, b) => a.string - b.string },
    );
  }, [learner.selector]);

  const recommendationText = useMemo(() => {
    return buildRecommendationText(
      recommendation,
      (i: number) => DISTANCE_GROUPS[i].label,
    );
  }, [recommendation]);

  const applyRecommendation = useCallback(() => {
    if (recommendation.enabled) {
      scopeActions.setScope({
        kind: 'groups',
        enabledGroups: recommendation.enabled,
      });
    }
  }, [recommendation, scopeActions]);

  // --- Practicing label ---
  const practicingLabel = useMemo(() => {
    if (enabledGroups.size === DISTANCE_GROUPS.length) return 'all intervals';
    const labels = [...enabledGroups].sort((a, b) => a - b)
      .map((g) => DISTANCE_GROUPS[g].label);
    return labels.join(', ') + ' intervals';
  }, [enabledGroups]);

  // --- Engine config ---
  const engineConfig = useMemo((): QuizEngineConfig => ({
    getEnabledItems: () => {
      const items: string[] = [];
      const groups = scope.kind === 'groups'
        ? scope.enabledGroups
        : new Set([0]);
      for (const g of groups) {
        items.push(...getItemIdsForGroup(g));
      }
      return items;
    },

    checkAnswer: (_itemId: string, input: string) => {
      const q = currentQRef.current!;
      return checkAnswer(q, input);
    },

    onPresent: (itemId: string) => {
      const q = getQuestion(itemId);
      currentQRef.current = q;
      setCurrentQ(q);
    },

    handleKey: (
      e: KeyboardEvent,
      _ctx: { submitAnswer: (input: string) => void },
    ): boolean | void => {
      return noteHandler.handleKey(e);
    },

    onStart: () => {
      noteHandler.reset();
    },

    onStop: () => {
      noteHandler.reset();
    },

    getPracticingLabel: () => {
      const groups = scope.kind === 'groups'
        ? scope.enabledGroups
        : new Set([0]);
      if (groups.size === DISTANCE_GROUPS.length) return 'all intervals';
      const labels = [...groups].sort((a, b) => a - b)
        .map((g) => DISTANCE_GROUPS[g].label);
      return labels.join(', ') + ' intervals';
    },
  }), [scope, noteHandler]);

  const engine = useQuizEngine(engineConfig, learner.selector);
  engineSubmitRef.current = engine.submitAnswer;

  // --- Phase class sync ---
  useEffect(() => {
    const phase = engine.state.phase;
    const cls = phase === 'idle'
      ? 'phase-idle'
      : phase === 'round-complete'
      ? 'phase-round-complete'
      : 'phase-active';
    container.classList.remove(
      'phase-idle',
      'phase-active',
      'phase-round-complete',
    );
    container.classList.add(cls);
  }, [engine.state.phase, container]);

  // --- Tab state ---
  const [activeTab, setActiveTab] = useState<'practice' | 'progress'>(
    'practice',
  );
  const [statsMode, setStatsMode] = useState('retention');

  // --- Practice summary ---
  const sessionSummary = enabledItems.length + ' items \u00B7 60s';
  const summary = useMemo(
    () =>
      computePracticeSummary({
        allItemIds: ALL_ITEMS,
        selector: learner.selector,
        itemNoun: 'items',
        recommendation,
        recommendationText,
        sessionSummary,
        masteryText: engine.state.masteryText,
        showMastery: engine.state.showMastery,
      }),
    [
      learner.selector,
      recommendation,
      recommendationText,
      sessionSummary,
      engine.state.masteryText,
      engine.state.showMastery,
      engine.state.phase,
    ],
  );

  // --- Navigation handle ---
  useLayoutEffect(() => {
    onMount({
      activate() {
        learner.syncBaseline();
        engine.updateIdleMessage();
      },
      deactivate() {
        if (engine.state.phase !== 'idle') engine.stop();
        noteHandler.reset();
      },
    });
  }, [engine, learner, noteHandler]);

  // --- Derived state ---
  const promptText = currentQ?.promptText ?? '';
  const useFlats = currentQ?.useFlats;

  // Button answer handler
  const handleNoteAnswer = useCallback(
    (note: string) => engine.submitAnswer(note),
    [engine.submitAnswer],
  );

  // Round-complete derived values
  const roundContext = useMemo(() => {
    const s = engine.state;
    const fluency = s.masteredCount + ' / ' + s.totalEnabledCount + ' fluent';
    return practicingLabel + ' \u00B7 ' + fluency;
  }, [
    engine.state.masteredCount,
    engine.state.totalEnabledCount,
    practicingLabel,
  ]);

  const roundCorrect = useMemo(() => {
    const s = engine.state;
    const dur = Math.round((s.roundDurationMs || 0) / 1000);
    return s.roundCorrect + ' / ' + s.roundAnswered + ' correct \u00B7 ' +
      dur + 's';
  }, [
    engine.state.roundCorrect,
    engine.state.roundAnswered,
    engine.state.roundDurationMs,
  ]);

  const roundMedian = useMemo(() => {
    const times = engine.state.roundResponseTimes;
    const median = computeMedian(times);
    return median !== null
      ? (median / 1000).toFixed(1) + 's median response time'
      : '';
  }, [engine.state.roundResponseTimes]);

  // Stats selector adapter
  const statsSelector = useMemo((): StatsSelector => ({
    getAutomaticity: (id: string) => learner.selector.getAutomaticity(id),
    getStats: (id: string) => learner.selector.getStats(id),
  }), [learner.selector, engine.state.phase, statsMode]);

  // Baseline info
  const baselineText = learner.motorBaseline
    ? 'Response time baseline: ' +
      (learner.motorBaseline / 1000).toFixed(1) + 's'
    : 'Response time baseline: 1s (default)';

  // Answer count text
  const answerCount = engine.state.roundAnswered;
  const countText = answerCount +
    (answerCount === 1 ? ' answer' : ' answers');

  // --- Render ---
  return (
    <>
      <ModeTopBar title='Interval Math' onBack={navigateHome} />
      <TabbedIdle
        activeTab={activeTab}
        onTabSwitch={setActiveTab}
        practiceContent={
          <PracticeCard
            statusLabel={summary.statusLabel}
            statusDetail={summary.statusDetail}
            recommendation={summary.recommendationText || undefined}
            mastery={summary.showMastery ? summary.masteryText : undefined}
            sessionSummary={sessionSummary}
            onStart={engine.start}
            onApplyRecommendation={summary.showRecommendationButton
              ? applyRecommendation
              : undefined}
            scope={
              <GroupToggles
                labels={DISTANCE_GROUPS.map((g) => g.label)}
                active={enabledGroups}
                recommended={recommendation.expandIndex ?? undefined}
                onToggle={scopeActions.toggleGroup}
              />
            }
          />
        }
        progressContent={
          <div>
            <div class='baseline-info'>{baselineText}</div>
            <div class='stats-controls'>
              <StatsToggle active={statsMode} onToggle={setStatsMode} />
            </div>
            <div class='stats-container'>
              <StatsGrid
                selector={statsSelector}
                colLabels={GRID_COL_LABELS}
                getItemId={getGridItemId}
                statsMode={statsMode}
                baseline={learner.motorBaseline ?? undefined}
              />
            </div>
          </div>
        }
      />
      <QuizSession
        timeLeft={engine.timerText}
        context={practicingLabel}
        count={countText}
        fluent={engine.state.masteredCount}
        total={engine.state.totalEnabledCount}
        isWarning={engine.timerWarning}
        isLastQuestion={engine.timerLastQuestion}
        onClose={engine.stop}
      />
      <QuizArea
        prompt={promptText}
        lastQuestion={engine.state.roundTimerExpired ? 'Last question' : ''}
      >
        <NoteButtons onAnswer={handleNoteAnswer} useFlats={useFlats} />
        <FeedbackDisplay
          text={engine.state.feedbackText}
          className={engine.state.feedbackClass}
          time={engine.state.timeDisplayText || undefined}
          hint={engine.state.hintText || undefined}
        />
        <RoundComplete
          context={roundContext}
          heading='Round complete'
          correct={roundCorrect}
          median={roundMedian}
          onContinue={engine.continueQuiz}
          onStop={engine.stop}
        />
      </QuizArea>
    </>
  );
}
