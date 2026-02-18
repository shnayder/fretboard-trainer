# Process Backlog

Owner: process workstream
Branch: workstream/process

## Prioritization principles
- **make efficient use of my (human) time and attention** 
   - Guide my attention to the right things
   - Improve review tooling
   - Document and automate so I don't have to make the same decision many times.
- **Prevent repeated friction.** One-off issues are ok. Three-off issues are not.
- **Use tools to automate or simplify human or AI review** when possible. Type systems, linters, screenshotters, tests of course. Build custom tools.

## Active
- VS code + worktrees. 
    - separate dev server ports per worktree.

## Backlog
- [P1] Product spec review checklist + command (like code review) #review #tooling
- [P1] Post-merge clean-up checklist/trigger #workflow #automation
- [P1] Linter setup #automation
- [P1] Review and improvement process after every feature / bug fix batch #review #feedback
  - How could we have prevented the bug?
  - How could we have caught it with build-time tools (tests, linter)?
  - What patterns/libraries would make future work easier?
- [P1] Fix GH auto review config (get Claude to wait/respond automatically) #review #automation
- [P2] step-by-step review tooling #review #tooling
  - here's a big spec, plan, etc. Go through it chunk by chunk, ask for feedback, incorporate it.
- [P2] script/hook to filter for new user-facing terminology, or wrong words #automation #review
- [P2] Set up notifications when web mode finishes (iOS/watch) #tooling
  - local too.
- [P2] backlog wrangling -- how to keep it organized, sized. "Start on the next thing" command perhaps. #planning #tooling
- [P2] Improve GH code review instructions #review
- [P2] Testing on a branch — dev server locally but phone needs merge #workflow
- [P2] Size plans using XS-L (anything >L needs splitting) #planning
- [P2] Periodic git cleanup: remove merged feature branches #workflow #automation
- [--] Regular code review cadence #review
- [--] CSS standards/patterns (Tailwind?) #standards
- [--] Project timeline report/viz/analysis #insight
- [--] Use GH issues for backlog? Integrate with Claude? #planning #tooling
- [--] Tune local sandboxing #tooling
- [--] Use up weekly token budget — backlog of tasks to run #planning
- [--] Tool idea: voice + pointer review tool, hooked up to DOM so I don't have to explain what I'm talking about. Point mouse at a thing or things and talk. Has anyone built this yet?

