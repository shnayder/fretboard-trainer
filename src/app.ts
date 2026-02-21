// App initialization: registers all quiz modes and starts navigation.
// Entry point — esbuild bundles all imports into a single IIFE.

declare global {
  interface Window {
    Capacitor?: unknown;
  }
}

import { GUITAR, UKULELE } from './music-data.ts';
import { createModeController } from './mode-controller.ts';
import { fretboardDefinition } from './modes/fretboard.ts';
import { speedTapDefinition } from './modes/speed-tap.ts';
import { noteSemitonesDefinition } from './modes/note-semitones.ts';
import { intervalSemitonesDefinition } from './modes/interval-semitones.ts';
import { semitoneMathDefinition } from './modes/semitone-math.ts';
import { intervalMathDefinition } from './modes/interval-math.ts';
import { keySignaturesDefinition } from './modes/key-signatures.ts';
import { scaleDegreesDefinition } from './modes/scale-degrees.ts';
import { diatonicChordsDefinition } from './modes/diatonic-chords.ts';
import { chordSpellingDefinition } from './modes/chord-spelling.ts';
import { createNavigation } from './navigation.ts';
import { createSettingsModal } from './settings.ts';
import { refreshNoteButtonLabels } from './quiz-engine.ts';

const nav = createNavigation();

// --- All mode controllers ---

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
    id: 'noteSemitones',
    name: 'Note \u2194 Semitones',
    def: noteSemitonesDefinition(),
  },
  {
    id: 'intervalSemitones',
    name: 'Interval \u2194 Semitones',
    def: intervalSemitonesDefinition(),
  },
  { id: 'semitoneMath', name: 'Semitone Math', def: semitoneMathDefinition() },
  { id: 'intervalMath', name: 'Interval Math', def: intervalMathDefinition() },
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
