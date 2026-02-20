// Root Preact application: navigation, home screen, settings.

import { useCallback, useEffect, useState } from 'preact/hooks';
import type { ModeDefinition } from './types.ts';
import { ModeView } from './ui-mode.tsx';
import { fretboardDefinition } from './modes/fretboard.ts';
import { semitoneMathDefinition } from './modes/semitone-math.ts';
import { noteSemitonesDefinition } from './modes/note-semitones.ts';
import { getUseSolfege, GUITAR, setUseSolfege } from './music-data.ts';
import { VERSION } from './build-template.ts';

// ---------------------------------------------------------------------------
// Mode registry
// ---------------------------------------------------------------------------

type ModeEntry = {
  id: string;
  name: string;
  desc: string;
  group: string;
  factory: () => ModeDefinition;
};

const MODE_ENTRIES: ModeEntry[] = [
  {
    id: 'fretboard',
    name: 'Guitar Fretboard',
    desc: 'Name notes on the guitar neck',
    group: 'Fretboard',
    factory: () => fretboardDefinition(GUITAR),
  },
  {
    id: 'noteSemitones',
    name: 'Note \u2194 Semitones',
    desc: 'Convert between notes and semitone numbers',
    group: 'Theory Lookup',
    factory: noteSemitonesDefinition,
  },
  {
    id: 'semitoneMath',
    name: 'Semitone Math',
    desc: 'Add or subtract semitones from a note',
    group: 'Calculation',
    factory: semitoneMathDefinition,
  },
];

// Group mode entries for display
function groupedEntries(): [string, ModeEntry[]][] {
  const groups: Map<string, ModeEntry[]> = new Map();
  for (const entry of MODE_ENTRIES) {
    let list = groups.get(entry.group);
    if (!list) {
      list = [];
      groups.set(entry.group, list);
    }
    list.push(entry);
  }
  return [...groups.entries()];
}

// Cache mode definitions (only created once per ID)
const modeDefCache = new Map<string, ModeDefinition>();
function getModeDefinition(id: string): ModeDefinition {
  let def = modeDefCache.get(id);
  if (!def) {
    const entry = MODE_ENTRIES.find((e) => e.id === id);
    if (!entry) throw new Error('Unknown mode: ' + id);
    def = entry.factory();
    modeDefCache.set(id, def);
  }
  return def;
}

// ---------------------------------------------------------------------------
// App component
// ---------------------------------------------------------------------------

export function App() {
  const [activeMode, setActiveMode] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [, forceUpdate] = useState(0);

  // Restore last mode from localStorage
  useEffect(() => {
    const last = localStorage.getItem('lastMode');
    if (last && MODE_ENTRIES.some((e) => e.id === last)) {
      setActiveMode(last);
    }
  }, []);

  // Persist last mode
  useEffect(() => {
    if (activeMode) localStorage.setItem('lastMode', activeMode);
  }, [activeMode]);

  const handleHome = useCallback(() => setActiveMode(null), []);
  const handleNotationChange = useCallback(() => {
    forceUpdate((n) => n + 1);
  }, []);

  if (activeMode) {
    const def = getModeDefinition(activeMode);
    return (
      <>
        <ModeView def={def} onHome={handleHome} />
        {settingsOpen && (
          <SettingsModal
            onClose={() => setSettingsOpen(false)}
            onNotationChange={handleNotationChange}
          />
        )}
      </>
    );
  }

  return (
    <>
      <HomeScreen
        onSelectMode={setActiveMode}
        onSettings={() => setSettingsOpen(true)}
      />
      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          onNotationChange={handleNotationChange}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Home screen
// ---------------------------------------------------------------------------

function HomeScreen({
  onSelectMode,
  onSettings,
}: {
  onSelectMode: (id: string) => void;
  onSettings: () => void;
}) {
  return (
    <div class='home-screen' id='home-screen'>
      <div class='home-header'>
        <h1 class='home-title'>Music Reps</h1>
      </div>
      <div class='home-modes'>
        {groupedEntries().map(([group, entries]) => (
          <div key={group}>
            <div class='home-group-label'>{group}</div>
            {entries.map((entry) => (
              <button
                type='button'
                key={entry.id}
                data-mode={entry.id}
                class='home-mode-btn'
                onClick={() => onSelectMode(entry.id)}
              >
                <span class='home-mode-name'>{entry.name}</span>
                <span class='home-mode-desc'>{entry.desc}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
      <div class='home-footer'>
        <button type='button' class='home-settings-btn' onClick={onSettings}>
          Settings
        </button>
        <span class='version'>{VERSION}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings modal
// ---------------------------------------------------------------------------

function SettingsModal({
  onClose,
  onNotationChange,
}: {
  onClose: () => void;
  onNotationChange: () => void;
}) {
  const [useSolfege, setUseSolfegeState] = useState(getUseSolfege());

  const toggle = useCallback(
    (want: boolean) => {
      if (want !== useSolfege) {
        setUseSolfege(want);
        setUseSolfegeState(want);
        onNotationChange();
      }
    },
    [useSolfege, onNotationChange],
  );

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      class='settings-overlay open'
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div class='settings-modal'>
        <div class='settings-header'>
          <span class='settings-title'>Settings</span>
          <button
            type='button'
            class='settings-close-btn'
            aria-label='Close'
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        <div class='settings-body'>
          <div class='settings-field'>
            <div class='settings-label'>Note names</div>
            <div class='settings-toggle-group'>
              <button
                type='button'
                class={`settings-toggle-btn${!useSolfege ? ' active' : ''}`}
                onClick={() => toggle(false)}
              >
                A B C
              </button>
              <button
                type='button'
                class={`settings-toggle-btn${useSolfege ? ' active' : ''}`}
                onClick={() => toggle(true)}
              >
                Do Re Mi
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
