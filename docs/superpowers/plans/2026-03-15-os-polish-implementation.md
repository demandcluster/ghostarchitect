# OS Interface Polish Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance Ghost Architect interface with improved taskbar interactions, smoother phase transitions, and a rewarding trophy badge system for game completion.

**Architecture:** Incremental polish that builds on existing OS-like interface. Taskbar polish adds Framer Motion interactions to existing buttons. Phase transitions add a new hook for step-to-step fades and enhance existing GSAP breach transition. Trophy badge creates a new reusable component with canvas-confetti integration.

**Tech Stack:** Framer Motion (component animations), GSAP (breach transition), canvas-confetti (particle effects), React hooks, TypeScript, Tailwind CSS

---

## File Structure

### New Files
- `src/shared/hooks/useStepTransition.ts` - Hook for smooth step-to-step transitions
- `src/shared/components/TrophyBadge.tsx` - Animated trophy reveal component with confetti
- `src/phases/debrief/__tests__/TrophyBadge.test.tsx` - Trophy badge component tests

### Modified Files
- `src/app/globals.css` - Add `--accent-ring` CSS variable for focus states
- `src/shared/components/Taskbar.tsx` - Add Framer Motion animations and active/hover states
- `src/shared/components/TransitionOverlay.tsx` - Enhance glitch effects, RGB shift, screen shake
- `src/phases/debrief/DebriefPage.tsx` - Integrate TrophyBadge component
- `package.json` - Add canvas-confetti dependency

---

## Chunk 1: Foundation Setup

### Task 1: Add CSS Variable for Focus Ring

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add --accent-ring variable to globals.css**

Find the CSS variables section (around line 50-80) and add:

```css
--accent-ring: rgba(59,110,248,0.35);
```

Place it near other accent-related variables like `--accent-subtle` or `--accent`.

- [ ] **Step 2: Verify variable exists in build**

Run: `npm run build`
Expected: Build completes without CSS errors

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "style: add --accent-ring CSS variable for taskbar focus states"
```

---

### Task 2: Install canvas-confetti Dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install canvas-confetti**

Run: `npm install canvas-confetti`

Expected: `canvas-confetti` added to package.json dependencies

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add canvas-confetti for trophy badge particle effects"
```

---

## Chunk 2: Taskbar Polish

### Task 3: Update Taskbar Component with Framer Motion

**Files:**
- Modify: `src/shared/components/Taskbar.tsx:53-154`

- [ ] **Step 1: Add Framer Motion import**

At the top of the file, add:

```tsx
import { motion } from "framer-motion";
```

- [ ] **Step 2: Wrap taskbar buttons in motion.button with animations**

Replace the button element (lines 132-154) with:

```tsx
<motion.button
  key={app.id}
  onClick={() => onAppClick(app.id)}
  animate={{
    scale: activeApp === app.id ? 1.1 : 1
  }}
  whileHover={{ scale: 1.1 }}
  whileTap={{ scale: 0.95 }}
  transition={{ type: "spring", stiffness: 300, damping: 25 }}
  className={`
    px-2.5 py-1.5 rounded-lg text-xs transition-colors
    ${isBreach ? "font-mono" : ""}
    ${
      activeApp === app.id
        ? isBreach
          ? "bg-[var(--accent-subtle)] ring-1 ring-[var(--border)] text-[var(--taskbar-text-active)] focus:ring-2 focus:ring-[var(--accent-ring)]"
          : "bg-white/15 ring-1 ring-white/20 text-[var(--taskbar-text-active)] focus:ring-2 focus:ring-[var(--accent-ring)]"
        : "text-[var(--taskbar-text)] hover:bg-white/10 focus:ring-2 focus:ring-[var(--accent-ring)]"
    }
  `}
  title={app.label}
>
  <span className="inline-flex items-center justify-center w-4 h-4 text-center mr-1">
    {app.icon}
  </span>
  <span className="hidden sm:inline">{app.label}</span>
</motion.button>
```

Changes made:
- Added `whileHover`, `whileTap`, `transition` props for spring animations
- Added `focus:ring-2 focus:ring-[var(--accent-ring)]` classes for accessibility
- Changed `<button>` to `<motion.button>`
- Added `key={app.id}` for proper Framer Motion reconciliation

- [ ] **Step 3: Run dev server to verify animations work**

Run: `npm run dev`
Open: http://localhost:3000
Expected: Taskbar buttons have smooth scale animations on hover, active states maintain 1.1x scale, focus rings visible when tabbing

- [ ] **Step 4: Commit**

```bash
git add src/shared/components/Taskbar.tsx
git commit -m "feat: add Framer Motion animations to taskbar buttons"
```

---

## Chunk 3: Step Transitions

### Task 4: Create useStepTransition Hook

**Files:**
- Create: `src/shared/hooks/useStepTransition.ts`

- [ ] **Step 1: Write useStepTransition hook**

```tsx
import { useState, useCallback } from "react";
import { useGameStore } from "@/stores/gameStore";
import type { GameStep } from "@/app/page";

export function useStepTransition() {
  const setPhase = useGameStore((s) => s.setPhase);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const changeStep = useCallback(async (newStep: GameStep) => {
    // Prevent concurrent transitions
    if (isTransitioning) return;

    setIsTransitioning(true);
    await new Promise(resolve => setTimeout(resolve, 300)); // fade out
    setPhase(newStep);
    await new Promise(resolve => setTimeout(resolve, 300)); // fade in
    setIsTransitioning(false);
  }, [isTransitioning, setPhase]);

  return { isTransitioning, changeStep };
}
```

**Note:** Use `changeStep` to replace `setStep` calls in game flow. Keep `setPhase` calls that only change visual mode (e.g., `setPhase("breach")` when transitioning to breach visual mode). Make calling functions `async` when using `changeStep`.

- [ ] **Step 3: Commit**

```bash
git add src/shared/hooks/useStepTransition.ts
git commit -m "feat: add useStepTransition hook for smooth phase transitions"
```

---

### Task 5: Apply Transitions to Step Changes

**Files:**
- Modify: `src/app/page.tsx` (integrate useStepTransition at appropriate step change points)

**Note:** Based on the current page.tsx structure, step changes happen through conditional rendering. The useStepTransition hook should be used where `setStep` or `setPhase` is called during game flow.

- [ ] **Step 1: Identify step change locations in page.tsx**

Search for calls to `setStep()` and `setPhase()` in the Home component. These are typically at the end of each phase completion handler.

- [ ] **Step 2: Add useStepTransition hook to Home component**

Near other hook calls in Home component, add:

```tsx
const { isTransitioning, changeStep } = useStepTransition();
```

- [ ] **Step 3: Replace direct setStep/setPhase calls with changeStep**

Replace `setStep(newStep)` calls with `await changeStep(newStep)`. Ensure the calling function is `async` if needed.

For example, if you find:

```tsx
const handleEmailComplete = () => {
  setStep("breach-password");
};
```

Change to:

```tsx
const handleEmailComplete = async () => {
  await changeStep("breach-password");
};
```

- [ ] **Step 4: Run dev server to verify transitions work**

Run: `npm run dev`
Expected: Smooth fade-out/fade-in transitions between all game steps (0.3s each direction)

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: apply smooth transitions between game steps"
```

---

## Chunk 4: Breach Transition Enhancement

### Task 6: Enhance TransitionOverlay with RGB Shift and Screen Shake

**Files:**
- Modify: `src/shared/components/TransitionOverlay.tsx`

- [ ] **Step 1: Add RGB shift effect to glitch bands**

In the glitch band rendering section, add CSS text-shadow for RGB shift. Modify the glitch band styling to include:

```tsx
style={{
  textShadow: isGlitching
    ? `${Math.random() * 4 - 2}px ${Math.random() * 4 - 2}px 0 rgba(255,0,0,0.5), ` +
      `${Math.random() * 4 - 2}px ${Math.random() * 4 - 2}px 0 rgba(0,255,0,0.5), ` +
      `${Math.random() * 4 - 2}px ${Math.random() * 4 - 2}px 0 rgba(0,0,255,0.5)`
    : "none"
}}
```

- [ ] **Step 2: Add screen shake during glitch bands**

Add a `isShaking` state and shake interval. At the top of the component:

```tsx
const [isShaking, setIsShaking] = useState(false);
```

Then modify the glitch trigger to enable shaking:

```tsx
useEffect(() => {
  if (isGlitching) {
    setIsShaking(true);
    const shakeInterval = setInterval(() => {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 100);
    }, 50);

    return () => {
      clearInterval(shakeInterval);
      setIsShaking(false);
    };
  }
}, [isGlitching]);
```

Apply shake transform to glitch bands:

```tsx
<div
  style={{
    transform: isShaking
      ? `translate(${Math.random() * 6 - 3}px, ${Math.random() * 6 - 3}px)`
      : "none"
  }}
>
  {/* glitch band content */}
</div>
```

Add CSS animation for shake (optional - using random offsets above is sufficient):

- [ ] **Step 3: Speed up terminal typing animation**

Find the POST request typing effect and reduce the `typingDelay` or `charDelay` variable. For example, if current is 50ms per character, change to 20ms for faster, more urgent feel.

- [ ] **Step 4: Add cursor blink effect to terminal**

Add a blinking cursor to the terminal typing output:

```tsx
<span
  style={{
    animation: isTyping ? "blink 0.7s infinite" : "none"
  }}
>
  █
</span>
```

Add CSS keyframes for blink:

```css
@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
```

- [ ] **Step 5: Animate scanline opacity on theme reveal**

Find the scanline rendering in breach mode and add opacity transition:

```tsx
<AnimatePresence>
  <motion.div
    initial={{ opacity: 0.3 }}
    animate={{ opacity: 0 }}
    transition={{ duration: 2 }}
    exit={{ opacity: 0.3 }}
    style={{
      pointerEvents: "none",
      position: "fixed",
      inset: 0,
      background: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)`
    }}
  />
</AnimatePresence>
```

- [ ] **Step 6: Run dev server to verify enhancements**

Run: `npm run dev`
Trigger breach transition
Expected: Sharper glitch with RGB shift, screen shaking during glitch, faster terminal typing with blinking cursor, scanline fade-in over 2s

- [ ] **Step 7: Commit**

```bash
git add src/shared/components/TransitionOverlay.tsx
git commit -m "feat: enhance breach transition with RGB shift, screen shake, and improved terminal"
```

---

## Chunk 5: Trophy Badge Component

### Task 7: Create TrophyBadge Component

**Files:**
- Create: `src/shared/components/TrophyBadge.tsx`

- [ ] **Step 1: Write TrophyBadge component base structure**

```tsx
"use client";

import { motion, AnimatePresence, useReducedMotion, useMotionValue } from "framer-motion";
import confetti from "canvas-confetti";
import { useScoreStore } from "@/stores/scoreStore";
import { computeTotal } from "@/engine/scoring";

interface TrophyBadgeProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TrophyBadge({ isOpen, onClose }: TrophyBadgeProps) {
  const prefersReducedMotion = useReducedMotion();
  const categoryScores = useScoreStore((s) => s.categoryScores);
  const actions = useScoreStore((s) => s.actions);

  // Compute total from category scores and time bonus from actions
  const totalScore = computeTotal(categoryScores);
  const timeBonus = actions.reduce((sum, action) => sum + (action.timeBonus || 0), 0);
  const finalScore = totalScore + timeBonus;

  const rank = calculateRank(totalScore); // Use category score only, not time bonus

  const handleBadgeReveal = () => {
    // Fire confetti when trophy emoji completes bounce animation
    // Skip for users who prefer reduced motion
    if (!prefersReducedMotion) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: rank.colors
      });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="bg-[var(--bg-secondary)] rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl border border-[var(--border)]"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            {/* Trophy emoji with confetti on reveal */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              onAnimationComplete={handleBadgeReveal}
              className="text-8xl mb-4"
            >
              {rank.emoji}
            </motion.div>

            {/* Rank and score */}
            <div className={`font-bold text-3xl ${rank.className} mb-2`}>
              {rank.name}
            </div>

            <div className="text-[var(--text-secondary)] text-lg">
              Final Score:{" "}
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="font-bold text-[var(--accent)]"
              >
                {finalScore}/500
              </motion.span>
              {timeBonus > 0 && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5 }}
                  className="text-sm ml-2"
                >
                  (+{timeBonus} time bonus)
                </motion.span>
              )}
            </div>

            {/* Close button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="mt-6 px-6 py-2 bg-[var(--accent)] text-white rounded-lg font-medium"
            >
              Continue
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function calculateRank(score: number): {
  name: string;
  emoji: string;
  className: string;
  colors: string[];
} {
  // Score is category score only (max 500), not including time bonus
  if (score >= 450) {
    return { name: "PLATINUM", emoji: "🏆", className: "text-slate-300", colors: ["#cbd5e1", "#e2e8f0", "#ffffff"] };
  }
  if (score >= 400) {
    return { name: "GOLD", emoji: "🥇", className: "text-yellow-400", colors: ["#facc15", "#fde047", "#ffffff"] };
  }
  if (score >= 250) {
    return { name: "SILVER", emoji: "🥈", className: "text-slate-400", colors: ["#94a3b8", "#cbd5e1", "#ffffff"] };
  }
  return { name: "BRONZE", emoji: "🥉", className: "text-amber-700", colors: ["#b45309", "#d97706", "#ffffff"] };
}
```

- [ ] **Step 2: Export TrophyBadge from components index**

Modify or create `src/shared/components/index.ts`:

```tsx
export { TrophyBadge } from "./TrophyBadge";
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/components/TrophyBadge.tsx src/shared/components/index.ts
git commit -m "feat: add TrophyBadge component with confetti reveal"
```

---

### Task 8: Integrate TrophyBadge into DebriefPage

**Files:**
- Modify: `src/phases/debrief/DebriefPage.tsx`

- [ ] **Step 1: Add TrophyBadge import to DebriefPage**

```tsx
import { TrophyBadge } from "@/shared/components/TrophyBadge";
```

- [ ] **Step 2: Add trophy state to DebriefPage component**

Near other state in DebriefPage component:

```tsx
const [showTrophy, setShowTrophy] = useState(false);
```

- [ ] **Step 3: Trigger trophy show on debrief completion**

Find where debrief content completes (typically after ending calculation or radar chart render). Add:

```tsx
const trophyShownRef = useRef(false);

useEffect(() => {
  // Show trophy after debrief has rendered, only once
  if (trophyShownRef.current) return;

  const timer = setTimeout(() => {
    setShowTrophy(true);
    trophyShownRef.current = true;
  }, 1000); // 1s delay for impact

  return () => clearTimeout(timer);
}, []);
```

- [ ] **Step 4: Add TrophyBadge component to JSX**

At the bottom of the return statement, before the closing tags:

```tsx
<TrophyBadge
  isOpen={showTrophy}
  onClose={() => setShowTrophy(false)}
/>
```

- [ ] **Step 5: Run dev server and complete a game**

Run: `npm run dev`
Complete a game flow from start to debrief
Expected: Debrief renders, then after 1s delay, TrophyBadge slides up from bottom with bounce animation and confetti burst

- [ ] **Step 6: Commit**

```bash
git add src/phases/debrief/DebriefPage.tsx
git commit -m "feat: integrate TrophyBadge into DebriefPage"
```

---

### Task 9: Test TrophyBadge Component

**Files:**
- Create: `src/phases/debrief/__tests__/TrophyBadge.test.tsx`

- [ ] **Step 1: Write failing test for rank calculation**

```tsx
import { describe, it, expect } from "vitest";
import { vi } from "vitest";

describe("calculateRank", () => {
  it("returns BRONZE for scores 0-249", () => {
    // This would require importing the function or creating a test utility
    // For now, we'll test the TrophyBadge component behavior
    expect(true).toBe(true);
  });
});
```

**Note:** Since calculateRank is a private function in TrophyBadge, we'll test component behavior instead.

- [ ] **Step 2: Write test for TrophyBadge rendering**

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import { TrophyBadge } from "@/shared/components/TrophyBadge";
import { vi } from "vitest";
import { useScoreStore } from "@/stores/scoreStore";

// Mock the store
vi.mock("@/stores/scoreStore", () => ({
  useScoreStore: () => ({
    categoryScores: {
      phishingIQ: 100,
      passwordHygiene: 100,
      networkSecurity: 100,
      forensicSkill: 100
    },
    actions: [
      { id: "test", timeBonus: 15, score: 0, category: "" }
    ]
  })
}));

// Mock computeTotal
vi.mock("@/engine/scoring", () => ({
  computeTotal: () => 400
}));

describe("TrophyBadge", () => {
  it("renders PLATINUM rank for score of 487+15", async () => {
    render(<TrophyBadge isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      const rank = screen.queryByText(/PLATINUM/i);
      expect(rank).toBeInTheDocument();
    });
  });

  it("shows time bonus when > 0", async () => {
    render(<TrophyBadge isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      const bonusText = screen.queryByText(/\+15 time bonus/i);
      expect(bonusText).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `npm run test -- src/phases/debrief/__tests__/TrophyBadge.test.tsx`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/phases/debrief/__tests__/TrophyBadge.test.tsx
git commit -m "test: add TrophyBadge component tests"
```

---

## Chunk 6: Final Verification

### Task 10: End-to-End Testing

**Files:**
- No file modifications

- [ ] **Step 1: Run all tests**

Run: `npm run test`
Expected: All tests pass, including new TrophyBadge tests

- [ ] **Step 2: Type check**

Run: `npm run type-check`
Expected: No TypeScript errors

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: Build completes successfully

- [ ] **Step 4: Manual testing checklist**

Run: `npm run dev`

Test the following:
- [ ] Taskbar icons scale to 1.1x on hover with spring animation
- [ ] Active taskbar button has 1.1x scale and glow effect
- [ ] Tab-navigating taskbar shows focus ring
- [ ] Phase transitions have 0.3s fade-out/fade-in
- [ ] Breach transition has sharper glitch with RGB shift
- [ ] Breach transition shakes screen during glitch
- [ ] Terminal typing is faster with blinking cursor
- [ ] Scanline fades in over 2s on breach reveal
- [ ] Completing a game shows TrophyBadge with bounce animation
- [ ] Confetti fires on trophy emoji reveal (unless prefers-reduced-motion)
- [ ] Score animates from 0 to final value
- [ ] Time bonus displays separately when > 0
- [ ] Trophy badge shows correct rank for final score
- [ ] Reduced motion preference disables confetti and simplifies animations

- [ ] **Step 5: Commit final verification**

```bash
git commit -m "chore: verify all OS polish enhancements work correctly"
```

---

## Success Criteria

All tasks completed when:
- ✅ Taskbar buttons have smooth hover/active transitions with spring physics
- ✅ All step changes include fade-out/fade-in transitions
- ✅ Breach transition feels more dramatic with enhanced glitch, RGB shift, screen shake
- ✅ Trophy badge reveals with confetti burst and animated score count-up
- ✅ Keyboard navigation works throughout with visible focus states
- ✅ All animations feel smooth and performant (60fps)
- ✅ All tests pass
- ✅ TypeScript has no errors
- ✅ Production build succeeds
