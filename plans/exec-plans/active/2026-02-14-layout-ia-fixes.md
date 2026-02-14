# Layout & Information Architecture Fixes

## Problem / Context

Design review of the fretboard quiz screen (mid-quiz, idle/stats for fretboard,
idle/stats for diatonic chords) identified systematic layout and information
architecture issues. These fall into three categories:

1. **Missing labels and grouping** — controls are unlabeled, related settings
   scattered, no section boundaries.
2. **Wrong content for the state** — quiz-configuration controls visible during
   active quiz, redundant stop mechanisms, quiz area card boundary splits a
   logical group.
3. **Weak stats presentation** — no aggregate summary, stats scope doesn't
   match quiz config, grid axes unlabeled, legends detached from heatmaps.

The current show/hide architecture — a mix of per-element JS `style.display`
toggles, CSS class cascades, and inline `style="display: none"` — makes
per-state layout changes awkward. Fixing the layout issues properly requires
first cleaning up this mechanism.

## Identified Issues

### Mid-quiz state (all modes)
1. Settings row (string toggles, naturals-only, group toggles) visible mid-quiz
2. "Stop Quiz" button AND × close button (redundant)
3. "Practicing" header is low-information
4. Session stats and progress bar unlabeled ("3 / 13" = what?)
5. Content ordering: 5 layers of chrome above the question
6. Quiz area card contains countdown + buttons + feedback but not header/stats
7. Note buttons left-aligned in a centered layout
8. Countdown bar has low visual weight for a time-critical element

### Idle/stats state (fretboard)
9. String toggles unlabeled
10. No aggregate progress summary
11. Heatmap shows all 78 positions regardless of enabled strings

### Idle/stats state (diatonic chords / grid modes)
12. 12×7 grid has no axis labels
13. Grey "no data" cells overwhelm actual progress when few groups enabled
14. Group toggles unlabeled
15. Recall/Speed toggle not clearly grouped with stats display

### Cross-cutting
16. No clear visual boundary between "progress" and "quiz configuration"
17. Recall/Speed toggle always visible in idle (no dismiss option)

## Phased Approach

### Phase 1: Labels, labels, labels (safe, additive)

**Goal:** Every control and data display has a text label. No behavioral or
architectural changes — just add missing labels.

**Changes:**
- Add "Strings" label above string toggles (fretboard mode)
- Add group labels above distance/chord toggles (math/chord modes)
- Progress bar: "X / Y mastered" instead of bare "X / Y"
- Session stats: ensure "questions" and elapsed time have context
- Quiz header: replace "Practicing" with mode-specific prompt or remove

**Files:** `html-helpers.ts`, `build.ts`, `quiz-engine.js` (progress text
format), `styles.css` (label styling)

**Risk:** Low. Additive only.

### Phase 2: Group and reorder DOM (template restructure)

**Goal:** Wrap related controls in semantic containers. Reorder elements to
match idle-state priority. This is the DOM-only foundation for per-state
layouts in Phase 4.

**Changes to `modeScreen()` scaffold:**
```
Current:                          After:
stats-container                   stats-section
stats-controls                      stats-container
quiz-controls                       stats-controls (Recall/Speed + legend)
  settings-row                    quiz-config
  mastery-message                   settings-row (toggles)
  start/stop/recalibrate           mastery-message
quiz-header                         start-btn
session-stats                       recalibrate-btn
progress-bar                      quiz-session
[beforeQuizArea]                    quiz-header (× close only)
quiz-area                           session-stats
                                    progress-bar
                                  [beforeQuizArea]
                                  quiz-area
```

Key moves:
- Group stats-container + stats-controls into `.stats-section`
- Group settings-row + mastery + start/recalibrate into `.quiz-config`
- Group quiz-header + session-stats + progress-bar into `.quiz-session`
- Remove Stop Quiz button from quiz-config (keep × close + Escape only)
- Stats section comes first (idle priority), quiz-session appears during quiz

**Files:** `html-helpers.ts`, `build.ts` (template), `styles.css` (new
wrappers), `quiz-engine.js` (DOM queries for new structure)

**Risk:** Medium. Template change touches all modes. Test all 10 modes
idle + quiz states. Speed Tap mode has its own lifecycle — needs careful
attention.

### Phase 3: State-driven CSS (architectural cleanup)

**Goal:** Replace per-element JS display toggles with a single phase class
on the container, and CSS rules keyed off that class.

**Current architecture:**
- Engine state has 5 boolean flags: `showStartBtn`, `showStopBtn`,
  `showHeatmapBtn`, `showStatsControls`, `quizActive`
- `render()` sets `style.display` on 9+ elements individually
- `.calibrating` class exists but uses `!important` hacks
- Result: adding "hide settings during quiz" requires touching JS state,
  render(), AND CSS

**New architecture:**
- Engine sets `container.className` to include phase:
  `phase-idle`, `phase-active`, `phase-calibration`
- CSS rules handle visibility:
  ```css
  .phase-idle .quiz-session { display: none; }
  .phase-active .stats-section,
  .phase-active .quiz-config { display: none; }
  .phase-calibration > *:not(.quiz-area) { display: none; }
  ```
- Remove `showStartBtn`, `showStopBtn`, `showHeatmapBtn`, `showStatsControls`
  from engine state (they're fully determined by phase)
- Keep `quizActive` as a class toggle (used by `.quiz-area.active`)
- Remove inline `style="display: none"` from templates (CSS handles initial
  state via `.phase-idle` rules)

**State field removal:**
| Field | Replacement |
|-------|-------------|
| `showStartBtn` | CSS: `.phase-idle .start-btn { display: inline }` |
| `showStopBtn` | Removed entirely (button removed in Phase 2) |
| `showHeatmapBtn` | CSS: `.phase-idle .stats-toggle { display: inline-flex }` |
| `showStatsControls` | CSS: `.phase-idle .stats-controls { display: block }` |

**Files:** `quiz-engine-state.js` (remove flags), `quiz-engine.js` (simplify
render, add phase class), `styles.css` (add phase rules, remove `!important`
calibration hacks), `html-helpers.ts` (remove inline display:none)

**Risk:** Medium-high. Touches the engine's core state/render cycle. Every mode
must be tested in all states. Speed Tap's custom lifecycle needs special
handling.

**Testing:** All 10 modes × 3 states (idle, active, calibration). Verify
keyboard shortcuts still work. Verify bidirectional modes swap button groups
correctly (this is per-mode, not engine-level — should be unaffected).

### Phase 4: Per-state layout polish (builds on Phases 2-3)

**Goal:** Now that we have grouped DOM and state-driven CSS, tune each state's
layout.

**Quiz state:**
- Quiz-config hidden (automatic from Phase 3 CSS)
- Content order: question → countdown → answers → feedback (may need CSS
  `order` or DOM reorder within quiz-area for some modes)
- Quiz area card boundary: extend to include quiz-session elements, or remove
  card treatment entirely and use spacing/dividers instead
- Countdown bar: consider increasing height or adding color emphasis

**Idle state:**
- Stats section at top (heatmap/grid)
- Quiz config below (toggles + start)
- Clean visual separation between sections

**Alignment:**
- Center note buttons in quiz area (remove left-alignment)
- Consistent spacing between sections across modes

**Files:** `styles.css` (layout, card boundary, alignment), possibly
`html-helpers.ts` if quiz-area content needs reordering

**Risk:** Low-medium. Mostly CSS. Visual verification needed.

### Phase 5: Stats improvements

**Goal:** Make stats displays more useful and less noisy.

**Changes:**
- **Aggregate summary:** Add "X / Y mastered" text above heatmap/grid in
  idle state. Computed from `computeProgress()` (already exists in engine).
  Show in stats-section, update when stats toggle or config changes.
- **Grid axis labels:** Add "Key" row label and column group headers to
  stats grids. Update `renderStatsGrid()` in `stats-display.js`.
- **Stats scoping:** Visually dim grid cells for items outside the enabled
  groups. Add `opacity: 0.3` to cells not in the current quiz scope. Requires
  passing enabled item set to `renderStatsGrid()`.
- **Legend proximity:** With Phase 2 grouping, legend lives inside
  stats-section adjacent to the visualization. Verify this works for fretboard
  (where the "visualization" is the SVG, which is outside stats-section).

**Files:** `stats-display.js` (grid rendering, summary), `quiz-engine.js`
(expose progress for idle display), mode files (pass enabled items to stats
render), `styles.css` (dim styling)

**Risk:** Low-medium. Stats rendering is self-contained. Fretboard heatmap
is a special case (SVG-based, not table-based).

## Phase Dependencies

```
Phase 1 (labels) ──────────────────────────── standalone
Phase 2 (DOM grouping) ───┐
                           ├── Phase 4 (per-state polish)
Phase 3 (state-driven CSS) ┘
Phase 5 (stats) ───────────────────────────── standalone (after Phase 2)
```

Phases 1, 2, 3 are sequential. Phase 4 requires both 2 and 3. Phase 5 can
happen anytime after Phase 2.

## Speed Tap Special Handling

Speed Tap mode (`quiz-speed-tap.js`) manages its own quiz lifecycle outside
the shared engine — it has custom session start/stop, its own timer, and
direct DOM manipulation of ~10 elements. All phases need to account for this:

- **Phase 2:** Speed Tap's DOM queries must be updated for new wrapper
  structure.
- **Phase 3:** Speed Tap doesn't use the engine's render() for most
  visibility. Either migrate it to use phase classes, or keep its existing
  approach and ensure the two don't conflict.
- **Phase 4-5:** Speed Tap's idle/stats state should follow the same layout
  principles as other modes.

## Files Modified (all phases)

| File | Phases | Changes |
|------|--------|---------|
| `src/html-helpers.ts` | 1,2,3 | Labels, DOM restructure, remove inline display:none |
| `build.ts` | 1,2,3 | Mirror template changes |
| `main.ts` | 1,2,3 | Mirror template changes |
| `src/styles.css` | 1,2,3,4 | Label styles, wrapper styles, phase rules, layout |
| `src/quiz-engine-state.js` | 3 | Remove visibility flags |
| `src/quiz-engine.js` | 1,2,3 | Progress text, DOM queries, phase class, simplify render |
| `src/stats-display.js` | 5 | Grid axis labels, summary, scoping |
| `src/quiz-fretboard.js` | 2 | DOM query updates |
| `src/quiz-speed-tap.js` | 2,3 | DOM query updates, lifecycle alignment |
| All other `quiz-*.js` | 2 | DOM query updates (if any) |
| `src/quiz-engine-state_test.ts` | 3 | Remove visibility flag assertions |

## Testing

- `npx tsx --test src/*_test.ts` after each phase
- Manual verification: all 10 modes × idle + quiz + calibration states
- Mobile viewport testing (375px width)
- Keyboard navigation (Tab, Escape, Space, note keys)
