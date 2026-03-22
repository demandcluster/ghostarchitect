# Ending Page — Slow Burn Reveal (Split Card)

## Summary

A dedicated ending page that plays after the debrief. Slow blackout → typewriter text builds tension → split card reveals the verdict with unique colors, narrative, and cliffhanger per ending type.

## Game Step

New step `"ending"` added after `"debrief"` in the `GameStep` union.

## Transition Flow

1. Debrief page shows a "Continue" button at the bottom (replaces inline `<Endings>` component)
2. `changeStep("ending")` fires
3. EndingPage renders full-screen black
4. Typewriter text types out 3 lines with ~1.5s pauses between them (~5s total)
5. Lines fade out (0.5s)
6. Split card fades in (0.8s)
7. "Play Again" button appears below card

## Typewriter Text Per Ending

**Promoted:**
- "The breach was contained in 47 minutes."
- "Zero data exfiltrated."
- "The CISO has requested a meeting."

**Lateral:**
- "The breach was contained. Mostly."
- "Some gaps in your response were noted."
- "Management wants to discuss your next assignment."

**Neutral:**
- "The breach is over. The damage was... acceptable."
- "Your report sits in a queue of twelve."
- "Nobody's called. Nobody's complained."

**Fired:**
- "The exfiltration ran for 6 hours undetected."
- "4,500 employee records. Gone."
- "HR has scheduled a meeting."

## Split Card Layout

Left side (40%): Large faded letter + colored verdict text + accent line
Right side (60%): Subtitle label + narrative text + cliffhanger teaser box

### Per-Ending Config

| Ending | Color | Letter | Subtitle | Cliffhanger |
|--------|-------|--------|----------|-------------|
| Promoted | `#22c55e` | P | Senior Security Analyst | "Three months later, a familiar pattern resurfaces..." |
| Lateral | `#3b82f6` | L | Security Operations Transfer | "The SOC monitor pings. Something familiar in the logs..." |
| Neutral | `#a1a1aa` | N | Investigation Concluded | "A mandatory training invite appears in your inbox..." |
| Fired | `#ef4444` | F | Termination Notice | "BREAKING: Employee records surface on dark web marketplace..." |

### Fired Ending — Extra Content

The fired ending includes additional content in the narrative section:
- Mock news article ("BREAKING NEWS" banner, breach details mentioning teamName)
- Dark web marketplace listing (with "SIMULATION — NO REAL DATA" watermark, structurally invalid SSNs with 9XX prefix)

## Animation Tech

- **Framer Motion** only (no GSAP needed)
- Sequenced with `AnimatePresence` and staggered `motion.div` variants
- Typewriter: custom `useTypewriter` logic using `useState` + `useEffect` intervals
- Blinking cursor via CSS `@keyframes`

## Files

### Create
- `src/phases/ending/EndingPage.tsx` — full ending page component with typewriter + split card

### Modify
- `src/app/page.tsx` — add `"ending"` to `GameStep`, add Continue button to debrief step, render `<EndingPage>` for ending step
- `src/shared/hooks/useStepTransition.ts` — add `"ending"` to local `GameStep` type
- `src/phases/debrief/DebriefPage.tsx` — remove `<Endings>` component from results tab

### No Changes
- `src/phases/debrief/Endings.tsx` — kept for reference but no longer rendered from debrief (EndingPage has its own content)

## Component Props

```tsx
interface EndingPageProps {
  ending: Ending; // from deriveFlags()
  teamName: string;
  fakeDomain: string;
  onPlayAgain: () => void;
}
```

## Constraints

- Full-screen black background (not inside OSShell window — rendered outside the window system)
- Typewriter font: monospace, ~14px, white on black
- Card max-width ~600px, centered
- "Play Again" resets stores and returns to "start"
- Fake PII rules: structurally invalid SSNs (9XX prefix), fictional names, "SIMULATION — NO REAL DATA" watermark on fired ending
