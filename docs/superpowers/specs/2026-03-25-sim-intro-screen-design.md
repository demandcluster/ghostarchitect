# Sim Intro Screen Design

**Date:** 2026-03-25
**Status:** Approved

## Summary

Add a `sim-intro` step between the real join flow (`start`) and the simulated corporate login (`login`). This screen bridges the gap between "player has joined" and "player is now inside the fiction", preventing a jarring jump straight into the fake corporate login.

## Flow Change

```
start → sim-intro → login → mfa → onboarding-portal → ...
```

Previously: `start → login`

## Component

**File:** `src/phases/onboarding/SimIntroScreen.tsx`
**Type:** Full-screen, no OS shell (matches StartScreen/LoginScreen/MFAPuzzle pattern)
**Props:** `{ onComplete: () => void }`

## Phase 1 — Typewriter (auto, ~2s)

- Full-screen dark background (`--bg-primary`)
- Green monospace typewriter (`--accent` color, JetBrains Mono or monospace stack)
- Types out 3 lines sequentially:
  ```
  > INITIALIZING SIMULATION ENVIRONMENT...
  > OPERATOR CREDENTIALS VERIFIED.
  > SIMULATION ACTIVE.
  ```
- Blinking block cursor (`█`) after each line while typing, stays after last line
- Plain `setInterval` typewriter (no GSAP — this is a presentational component)
- Auto-transitions to Phase 2 ~500ms after last line finishes

## Phase 2 — Hired Announcement (user-dismissed)

- Same screen — Phase 1 text fades down/out, Phase 2 content fades in (Framer Motion)
- Content:
  - Company initials badge (2-letter, `--accent` bg, matches existing intranet portal style)
  - Heading: `WELCOME TO [TEAMNAME]`
  - Subheading: `You've been hired as a Security Analyst.`
  - Body: `"Report to the IT Security division immediately. Your credentials have been provisioned. Do not share them."`
  - CTA button: `ENTER PORTAL →` (accent-colored, matches existing button style)
- Player clicks CTA to advance to `login`

## GameStep Change

**File:** `src/app/page.tsx`

- Add `"sim-intro"` to the `GameStep` union type
- Change `StartScreen` `onStart` callback: `changeStep("login")` → `changeStep("sim-intro")`
- Add `if (step === "sim-intro")` block returning `<SimIntroScreen onComplete={() => changeStep("login")} />`
- Add `"sim-intro"` to the dev `?step=` URL param (already works via cast, no extra code needed)

## Data

- `teamName` read from `useGameStore` inside `SimIntroScreen` (no prop drilling needed)
- No new store state
- `teamName` defaults to `"NexusCorp"` when no team is joined (offline/demo path). "WELCOME TO NEXUSCORP" is acceptable — no special fallback needed.

## Badge Derivation

Company initials badge uses `teamName.slice(0, 2).toUpperCase()` — consistent with the existing intranet portal badge in `page.tsx`.

## Phase 1 Skippability

Phase 1 is not skippable. There is no user interaction affordance during the typewriter sequence — the player cannot click through it early.

## Styling

- Inherits existing CSS variables: `--bg-primary`, `--accent`, `--text-secondary`
- Consistent with StartScreen dark hacker aesthetic
- Framer Motion for phase transitions (opacity + y offset)
- `prefers-reduced-motion`: Phase 1 text is rendered instantly (all three lines visible at once, no typewriter animation), then auto-advances to Phase 2 immediately (no 500ms delay). Uses `window.matchMedia("(prefers-reduced-motion: reduce)").matches` check — same pattern as `IncidentReport.tsx`.

## Dev URL Note

The cast `return p as GameStep` on `page.tsx:79` handles `?step=sim-intro` automatically once `"sim-intro"` is added to the union type. No additional code needed.

## Testing

- New test file: `src/phases/onboarding/__tests__/SimIntroScreen.test.tsx`
- Test: Phase 2 CTA and teamName render correctly (default "NexusCorp" is acceptable)
- Test: `onComplete` fires when CTA is clicked
- Test: with `prefers-reduced-motion` mocked to `true`, Phase 2 content is immediately visible
- No animation/typewriter testing (not meaningful in jsdom)
