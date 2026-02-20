// Quiz engine as a Preact hook.
// Wraps the pure state transitions from quiz-engine-state.ts with
// timer management, adaptive selection, and keyboard handling.

import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import {
  engineContinueRound,
  engineNextQuestion,
  engineRoundComplete,
  engineRoundTimerExpired,
  engineRouteKey,
  engineStart,
  engineSubmitAnswer,
  engineUpdateIdleMessage,
  engineUpdateMasteryAfterAnswer,
  engineUpdateProgress,
  initialEngineState,
} from './quiz-engine-state.ts';
import {
  createAdaptiveSelector,
  createLocalStorageAdapter,
  DEFAULT_CONFIG,
  deriveScaledConfig,
} from './adaptive.ts';
import type {
  AdaptiveSelector,
  EngineState,
  ModeDefinition,
  NoteKeyHandler,
  ScopeState,
  StorageAdapter,
} from './types.ts';

const ROUND_DURATION_MS = 60000;

export type CountdownState = {
  pct: number;
  time: string;
  warning: boolean;
  lastQuestion: boolean;
};

export type QuizEngineHook = {
  state: EngineState;
  countdown: CountdownState;
  baseline: number | null;
  selector: AdaptiveSelector;
  storage: StorageAdapter;
  start: () => void;
  stop: () => void;
  submitAnswer: (input: string) => void;
  nextQuestion: () => void;
  continueQuiz: () => void;
  updateIdleMessage: () => void;
  computeProgress: () => { masteredCount: number; totalEnabledCount: number };
  setKeyHandler: (handler: NoteKeyHandler | null) => void;
};

function formatRoundTime(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return min + ':' + (sec < 10 ? '0' : '') + sec;
}

export function useQuizEngine(
  def: ModeDefinition,
  scope: ScopeState,
): QuizEngineHook {
  const [engineState, setEngineState] = useState<EngineState>(
    initialEngineState,
  );
  const [countdown, setCountdown] = useState<CountdownState>({
    pct: 100,
    time: '',
    warning: false,
    lastQuestion: false,
  });
  const [baseline, setBaseline] = useState<number | null>(null);

  // Refs for mutable values needed in callbacks
  const stateRef = useRef(engineState);
  stateRef.current = engineState;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const defRef = useRef(def);
  defRef.current = def;

  // Stable refs for selector/storage (created once per mount)
  const storageRef = useRef<StorageAdapter | null>(null);
  const selectorRef = useRef<AdaptiveSelector | null>(null);
  const keyHandlerRef = useRef<NoteKeyHandler | null>(null);
  const roundTimerRef = useRef<number | null>(null);
  const roundStartRef = useRef<number | null>(null);
  const autoAdvanceRef = useRef<number | null>(null);

  // Initialize selector + storage on first mount
  if (!storageRef.current) {
    storageRef.current = createLocalStorageAdapter(def.storageNamespace);
    selectorRef.current = createAdaptiveSelector(
      storageRef.current,
      DEFAULT_CONFIG,
      Math.random,
      def.getExpectedResponseCount
        ? (id: string) => def.getExpectedResponseCount!(id)
        : null,
    );

    // Load stored baseline
    const provider = def.calibrationProvider || 'button';
    const baselineKey = 'motorBaseline_' + provider;
    const stored = localStorage.getItem(baselineKey);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (parsed > 0) {
        setBaseline(parsed);
        selectorRef.current.updateConfig(
          deriveScaledConfig(parsed, DEFAULT_CONFIG),
        );
      }
    }
  }

  const selector = selectorRef.current!;
  const storage = storageRef.current!;

  // --- Helper to update state and ref atomically ---
  const setState = useCallback((updater: (s: EngineState) => EngineState) => {
    setEngineState((prev) => {
      const next = updater(prev);
      stateRef.current = next;
      return next;
    });
  }, []);

  // --- Progress computation ---
  const computeProgress = useCallback(() => {
    const items = defRef.current.getEnabledItems(scopeRef.current);
    let mastered = 0;
    const threshold = selector.getConfig().automaticityThreshold;
    for (const id of items) {
      const auto = selector.getAutomaticity(id);
      if (auto !== null && auto > threshold) mastered++;
    }
    return { masteredCount: mastered, totalEnabledCount: items.length };
  }, [selector]);

  // --- Round timer ---
  const stopRoundTimer = useCallback(() => {
    if (roundTimerRef.current) {
      clearInterval(roundTimerRef.current);
      roundTimerRef.current = null;
    }
    roundStartRef.current = null;
    setCountdown({ pct: 100, time: '', warning: false, lastQuestion: false });
  }, []);

  // Forward declarations for mutual recursion
  const nextQuestionRef = useRef<() => void>(() => {});
  const transitionToRoundCompleteRef = useRef<() => void>(() => {});

  const transitionToRoundComplete = useCallback(() => {
    const durationMs = roundStartRef.current
      ? Date.now() - roundStartRef.current
      : 0;
    stopRoundTimer();
    setState((s) => ({
      ...engineRoundComplete(s),
      roundDurationMs: durationMs,
    }));
  }, [stopRoundTimer, setState]);
  transitionToRoundCompleteRef.current = transitionToRoundComplete;

  const startRoundTimer = useCallback(() => {
    if (roundTimerRef.current) clearInterval(roundTimerRef.current);
    roundStartRef.current = Date.now();
    setCountdown({
      pct: 100,
      time: formatRoundTime(ROUND_DURATION_MS),
      warning: false,
      lastQuestion: false,
    });

    roundTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - roundStartRef.current!;
      const remaining = ROUND_DURATION_MS - elapsed;
      const pct = Math.max(0, (remaining / ROUND_DURATION_MS) * 100);
      const warning = remaining <= 10000 && remaining > 0;

      setCountdown((prev) => ({
        ...prev,
        pct,
        time: formatRoundTime(remaining),
        warning,
      }));

      if (remaining <= 0) {
        if (roundTimerRef.current) clearInterval(roundTimerRef.current);
        roundTimerRef.current = null;
        setCountdown((prev) => ({
          ...prev,
          pct: 0,
          time: '0:00',
          warning: false,
        }));

        // Handle expiry
        const s = stateRef.current;
        if (s.phase !== 'active') return;
        setState((st) => engineRoundTimerExpired(st));

        if (s.answered) {
          transitionToRoundCompleteRef.current();
        } else {
          setCountdown((prev) => ({ ...prev, lastQuestion: true }));
        }
      }
    }, 200) as unknown as number;
  }, [setState]);

  // --- Core actions ---
  const nextQuestion = useCallback(() => {
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }

    if (stateRef.current.roundTimerExpired) {
      transitionToRoundCompleteRef.current();
      return;
    }

    const items = defRef.current.getEnabledItems(scopeRef.current);
    if (items.length === 0) return;

    const nextItemId = selector.selectNext(items);
    setState((s) => engineNextQuestion(s, nextItemId, Date.now()));
  }, [selector, setState]);
  nextQuestionRef.current = nextQuestion;

  const submitAnswer = useCallback(
    (input: string) => {
      const s = stateRef.current;
      if (s.phase !== 'active' || s.answered) return;

      const responseTime = Date.now() - s.questionStartTime!;
      const result = defRef.current.checkAnswer(s.currentItemId!, input);
      selector.recordResponse(s.currentItemId!, responseTime, result.correct);

      setState((st) => {
        let next = engineSubmitAnswer(st, result.correct, result.correctAnswer);
        next = {
          ...next,
          roundResponseTimes: [...next.roundResponseTimes, responseTime],
        };
        const items = defRef.current.getEnabledItems(scopeRef.current);
        const allMastered = selector.checkAllAutomatic(items);
        next = engineUpdateMasteryAfterAnswer(next, allMastered);
        const progress = computeProgress();
        next = engineUpdateProgress(
          next,
          progress.masteredCount,
          progress.totalEnabledCount,
        );
        return next;
      });

      // Auto-advance
      if (stateRef.current.roundTimerExpired) {
        autoAdvanceRef.current = setTimeout(() => {
          if (stateRef.current.phase === 'active') {
            transitionToRoundCompleteRef.current();
          }
        }, 600) as unknown as number;
      } else {
        autoAdvanceRef.current = setTimeout(() => {
          if (
            stateRef.current.phase === 'active' && stateRef.current.answered
          ) {
            nextQuestionRef.current();
          }
        }, 1000) as unknown as number;
      }

      return result;
    },
    [selector, setState, computeProgress],
  );

  const start = useCallback(() => {
    setState((s) => {
      let next = engineStart(s);
      const progress = computeProgress();
      next = engineUpdateProgress(
        next,
        progress.masteredCount,
        progress.totalEnabledCount,
      );
      return next;
    });
    startRoundTimer();
    // Need to trigger nextQuestion after state update
    setTimeout(() => nextQuestionRef.current(), 0);
  }, [setState, startRoundTimer, computeProgress]);

  const stop = useCallback(() => {
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
    stopRoundTimer();
    keyHandlerRef.current?.reset();
    setState(() => initialEngineState());
  }, [stopRoundTimer, setState]);

  const continueQuiz = useCallback(() => {
    setState((s) => engineContinueRound(s));
    startRoundTimer();
    setTimeout(() => nextQuestionRef.current(), 0);
  }, [setState, startRoundTimer]);

  const updateIdleMessage = useCallback(() => {
    if (stateRef.current.phase !== 'idle') return;
    const items = defRef.current.getEnabledItems(scopeRef.current);
    setState((s) =>
      engineUpdateIdleMessage(
        s,
        selector.checkAllAutomatic(items),
        selector.checkNeedsReview(items),
      )
    );
  }, [selector, setState]);

  const setKeyHandler = useCallback((handler: NoteKeyHandler | null) => {
    keyHandlerRef.current = handler;
  }, []);

  // --- Keyboard handling ---
  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      const routed = engineRouteKey(stateRef.current, e.key);
      switch (routed.action) {
        case 'stop':
          e.stopImmediatePropagation();
          stop();
          break;
        case 'next':
          e.preventDefault();
          if (autoAdvanceRef.current) {
            clearTimeout(autoAdvanceRef.current);
            autoAdvanceRef.current = null;
          }
          nextQuestionRef.current();
          break;
        case 'continue':
          e.preventDefault();
          continueQuiz();
          break;
        case 'delegate':
          keyHandlerRef.current?.handleKey(e);
          break;
        case 'ignore':
          break;
      }
    }

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [stop, continueQuiz]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (roundTimerRef.current) clearInterval(roundTimerRef.current);
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, []);

  return {
    state: engineState,
    countdown,
    baseline,
    selector,
    storage,
    start,
    stop,
    submitAnswer,
    nextQuestion,
    continueQuiz,
    updateIdleMessage,
    computeProgress,
    setKeyHandler,
  };
}
