// App initialization: registers all quiz modes and starts navigation.
// Entry point — esbuild bundles all imports into a single IIFE.

declare global {
  interface Window {
    Capacitor?: unknown;
  }
}

import { h, render } from 'preact';
import { GUITAR, UKULELE } from './music-data.ts';
import { createModeController } from './mode-controller.ts';
import { fretboardDefinition } from './modes/fretboard.ts';
import { speedTapDefinition } from './modes/speed-tap.ts';
import { keySignaturesDefinition } from './modes/key-signatures.ts';
import { scaleDegreesDefinition } from './modes/scale-degrees.ts';
import { diatonicChordsDefinition } from './modes/diatonic-chords.ts';
import { chordSpellingDefinition } from './modes/chord-spelling.ts';
import { createNavigation } from './navigation.ts';
import { createSettingsModal } from './settings.ts';
import { refreshNoteButtonLabels } from './quiz-engine.ts';
import type { ModeHandle } from './ui/modes/note-semitones-mode.tsx';
import { NoteSemitonesMode } from './ui/modes/note-semitones-mode.tsx';
import { IntervalSemitonesMode } from './ui/modes/interval-semitones-mode.tsx';
import { SemitoneMathMode } from './ui/modes/semitone-math-mode.tsx';
import { IntervalMathMode } from './ui/modes/interval-math-mode.tsx';

const nav = createNavigation();

// --- All mode controllers ---

// --- ModeController-based modes ---

const allControllers = [
  {
    id: 'fretboard',
    name: 'Guitar Fretboard',
    def: fretboardDefinition(GUITAR),
  },
  {
    id: 'ukulele',
    name: 'Ukulele Fretboard',
    def: fretboardDefinition(UKULELE),
  },
  { id: 'speedTap', name: 'Speed Tap', def: speedTapDefinition() },
  {
    id: 'keySignatures',
    name: 'Key Signatures',
    def: keySignaturesDefinition(),
  },
  { id: 'scaleDegrees', name: 'Scale Degrees', def: scaleDegreesDefinition() },
  {
    id: 'diatonicChords',
    name: 'Diatonic Chords',
    def: diatonicChordsDefinition(),
  },
  {
    id: 'chordSpelling',
    name: 'Chord Spelling',
    def: chordSpellingDefinition(),
  },
].map(({ id, name, def }) => {
  const ctrl = createModeController(def);
  nav.registerMode(id, {
    name,
    init: ctrl.init,
    activate: ctrl.activate,
    deactivate: ctrl.deactivate,
  });
  return ctrl;
});

// --- Preact-based modes ---

{
  let handle: ModeHandle | null = null;
  const container = document.getElementById('mode-noteSemitones')!;
  nav.registerMode('noteSemitones', {
    name: 'Note \u2194 Semitones',
    init() {
      render(
        h(NoteSemitonesMode, {
          container,
          navigateHome: () => nav.navigateHome(),
          onMount: (h: ModeHandle) => {
            handle = h;
          },
        }),
        container,
      );
    },
    activate() {
      handle?.activate();
    },
    deactivate() {
      handle?.deactivate();
    },
  });
}

{
  let handle: ModeHandle | null = null;
  const container = document.getElementById('mode-intervalSemitones')!;
  nav.registerMode('intervalSemitones', {
    name: 'Interval \u2194 Semitones',
    init() {
      render(
        h(IntervalSemitonesMode, {
          container,
          navigateHome: () => nav.navigateHome(),
          onMount: (h: ModeHandle) => {
            handle = h;
          },
        }),
        container,
      );
    },
    activate() {
      handle?.activate();
    },
    deactivate() {
      handle?.deactivate();
    },
  });
}

{
  let handle: ModeHandle | null = null;
  const container = document.getElementById('mode-semitoneMath')!;
  nav.registerMode('semitoneMath', {
    name: 'Semitone Math',
    init() {
      render(
        h(SemitoneMathMode, {
          container,
          navigateHome: () => nav.navigateHome(),
          onMount: (h: ModeHandle) => {
            handle = h;
          },
        }),
        container,
      );
    },
    activate() {
      handle?.activate();
    },
    deactivate() {
      handle?.deactivate();
    },
  });
}

{
  let handle: ModeHandle | null = null;
  const container = document.getElementById('mode-intervalMath')!;
  nav.registerMode('intervalMath', {
    name: 'Interval Math',
    init() {
      render(
        h(IntervalMathMode, {
          container,
          navigateHome: () => nav.navigateHome(),
          onMount: (h: ModeHandle) => {
            handle = h;
          },
        }),
        container,
      );
    },
    activate() {
      handle?.activate();
    },
    deactivate() {
      handle?.deactivate();
    },
  });
}

nav.init();

// Settings modal — re-render on notation change
const settings = createSettingsModal({
  onNotationChange(): void {
    document.querySelectorAll('.mode-screen.mode-active').forEach(
      (el: Element) => {
        refreshNoteButtonLabels(el as HTMLElement);
        const activeToggle = el.querySelector('.stats-toggle-btn.active');
        if (activeToggle) (activeToggle as HTMLElement).click();
      },
    );
    for (const ctrl of allControllers) {
      ctrl.onNotationChange?.();
    }
  },
});

const settingsBtn = document.querySelector('.home-settings-btn');
if (settingsBtn) {
  settingsBtn.addEventListener('click', () => settings.open());
}

// Register service worker for cache busting on iOS home screen
// Skip in Capacitor — app runs from local files, no SW needed
if ('serviceWorker' in navigator && !window.Capacitor) {
  navigator.serviceWorker.register('sw.js');
}
