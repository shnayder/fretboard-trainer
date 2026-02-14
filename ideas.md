# Feature/improvement ideas

This is a categorized, unprioritized list of things we could work on.

# Inbox

(To clean up, triage, categorize)

  - future proofing -- save time + questions somewhere, so we can add display
      - how much you've practiced this mode today
      - how much you've practiced across all modes today
- Follow up in new session. claude/redesign-navigation-menu-xpSD4 at plans/product-specs/2026-02-13-landing-screen.md.
- Fix GH auto review config, see if I can get Claude to wait or get an event and automatically reply
- Project timeline report/viz/analysis. Typically see slowdown with complexity, polish. Let’s see. 
- Timer in quiz distracting, not helpful. Switch to approx display? 5s, 10s, 2m, etc
- Use GH issues for backlog? Integrate with Claude?
- Set up local sandboxing. https://code.claude.com/docs/en/sandboxing
- Use up weekly token budget. If have extra, have backlog of tasks to run. Someone must have written this utility already.

- process improvements
    - make sure we have a spec for new features
        - have a product spec review checklist
           - use it every time
           - make a command, just like code review


Anne requests:
- Ukulele mode
- Do re mi instead of abc
- RT distributions are skewed, take median, not mean. Use median instead of ewma?


# Small bugs to batch fix

- BUG: speed test still uses combo note names sometimes (C#/Db, etc)


# Design and Dev workflow
- more code style and arch and review guidance, automation, claude.md as pointer, not giant list
- review and improvement process after every feature or few features, ditto bug fixes
  - how could we have prevented this bug from being introduced in the first place?
  - how could we have caught this bug using build-time tools (tests, linter)
  - how could this feature have been easier to design and implement? Missing patterns, component libraries, principles, etc.
- regular code review
- P2. Testing on a branch —- I can run dev server locally, but when I'm on my phone I have to merge

- size plans using XS-L. e.g. see 2026-02-13-visual-design-plan.md anything >L needs to be split up

- linter
- UX
  - standards, heuristics
  - process -- design docs with ascii art, before/after screenshots, etc.
  - color system. Brand.
  - component system
  - css standards, patterns. Tailwind?
  - glossary for user-facing terms (quiz? recall? speed? mode? exercise? item? etc etc)
  - 
- product vision guidance
- workflow process: design phase, implementation plan, implementation, review
  - https://openai.com/index/harness-engineering/
- doc management

# Music

## Math modes
Use a piano or fretboard control for responding. On guitar, pick a string, or allow any string. Or ask about specific notes using treble clef/etc, and require the user to find the note in the the correct octave.

## key signatures
- show actual music notation, not just "3 flats"

## scale degrees
- cleaner question format -- "1st of E major = ?" is not ideal. Is there a standard notation?
- use musical key signature instead of "E major"?
- handle minor keys

## diatonic chords
- response should match options. If I'm supposed to hit "A#/Bb", don't say "Bb major" as the correct answer

## chord spelling
- TBD: if I get a note wrong, should we flash it red and let me re-enter? for now, just keep going and see right answer at the end.
- reverse direction

## Modes to consider adding
- **Relative major/minor** — "Relative minor of Eb?" → Cm. Simple but needs to be instant. 12 items, bidirectional. Could be a small mode or bundled with key signatures.
- **Chord tones on fretboard** — "Where is the 3rd of Am on the G string?" → fret 2 (B). This directly connects theory to finger positions. Combines your existing fretboard knowledge with chord spelling. This is the "killer app" for bridging theory and playing.
- **Common chord relationships / transposition** — "Transpose Am-F-C-G from C to E" → C#m-A-E-B. Or simpler: "F is what numeral in the key of Bb?" → V. Practical for jam sessions and learning songs in new keys.

- **Musical modes** — "4th mode of C major?" → F Lydian. "D Dorian has what notes?" This matters once you start improvising over chord changes, but it builds on scale degrees so it's a natural progression.
- **Pentatonic scale notes** — "A minor pentatonic?" → A C D E G. Guitarists live in pentatonics, and knowing which notes are in/out helps escape box patterns.
- **Circle of fifths navigation** — "Two fifths up from Bb?" → C. "Three fourths up from E?" → A. Helps with key changes and understanding chord movement.

# Memory/cog sci

## response time handling
  - speed check ended up taking me from good-enough to not-nearly-good-enough in fretboard. Either change warmup to pick a specific answer to include visual search, or add extra 400ms buffer, or ...
  - bug: speed tap doesn't seem to have warmup
  - bug: interval/note <-> semitones warmup has too many options. Don't need both notes and numbers
  - consider switching from EWMA to median over recent window (RTs are usually log-normally distributed apparently)

- ** explain recall stats, give hint whether low values are due to likely forgetting or slow speed

## cold start for non-novice
- mark areas as "I know this", or "fast test mode" or something 

## sequencing, prioritization, recommendation.
Duo-path style, or cadence-like levels, or something else?

# Behavior guidance/gamification
- Timing
    - track how long I've been doing a quiz, how long I practiced overall today
       - time and # of questions
         - for time, handle long pauses somehow
    - streaks/practice log
    - reminders

# Polish
- visual style. 
   - Colors, sizes, fonts. Brand.
   - Don't use red/green scales

- speed check should be styled as a secondary action
- landscape mode (or lock vertical)

## Explanations
- No explanation that orange border means "recommended"
- Brief descriptions of each mode


# Public release
- better name. 
   - Reflex Music (other ideas: https://claude.ai/chat/54e6f967-1fc9-4843-bced-2185f64fe0ce)
- iOS / android support.
- marketing materials in-app
- landing page
- marketing materials
    - website
- LLC? or personal business enough? needs a name
- intro / landing screen
- feedback loops (email, bug reports, feedback)
- monetization plan

## competition
   - fermata
   - earmaster (not really)
   - music theory by justin guitar
   - cadence
   - fretzl
   - anki et al

