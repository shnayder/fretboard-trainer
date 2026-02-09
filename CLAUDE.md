# CLAUDE.md

Interactive fretboard trainer for learning guitar note positions.

## Structure

```
main.ts                # Deno entry point: reads src/ files, assembles HTML, serves/builds
src/
  adaptive.js          # Adaptive question selector (ES module, single source of truth)
  adaptive_test.ts     # Tests for adaptive selector (npx tsx --test)
  app.js               # Browser quiz/UI logic (references adaptive globals)
  fretboard.ts         # SVG fretboard generation (build-time)
  styles.css           # CSS (read at build time, inlined into HTML)
docs/index.html        # Built static file for GitHub Pages
docs/sw.js             # Built service worker (network-first cache strategy)
```

## Development

```bash
# Run dev server (serves both index.html and sw.js)
deno run --allow-net --allow-read main.ts

# Build for GitHub Pages
deno run --allow-write --allow-read main.ts --build

# Run tests
npx tsx --test src/adaptive_test.ts
```

## How It Works

- SVG fretboard with clickable note positions
- Quiz mode: identifies a note, user answers via buttons or keyboard
- Adaptive learning: tracks response times in localStorage, prioritizes slower notes
- String selection persisted in localStorage

## Adaptive Selector

The adaptive question selector lives in `src/adaptive.js` — a single JS file
that is both the ES module imported by tests and the source that `main.ts` reads
at build time (stripping `export` keywords for browser inlining). Key design:

- **Unseen items** get `unseenBoost` weight (exploration)
- **Seen items** get `ewma / minTime` weight (slower = more practice)
- No extra multiplier for low-sample items — this was a bug that caused startup ruts
- Response times clamped to `maxResponseTime` (9s) to reject outliers
- Last-selected item gets weight 0 (no immediate repeats)
- Storage is injected (localStorage adapter in browser, Map in tests)

## Keyboard Shortcuts (during quiz)

- `C D E F G A B` - answer with natural note
- Letter + `#` - sharp (e.g., C then #)
- Letter + `b` - flat (e.g., D then b)
- `Space` / `Enter` - next question (after answering)
- `Escape` - stop quiz

## Versioning

There is a small version number displayed at the top-right of the app (`<div class="version">`). Increment it (e.g. v0.2 → v0.3) with every change so the user can confirm they have the latest build.
