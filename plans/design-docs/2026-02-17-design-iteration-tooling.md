# Design Iteration Tooling Plan

## Context

The [design polish assessment](plans/design-docs/2026-02-17-design-polish-assessment.md)
identifies 12 items across 3 tiers. Iterating on these is slow because most
require navigating to specific app states (wrong-answer feedback, round-complete,
practice card with recommendation, etc.). The goal is tooling that makes the
edit-CSS-then-evaluate cycle as fast as possible — ideally just save + refresh.

## Approach: `moments.html` — Assembled Screen Moments

**One new design reference page** at `guides/design/moments.html` (sibling to
`components.html` and `colors.html`). It renders **full assembled screen
layouts** representing the key app states where design decisions matter.

Like components.html, it links directly to `../../src/styles.css` — CSS changes
are visible on refresh with zero build step.

### Why this over alternatives

| Option | Verdict |
|--------|---------|
| **Expanded components.html** | Good for component-level A/B (buttons, bars). Not suited for assembled screen moments — different purpose. **Do both.** |
| **Debug bar in real app** | Highest fidelity, but requires JS to mock engine state, manage timers, populate adaptive data. Engineering-scope work, ongoing maintenance. Overkill for a polish sprint. |
| **State snapshot URLs** | Same JS-mocking problem as debug bar. |
| **Playwright screenshots** | Useful for validation/before-after, too slow for iterating (run script, wait, compare). **Add as a verification step.** |

### What the workflow looks like

1. Open `moments.html` in browser alongside `styles.css` in editor
2. Edit a CSS property or rule
3. Refresh — see the change across all relevant screen states instantly
4. For isolated component A/B, check variant sections in `components.html`
5. When satisfied, verify in the real app + run screenshot script

## Deliverables

### 1. `guides/design/moments.html` — Screen Moments Page

Each section wraps the real `modeScreen()` HTML scaffold (copied from
`src/html-helpers.ts:244-295`) in a `.moment-frame`, with the appropriate
phase class set and content pre-populated with realistic text.

**Sections** (mapped to assessment items):

| # | Moment | Phase class | Targets |
|---|--------|-------------|---------|
| 1 | Quiz: awaiting answer | `phase-active mode-active` | Items 1, 6 |
| 2 | Quiz: correct feedback | `phase-active mode-active` | Item 2 |
| 3 | Quiz: wrong feedback | `phase-active mode-active` | Item 2 |
| 4 | Quiz: chord spelling mode | `phase-active mode-active` | Items 1, 2 |
| 5 | Round complete: good round | `phase-round-complete` | Item 5 |
| 6 | Round complete: rough round | `phase-round-complete` | Item 5 |
| 7 | Practice tab: consolidating | `phase-idle` | Item 4 |
| 8 | Practice tab: ready to expand | `phase-idle` | Item 4 |
| 9 | Home screen | (home layout) | Item 3 |
| 10 | Progress tab + heatmap | `phase-idle` | Items 7, 8 |
| 11 | Countdown bar states | (isolated) | Item 6 |

Each moment frame is 402px wide (matching mobile viewport) to show realistic
proportions.

**Drift risk:** HTML is copied from `html-helpers.ts`, not generated. Acceptable
for a time-boxed sprint — the scaffold is stable and rarely changes. If it
proves valuable long-term, could add a build step to generate it.

### 2. Variant Comparison Sections in `components.html`

Add side-by-side variant panels below the existing component showcases for items
where isolated A/B comparison is useful:

- **Answer buttons** — Current / Tinted (light sage bg) / Tactile (inset shadow)
- **Countdown bar** — Current / Thicker+rounded / 3-stage color gradient
- **Feedback text** — Current size vs. bolder/larger treatment

Variant CSS lives in a `<style>` block within components.html (not in
`styles.css`). Winner gets promoted to production CSS; losers get deleted.

### 3. Extended Screenshot Script

Add scenarios to `scripts/take-screenshots.ts`:
- Correct feedback state (start quiz, answer correctly, capture)
- Wrong feedback state (start quiz, answer wrong, capture)
- Round-complete state (shorten timer via `page.evaluate`, capture after round ends)

Useful for before/after documentation, not for primary iteration.

## Files to Create/Modify

| File | Action |
|------|--------|
| `guides/design/moments.html` | **Create** — ~500 lines |
| `guides/design/components.html` | **Edit** — add variant comparison sections |
| `scripts/take-screenshots.ts` | **Edit** — add design moment captures |
| `build.ts` | No change needed — already copies all `guides/design/*.html` |

## Items NOT Covered by This Tooling

- **Item 10 (phase transition animations)** — inherently requires seeing state
  transitions in the real app. Moments page shows start/end frames but not the
  transition itself. Test these directly in the app.
- **Item 11 (heading typography)** — needs to be seen across multiple screens.
  The moments page helps (multiple screens on one page), but final validation
  needs the real app.
- **Item 9 (background depth)** — subtle gradients need full-page context. Check
  in real app.

## Verification

- Open `moments.html` directly in browser — all styles should render correctly
  via the `../../src/styles.css` link
- Edit a CSS custom property in `styles.css`, refresh moments.html — change
  should be immediately visible
- Run `npx tsx build.ts` — moments.html should appear in `docs/design/`
- Run `npx tsx scripts/take-screenshots.ts` — new screenshot files should appear
