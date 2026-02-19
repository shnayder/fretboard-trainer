# Build system cleanup

**Date**: 2026-02-19
**Status**: Phase 1 implemented, Phase 2 options for discussion

## Problem

The build system had two forms of duplication:

1. **Template duplication** — `main.ts` and `build.ts` contained identical
   copies of the HTML template (~170 lines), source file list (~22 read calls),
   service worker, version number, and shared HTML fragments. Every change
   required editing both files in lockstep.

2. **Global namespace** — All ~100 functions and constants from 20 concatenated
   JS files live in a flat scope. Dependencies are implicit (concatenation
   order) rather than explicit (imports).

## Phase 1: Template deduplication (implemented)

### What changed

Created `src/build-template.ts` as the single source of truth for:

- **`VERSION`** — one place to bump the version number
- **`SOURCE_MANIFEST`** — ordered array of `{ path, module }` entries defining
  which files to read and whether to strip exports
- **`assembleHTML(css, scripts)`** — generates the complete index.html from
  pre-read content
- **`HOME_SCREEN_HTML`** — home screen markup (shared with moments page)
- **`DISTANCE_TOGGLES`** — shared HTML fragment
- **`SERVICE_WORKER`** — service worker JS string

### Results

| File | Before | After | Change |
|------|--------|-------|--------|
| main.ts | 333 lines | 70 lines | -79% |
| build.ts | 948 lines | 730 lines | -23% |
| build-template.ts | — | 215 lines | new |
| **Net** | 1281 lines | 1015 lines | -21% |

The reduction in build.ts is smaller because it retains the moments page
generation (~480 lines). But the important metric is **eliminated
duplication**: the HTML template, file manifest, and version live in exactly
one place now.

### Benefits

- **Adding a source file**: 1 step (add to `SOURCE_MANIFEST`) instead of 5
  steps across two files
- **Version bumps**: 1 location instead of 2. Also fixed a bug where
  moments.html was on v6.6 while the app was on v6.7
- **Template changes**: edit once, both build paths get it
- **No output changes**: build output is byte-identical (except version bump)

## Phase 2: Module independence (options)

The "globals via concatenation" pattern works but has costs:

- Dependencies are implicit — the only signal is a comment at the top of each
  file listing what globals it expects
- Adding a new global function risks name collisions silently
- Testing requires either importing the ES module directly (works today) or
  setting up a global environment (fragile)

### Option A: Status quo (do nothing)

The current pattern is actually well-contained:
- All globals live inside a single `<script>` tag, not on `window`
- `const`/`function` declarations don't leak beyond the script scope
- The factory pattern (`createFretboardHelpers(musicData)`) already solves
  the testability problem where it matters most
- 20 files is manageable; the risk of name collisions is low

**Interest rate**: LOW. The pattern works, causes no bugs, and the codebase
isn't growing fast enough for the implicit dependencies to be a real problem.

### Option B: Namespace objects

Group related globals under namespace objects:

```javascript
// In music-data.js
const MusicData = { NOTES, INTERVALS, noteByNum, intervalByNum, ... };

// In quiz-semitone-math.js
const { NOTES, noteAdd, noteSub } = MusicData;
```

**Pro**: Makes the dependency structure visible in code. Reduces flat namespace
from ~100 entries to ~8 namespaces.

**Con**: Significant refactor touching every file. Breaks the `readModule()`
export stripping — would need a different bridge pattern. Test imports would
need to change too.

**Interest rate**: LOW — the benefit is mostly cosmetic at this scale.

### Option C: Lightweight bundler (esbuild)

Replace concatenation with an actual module bundler:

```javascript
// In quiz-semitone-math.js (real ES imports)
import { NOTES, noteAdd, noteSub } from './music-data.js';
```

**Pro**: Real module boundaries. IDE support (go-to-definition, unused import
detection). Dependencies enforced by the language.

**Con**: Adds a build dependency (esbuild). Changes the fundamental build model.
Tests would need adjustment since they currently import ES modules directly —
though esbuild can bundle for both browser and test contexts. Would need to
handle the "no import statements in source files" constraint differently.

**Interest rate**: MEDIUM — the payoff grows as the codebase grows, but the
current size doesn't justify the complexity.

### Option D: Explicit dependency declarations (convention)

Formalize the existing `// Depends on globals:` comments into a structured
format that could be validated:

```javascript
// @depends adaptive.js: DEFAULT_CONFIG, createAdaptiveSelector
// @depends music-data.js: NOTES, noteAdd, noteSub, noteMatchesInput
```

A build-time check could verify these declarations match reality.

**Pro**: Zero runtime change. Makes dependencies explicit without changing
architecture. Could catch missing dependencies.

**Con**: Comments can drift. Enforcement would need a custom linter.

**Interest rate**: LOW — it's documentation, not architecture.

## Recommendation

**Phase 1 is done and merged.** For Phase 2, I'd suggest **Option A (do
nothing) for now**, with Option C (esbuild) as the natural next step if/when
the codebase grows past ~30 source files or if real problems emerge from the
global pattern (name collisions, circular dependencies, test brittleness).

The current approach is honest about what it is: a simple concatenation build
for a small app. The globals aren't really "70s-style" in the worst sense —
they're scoped to a single script block, the factory pattern handles
testability, and the module count is manageable. The biggest win was
eliminating the template duplication, which was a genuine maintenance hazard.
