// Scale Degrees Preact mode: bidirectional key + degree <-> note name.
// Forward: "5th of D major?" -> A, Reverse: "In D major, A is the ?" -> 5th.
// 168 items (12 keys x 7 degrees x 2 dirs), grouped by degree.

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'preact/hooks';
import type { RecommendationResult } from '../../types.ts';
import {
  displayNote,
  getScaleDegreeNote,
  MAJOR_KEYS,
  spelledNoteMatchesSemitone,
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

import { DegreeButtons, NoteButtons } from '../buttons.tsx';
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

const ALL_ITEMS: string[] = [];
for (const key of MAJOR_KEYS) {
  for (let d = 1; d <= 7; d++) {
    ALL_ITEMS.push(key.root + ':' + d + ':fwd');
    ALL_ITEMS.push(key.root + ':' + d + ':rev');
  }
}

const ALL_GROUP_INDICES = DEGREE_GROUPS.map((_, i) => i);

// Stats grid config: columns are degree labels, rows are keys
const GRID_NOTES = MAJOR_KEYS.map((k) => ({
  name: k.root,
  displayName: k.root,
}));

type Question = {
  keyRoot: string;
  degree: number;
  dir: 'fwd' | 'rev';
  noteName: string;
};

function getQuestion(itemId: string): Question {
  const parts = itemId.split(':');
  const keyRoot = parts[0];
  const degree = parseInt(parts[1]);
  const dir = parts[2] as 'fwd' | 'rev';
  const noteName = getScaleDegreeNote(keyRoot, degree);
  return { keyRoot, degree, dir, noteName };
}

function checkAnswer(q: Question, input: string) {
  if (q.dir === 'fwd') {
    const correct = spelledNoteMatchesSemitone(q.noteName, input);
    return { correct, correctAnswer: displayNote(q.noteName) };
  }
  const expectedDegree = String(q.degree);
  return {
    correct: input === expectedDegree,
    correctAnswer: DEGREE_LABELS[q.degree - 1],
  };
}

function getGridItemId(
  keyRoot: string,
  colIdx: number,
): string[] {
  const d = colIdx + 1;
  return [keyRoot + ':' + d + ':fwd', keyRoot + ':' + d + ':rev'];
}

// ---------------------------------------------------------------------------
// Mode handle
// ---------------------------------------------------------------------------

export type ModeHandle = {
  activate(): void;
  deactivate(): void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScaleDegreesMode(
  { container, navigateHome, onMount }: {
    container: HTMLElement;
    navigateHome: () => void;
    onMount: (handle: ModeHandle) => void;
  },
) {
  // --- Scope ---
  const [scope, scopeActions] = useScopeState({
    kind: 'groups',
    groups: DEGREE_GROUPS.map((g, i) => ({
      index: i,
      label: g.label,
      itemIds: getItemIdsForGroup(i),
    })),
    defaultEnabled: [0],
    storageKey: 'scaleDegrees_enabledGroups',
    label: 'Degrees',
    sortUnstarted: (a, b) => a.string - b.string,
  });

  const enabledGroups = scope.kind === 'groups'
    ? scope.enabledGroups
    : new Set([0]);

  const learner = useLearnerModel('scaleDegrees', ALL_ITEMS);

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
      (i: number) => DEGREE_GROUPS[i].label,
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
    if (enabledGroups.size === DEGREE_GROUPS.length) return 'all degrees';
    const degrees = [...enabledGroups].sort((a, b) => a - b)
      .flatMap((g) => DEGREE_GROUPS[g].degrees)
      .sort((a, b) => a - b);
    return degrees.map((d) => DEGREE_LABELS[d - 1]).join(', ') + ' degrees';
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
      return checkAnswer(currentQRef.current!, input);
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
      const dir = currentQRef.current?.dir;
      if (dir === 'fwd') {
        return noteHandler.handleKey(e);
      }
      // Reverse: number keys 1-7 for degree
      if (e.key >= '1' && e.key <= '7') {
        e.preventDefault();
        engineSubmitRef.current(e.key);
        return true;
      }
      return false;
    },

    onStart: () => noteHandler.reset(),
    onStop: () => noteHandler.reset(),

    getPracticingLabel: () => {
      const groups = scope.kind === 'groups'
        ? scope.enabledGroups
        : new Set([0]);
      if (groups.size === DEGREE_GROUPS.length) return 'all degrees';
      const degrees = [...groups].sort((a, b) => a - b)
        .flatMap((g) => DEGREE_GROUPS[g].degrees)
        .sort((a, b) => a - b);
      return degrees.map((d) => DEGREE_LABELS[d - 1]).join(', ') + ' degrees';
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

  const [activeTab, setActiveTab] = useState<'practice' | 'progress'>(
    'practice',
  );
  const [statsMode, setStatsMode] = useState('retention');

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
  const dir = currentQ?.dir ?? 'fwd';
  const promptText = currentQ
    ? (currentQ.dir === 'fwd'
      ? DEGREE_LABELS[currentQ.degree - 1] + ' of ' +
        displayNote(currentQ.keyRoot) + ' major'
      : displayNote(currentQ.keyRoot) + ' major: ' +
        displayNote(currentQ.noteName))
    : '';

  const handleNoteAnswer = useCallback(
    (note: string) => engine.submitAnswer(note),
    [engine.submitAnswer],
  );
  const handleDegreeAnswer = useCallback(
    (degree: string) => engine.submitAnswer(degree),
    [engine.submitAnswer],
  );

  const roundContext = useMemo(() => {
    const s = engine.state;
    return practicingLabel + ' \u00B7 ' + s.masteredCount + ' / ' +
      s.totalEnabledCount + ' fluent';
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

  const statsSelector = useMemo((): StatsSelector => ({
    getAutomaticity: (id: string) => learner.selector.getAutomaticity(id),
    getStats: (id: string) => learner.selector.getStats(id),
  }), [learner.selector, engine.state.phase, statsMode]);

  const baselineText = learner.motorBaseline
    ? 'Response time baseline: ' +
      (learner.motorBaseline / 1000).toFixed(1) + 's'
    : 'Response time baseline: 1s (default)';

  const answerCount = engine.state.roundAnswered;
  const countText = answerCount +
    (answerCount === 1 ? ' answer' : ' answers');

  return (
    <>
      <ModeTopBar title='Scale Degrees' onBack={navigateHome} />
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
                labels={DEGREE_GROUPS.map((g) => g.label)}
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
                colLabels={DEGREE_LABELS}
                getItemId={getGridItemId}
                statsMode={statsMode}
                notes={GRID_NOTES}
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
        <NoteButtons hidden={dir === 'rev'} onAnswer={handleNoteAnswer} />
        <DegreeButtons hidden={dir === 'fwd'} onAnswer={handleDegreeAnswer} />
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
