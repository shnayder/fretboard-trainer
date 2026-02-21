// Interval Semitones Preact mode: bidirectional interval <-> semitone count.
// Nearly identical to Note Semitones but with intervals and range 1-12.

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'preact/hooks';
import type { StatsTableRow } from '../../types.ts';
import { intervalMatchesInput, INTERVALS } from '../../music-data.ts';
import type { QuizEngineConfig } from '../../hooks/use-quiz-engine.ts';
import { useQuizEngine } from '../../hooks/use-quiz-engine.ts';
import { useLearnerModel } from '../../hooks/use-learner-model.ts';
import { computePracticeSummary } from '../../mode-ui-state.ts';
import { computeMedian } from '../../adaptive.ts';

import { IntervalButtons, NumberButtons } from '../buttons.tsx';
import {
  ModeTopBar,
  PracticeCard,
  QuizArea,
  QuizSession,
  RoundComplete,
  TabbedIdle,
} from '../mode-screen.tsx';
import type { StatsSelector } from '../stats.tsx';
import { StatsTable, StatsToggle } from '../stats.tsx';
import { FeedbackDisplay } from '../quiz-ui.tsx';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_ITEMS: string[] = [];
for (const interval of INTERVALS) {
  ALL_ITEMS.push(interval.abbrev + ':fwd');
  ALL_ITEMS.push(interval.abbrev + ':rev');
}

type Question = {
  abbrev: string;
  name: string;
  num: number;
  dir: 'fwd' | 'rev';
};

function getQuestion(itemId: string): Question {
  const [abbrev, dir] = itemId.split(':');
  const interval = INTERVALS.find((i) => i.abbrev === abbrev)!;
  return {
    abbrev: interval.abbrev,
    name: interval.name,
    num: interval.num,
    dir: dir as 'fwd' | 'rev',
  };
}

function checkAnswer(q: Question, input: string) {
  if (q.dir === 'fwd') {
    const correct = parseInt(input, 10) === q.num;
    return { correct, correctAnswer: String(q.num) };
  }
  const interval = INTERVALS.find((i) => i.abbrev === q.abbrev)!;
  const correct = intervalMatchesInput(interval, input);
  return { correct, correctAnswer: q.abbrev };
}

function getStatsRows(): StatsTableRow[] {
  return INTERVALS.map((interval) => ({
    label: interval.abbrev,
    sublabel: String(interval.num),
    _colHeader: 'Interval',
    fwdItemId: interval.abbrev + ':fwd',
    revItemId: interval.abbrev + ':rev',
  }));
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

export function IntervalSemitonesMode(
  { container, navigateHome, onMount }: {
    container: HTMLElement;
    navigateHome: () => void;
    onMount: (handle: ModeHandle) => void;
  },
) {
  // --- Core hooks ---
  const learner = useLearnerModel('intervalSemitones', ALL_ITEMS);

  // --- Question state ---
  const [currentQ, setCurrentQ] = useState<Question | null>(null);
  const currentQRef = useRef<Question | null>(null);

  // --- Key handler state (digit buffering for forward direction) ---
  const pendingDigitRef = useRef<number | null>(null);
  const pendingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Engine config ---
  const engineConfig = useMemo((): QuizEngineConfig => ({
    getEnabledItems: () => ALL_ITEMS,

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
      ctx: { submitAnswer: (input: string) => void },
    ): boolean | void => {
      const dir = currentQRef.current?.dir;
      if (dir === 'rev') {
        // No keyboard for interval buttons
        return false;
      }
      // Forward: digit buffering for numbers 1-12
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        const d = parseInt(e.key);
        if (pendingDigitRef.current !== null) {
          const num = pendingDigitRef.current * 10 + d;
          clearTimeout(pendingTimeoutRef.current!);
          pendingDigitRef.current = null;
          pendingTimeoutRef.current = null;
          if (num >= 1 && num <= 12) ctx.submitAnswer(String(num));
          return true;
        }
        if (d >= 2 && d <= 9) {
          ctx.submitAnswer(String(d));
        } else {
          // 0 or 1 — could be 10, 11, 12
          pendingDigitRef.current = d;
          pendingTimeoutRef.current = setTimeout(() => {
            if (pendingDigitRef.current !== null) {
              if (pendingDigitRef.current >= 1) {
                ctx.submitAnswer(String(pendingDigitRef.current));
              }
              pendingDigitRef.current = null;
              pendingTimeoutRef.current = null;
            }
          }, 400);
        }
        return true;
      }
      return false;
    },

    onStart: () => {
      if (pendingTimeoutRef.current) clearTimeout(pendingTimeoutRef.current);
      pendingDigitRef.current = null;
    },

    onStop: () => {
      if (pendingTimeoutRef.current) clearTimeout(pendingTimeoutRef.current);
      pendingDigitRef.current = null;
    },

    getPracticingLabel: () => 'all items',
  }), []);

  const engine = useQuizEngine(engineConfig, learner.selector);

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
  const summary = useMemo(
    () =>
      computePracticeSummary({
        allItemIds: ALL_ITEMS,
        selector: learner.selector,
        itemNoun: 'items',
        recommendation: null,
        recommendationText: '',
        sessionSummary: ALL_ITEMS.length + ' items \u00B7 60s',
        masteryText: engine.state.masteryText,
        showMastery: engine.state.showMastery,
      }),
    [
      learner.selector,
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
      },
    });
  }, [engine, learner]);

  // --- Derived state ---
  const dir = currentQ?.dir ?? 'fwd';
  const promptText = currentQ
    ? (currentQ.dir === 'fwd' ? currentQ.name : String(currentQ.num))
    : '';

  // Button answer handlers
  const handleIntervalAnswer = useCallback(
    (interval: string) => engine.submitAnswer(interval),
    [engine.submitAnswer],
  );
  const handleNumAnswer = useCallback(
    (num: number) => engine.submitAnswer(String(num)),
    [engine.submitAnswer],
  );

  // Round-complete derived values
  const roundContext = useMemo(() => {
    const s = engine.state;
    const fluency = s.masteredCount + ' / ' + s.totalEnabledCount + ' fluent';
    return 'all items \u00B7 ' + fluency;
  }, [engine.state.masteredCount, engine.state.totalEnabledCount]);

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
      <ModeTopBar title='Interval \u2194 Semitones' onBack={navigateHome} />
      <TabbedIdle
        activeTab={activeTab}
        onTabSwitch={setActiveTab}
        practiceContent={
          <PracticeCard
            statusLabel={summary.statusLabel}
            statusDetail={summary.statusDetail}
            sessionSummary={summary.sessionSummary}
            mastery={summary.showMastery ? summary.masteryText : undefined}
            onStart={engine.start}
          />
        }
        progressContent={
          <div>
            <div class='baseline-info'>{baselineText}</div>
            <div class='stats-controls'>
              <StatsToggle active={statsMode} onToggle={setStatsMode} />
            </div>
            <div class='stats-container'>
              <StatsTable
                selector={statsSelector}
                rows={getStatsRows()}
                fwdHeader='I\u2192#'
                revHeader='#\u2192I'
                statsMode={statsMode}
                baseline={learner.motorBaseline ?? undefined}
              />
            </div>
          </div>
        }
      />
      <QuizSession
        timeLeft={engine.timerText}
        context='all items'
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
        <IntervalButtons
          hidden={dir === 'fwd'}
          onAnswer={handleIntervalAnswer}
        />
        <NumberButtons
          start={1}
          end={12}
          hidden={dir === 'rev'}
          onAnswer={handleNumAnswer}
        />
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
