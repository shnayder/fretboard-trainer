// usePhaseClass — sync engine phase to CSS classes on the container element.
// Replaces identical useEffect blocks in all mode components.

import { useEffect } from 'preact/hooks';
import type { EnginePhase } from '../types.ts';

const PHASE_CLASSES = [
  'phase-idle',
  'phase-active',
  'phase-round-complete',
  'phase-calibration',
];

/**
 * Set the appropriate phase CSS class on the mode container element.
 * Removes all phase classes and adds the one matching the current phase.
 * Runs as a side effect whenever the phase changes.
 *
 * Maps: 'idle' → 'phase-idle', 'round-complete' → 'phase-round-complete',
 * 'calibration' → 'phase-calibration',
 * everything else (active, etc.) → 'phase-active'.
 *
 * Modes pass `calibrating ? 'calibration' : engine.state.phase` to override
 * the engine phase during speed check.
 */
export function usePhaseClass(
  container: HTMLElement,
  phase: EnginePhase | 'calibration',
): void {
  useEffect(() => {
    const cls = phase === 'idle'
      ? 'phase-idle'
      : phase === 'round-complete'
      ? 'phase-round-complete'
      : phase === 'calibration'
      ? 'phase-calibration'
      : 'phase-active';
    container.classList.remove(...PHASE_CLASSES);
    container.classList.add(cls);
  }, [phase, container]);
}
