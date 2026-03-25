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

## Styling

- Inherits existing CSS variables: `--bg-primary`, `--accent`, `--text-secondary`
- Consistent with StartScreen dark hacker aesthetic
- Framer Motion for phase transitions (opacity + y offset)
- `prefers-reduced-motion`: skip typewriter animation, show Phase 2 immediately

## Testing

- New test file: `src/phases/onboarding/__tests__/SimIntroScreen.test.tsx`
- Test: Phase 2 content renders with correct teamName
- Test: `onComplete` fires when CTA is clicked
- No animation testing needed (Framer Motion not easily testable in jsdom)
