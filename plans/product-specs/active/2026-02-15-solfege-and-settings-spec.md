# Solfège Display & Global Settings — Design Spec

## Overview

Add a fixed-do solfège naming option that replaces letter-name notes (C, D, E)
with solfège syllables (do, re, mi) throughout the entire app. The setting lives
in a new global settings modal, accessed via a gear icon in the top bar. The
"redo speed check" action also moves into this modal, centralizing app-wide
configuration in one place.

## Solfège naming system

### Fixed-do mapping

| Letter | Solfège | With sharp | With flat |
|--------|---------|------------|-----------|
| C | do | do# | do♭ |
| D | re | re# | re♭ |
| E | mi | mi# | mi♭ |
| F | fa | fa# | fa♭ |
| G | sol | sol# | sol♭ |
| A | la | la# | la♭ |
| B | si | si# | si♭ |

- Uses **si** (Romance/Italian tradition), not ti.
- Accidentals append **#** or **♭** to the base syllable (not chromatic
  solfège variants like di, ri, etc.).
- Display is lowercase: do, re, mi (not Do, Re, Mi).

### Where solfège names appear

When the solfège setting is active, note names are replaced **everywhere**:

- **Answer buttons** — "do", "re#/mi♭", etc. instead of "C", "C#/Db"
- **Question prompts** — "do + 3 = ?", "What note is fret 5 on string 3?"
  answer: "la" instead of "A"
- **Feedback text** — "Correct! The answer is sol" instead of "G"
- **Fretboard labels** — neck dots show solfège syllables
- **Key names** — "do major", "la minor" etc. wherever key names appear

### Modes unaffected

**Interval ↔ Semitones** does not use note names (only interval names like
m2, M3, P5 and semitone counts), so the solfège setting has no effect there.

### Keyboard input

In solfège mode, keyboard shortcuts change to **solfège abbreviations**:

- Type the syllable: `do`, `re`, `mi`, `fa`, `sol`, `la`, `si`
- For accidentals: syllable + `#` or `b` (e.g., `fa#`, `si b`)
- The original letter keys (C, D, E...) are **inactive** in solfège mode.

All syllables are unambiguous after two characters (do, re, mi, fa, so→sol,
la, si), so auto-submit after the second character is possible for most, with
sol needing the third.

## Global settings modal

### Access

- **Gear icon** in the top bar, right side (replaces the version number
  display — version can move into the modal or footer).
- Tapping the gear opens a modal overlay.

### Modal contents

1. **Note naming** — toggle between two options:
   - **A B C** (letter names — current default)
   - **do re mi** (fixed-do solfège)

   Persisted in localStorage. Default: A B C.

2. **Redo speed check** — button that triggers the calibration flow for the
   current mode. Same behavior as today's per-mode "Redo speed check" button,
   just accessed from the modal. Disabled if no mode is active or no baseline
   exists yet (first calibration happens automatically on first quiz start).

3. **Close** — "×" button in top-right corner, or tap the overlay backdrop.

### Layout

The modal is a centered card over a dimmed backdrop (reuse the existing
`--color-overlay` for backdrop). Compact — just the two settings stacked
vertically with clear labels.

### Screen states

- **Modal closed (default)**: gear icon visible in top bar, everything else
  unchanged.
- **Modal open**: dimmed overlay, settings card centered. Quiz is paused if
  running (or rather, modal shouldn't open during an active quiz — only
  available from idle state).

### Interaction with quiz state

The settings gear is only tappable when the quiz is in **idle** state (not
during active quizzing or calibration). During an active quiz the gear icon
can either be hidden or visually disabled. This avoids mid-quiz setting changes
that would require re-rendering questions.

## Removing per-mode recalibrate button

The "Redo speed check" button currently shown in each mode's idle screen moves
to the settings modal. It no longer appears in the per-mode UI. This
declutters the idle screen and centralizes app-wide actions.

## Resolved decisions

- **si vs ti**: si — user prefers Romance/Italian tradition.
- **Scope of substitution**: everywhere (fretboard labels, questions, answers,
  feedback) — full immersion, not partial.
- **Keyboard in solfège mode**: solfège abbreviations only; letter keys
  disabled. Keeps the mental model consistent with what's on screen.
- **Accidental style**: base syllable + # or ♭ symbol (do#, mi♭), not
  chromatic solfège (di, me, etc.). Simpler to learn, direct parallel to the
  letter-name system.
- **Settings access during quiz**: idle only. Avoids complexity of
  mid-question setting changes.
- **Calibration in settings**: single button triggers calibration for current
  mode's provider. Since most modes share the same provider, one calibration
  covers them all.
