# Sim Intro Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `sim-intro` step between the real join flow and the fake corporate login that shows a green typewriter "SIMULATION INITIATED" sequence, then a company hired announcement.

**Architecture:** A new full-screen `SimIntroScreen` component (matching the pattern of `StartScreen`/`LoginScreen`/`MFAPuzzle`) is inserted as a new `"sim-intro"` GameStep in `page.tsx`. The component manages its own phase state (typewriter → hired) internally. No new store state needed.

**Tech Stack:** React, TypeScript, Framer Motion (phase transitions), `setInterval` typewriter, zustand (`useGameStore` for `teamName`), Vitest + Testing Library

---

## File Map

- **Create:** `src/phases/onboarding/SimIntroScreen.tsx` — the new full-screen component
- **Create:** `src/phases/onboarding/__tests__/SimIntroScreen.test.tsx` — unit tests
- **Modify:** `src/app/page.tsx` — add `"sim-intro"` to `GameStep` union, wire routing

---

### Task 1: Write tests first (TDD)

**Files:**
- Create: `src/phases/onboarding/__tests__/SimIntroScreen.test.tsx`

- [ ] **Step 1: Create the test file**

```tsx
import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SimIntroScreen } from "../SimIntroScreen";

// Mock gameStore to control teamName
vi.mock("@/stores/gameStore", () => ({
  useGameStore: (selector: (s: { teamName: string }) => unknown) =>
    selector({ teamName: "AcmeCorp" }),
}));

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: true, // prefers-reduced-motion: reduce = true
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe("SimIntroScreen", () => {
  it("renders hired announcement with correct teamName in reduced-motion mode", () => {
    render(<SimIntroScreen onComplete={vi.fn()} />);
    expect(screen.getByText(/WELCOME TO ACMECORP/i)).toBeInTheDocument();
  });

  it("calls onComplete when CTA button is clicked", () => {
    const onComplete = vi.fn();
    render(<SimIntroScreen onComplete={onComplete} />);
    fireEvent.click(screen.getByRole("button", { name: /ENTER PORTAL/i }));
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("renders with default NexusCorp teamName", () => {
    // re-mock for NexusCorp
    vi.doMock("@/stores/gameStore", () => ({
      useGameStore: (selector: (s: { teamName: string }) => unknown) =>
        selector({ teamName: "NexusCorp" }),
    }));
    render(<SimIntroScreen onComplete={vi.fn()} />);
    expect(screen.getByText(/WELCOME TO NEXUSCORP/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests — expect them to fail (component doesn't exist yet)**

```bash
npx vitest run src/phases/onboarding/__tests__/SimIntroScreen.test.tsx
```

Expected: FAIL — `Cannot find module '../SimIntroScreen'`

---

### Task 2: Implement SimIntroScreen component

**Files:**
- Create: `src/phases/onboarding/SimIntroScreen.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/stores/gameStore";

const TYPEWRITER_LINES = [
  "> INITIALIZING SIMULATION ENVIRONMENT...",
  "> OPERATOR CREDENTIALS VERIFIED.",
  "> SIMULATION ACTIVE.",
];

interface SimIntroScreenProps {
  onComplete: () => void;
}

export function SimIntroScreen({ onComplete }: SimIntroScreenProps) {
  const teamName = useGameStore((s) => s.teamName);
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const [phase, setPhase] = useState<"typewriter" | "hired">(
    prefersReduced ? "hired" : "typewriter"
  );
  const [visibleLines, setVisibleLines] = useState<string[]>(
    prefersReduced ? TYPEWRITER_LINES : []
  );
  const [currentLineText, setCurrentLineText] = useState("");
  const [lineIndex, setLineIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);
  const charIndexRef = useRef(0);

  const initials = teamName.slice(0, 2).toUpperCase();

  // Blinking cursor
  useEffect(() => {
    if (phase !== "typewriter") return;
    const interval = setInterval(() => setShowCursor((v) => !v), 530);
    return () => clearInterval(interval);
  }, [phase]);

  // Typewriter effect
  useEffect(() => {
    if (prefersReduced || phase !== "typewriter") return;
    if (lineIndex >= TYPEWRITER_LINES.length) {
      // All lines done — wait 500ms then advance to hired phase
      const timeout = setTimeout(() => setPhase("hired"), 500);
      return () => clearTimeout(timeout);
    }

    const line = TYPEWRITER_LINES[lineIndex];
    charIndexRef.current = 0;
    setCurrentLineText("");

    const interval = setInterval(() => {
      charIndexRef.current += 1;
      const next = line.slice(0, charIndexRef.current);
      setCurrentLineText(next);
      if (charIndexRef.current >= line.length) {
        clearInterval(interval);
        setVisibleLines((prev) => [...prev, line]);
        setCurrentLineText("");
        setLineIndex((i) => i + 1);
      }
    }, 28);

    return () => clearInterval(interval);
  }, [lineIndex, phase, prefersReduced]);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ background: "var(--bg-primary)" }}
    >
      <AnimatePresence mode="wait">
        {phase === "typewriter" && (
          <motion.div
            key="typewriter"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-lg px-8 font-mono text-sm space-y-2"
            style={{ color: "var(--accent)" }}
          >
            {visibleLines.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
            {lineIndex < TYPEWRITER_LINES.length && (
              <div>
                {currentLineText}
                <span style={{ opacity: showCursor ? 1 : 0 }}>█</span>
              </div>
            )}
          </motion.div>
        )}

        {phase === "hired" && (
          <motion.div
            key="hired"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col items-center gap-6 px-8 text-center max-w-sm"
          >
            {/* Company badge */}
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center text-black font-black text-2xl select-none"
              style={{ background: "var(--accent)" }}
            >
              {initials}
            </div>

            {/* Heading */}
            <div>
              <div
                className="text-[10px] font-bold tracking-[0.3em] uppercase mb-2"
                style={{ color: "var(--accent)" }}
              >
                New Employment Notification
              </div>
              <h1
                className="text-2xl font-black tracking-tight uppercase"
                style={{ color: "var(--text-primary, #fff)" }}
              >
                Welcome to {teamName.toUpperCase()}
              </h1>
            </div>

            {/* Body */}
            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--text-secondary, rgba(255,255,255,0.6))" }}
            >
              You&apos;ve been hired as a{" "}
              <strong style={{ color: "var(--text-primary, #fff)" }}>
                Security Analyst
              </strong>
              . Report to the IT Security division immediately. Your credentials
              have been provisioned. Do not share them.
            </p>

            {/* CTA */}
            <button
              onClick={onComplete}
              className="mt-2 px-8 py-3 rounded-xl font-bold text-xs tracking-[0.2em] uppercase transition-all hover:scale-[1.03] active:scale-[0.97]"
              style={{
                background: "var(--accent)",
                color: "#000",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.filter =
                  "brightness(1.15)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.filter = "")
              }
            >
              Enter Portal →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Run tests — expect them to pass**

```bash
npx vitest run src/phases/onboarding/__tests__/SimIntroScreen.test.tsx
```

Expected: PASS (3 tests)

- [ ] **Step 3: Commit**

```bash
git add src/phases/onboarding/SimIntroScreen.tsx src/phases/onboarding/__tests__/SimIntroScreen.test.tsx
git commit -m "feat: add SimIntroScreen component with typewriter + hired announcement"
```

---

### Task 3: Wire sim-intro into page.tsx

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add import at top of file**

In `src/app/page.tsx`, after the existing onboarding imports (around line 16), add:

```tsx
import { SimIntroScreen } from "@/phases/onboarding/SimIntroScreen";
```

- [ ] **Step 2: Add "sim-intro" to the GameStep union type**

Find (lines 56–70):

```tsx
type GameStep =
  | "start"
  | "login"
  | "mfa"
  ...
```

Add `"sim-intro"` after `"login"`:

```tsx
type GameStep =
  | "start"
  | "login"
  | "sim-intro"
  | "mfa"
  | "onboarding-portal"
  ...
```

- [ ] **Step 3: Change StartScreen's onStart to go to sim-intro**

Find (around line 370):

```tsx
if (step === "start") {
  return <StartScreen onStart={() => changeStep("login")} />;
}
```

Change to:

```tsx
if (step === "start") {
  return <StartScreen onStart={() => changeStep("sim-intro")} />;
}
```

- [ ] **Step 4: Add the sim-intro rendering block**

After the `if (step === "login")` block (around line 375), add:

```tsx
if (step === "sim-intro") {
  return <SimIntroScreen onComplete={() => changeStep("login")} />;
}
```

- [ ] **Step 5: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests pass (no regressions)

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: wire sim-intro step between start and login"
```

---

### Task 4: Manual smoke test

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test normal flow**

Open `http://localhost:3000`. Complete the start screen (enter a handle, click PROCEED SOLO or use an invite code). Verify:
- Typewriter lines appear one by one with blinking cursor
- After last line, "Welcome to [teamName]" screen fades in
- "ENTER PORTAL →" button navigates to the fake corporate login

- [ ] **Step 3: Test dev shortcut**

Open `http://localhost:3000?step=sim-intro`. Verify sim-intro renders without crashing.

- [ ] **Step 4: Type-check**

```bash
npm run type-check
```

Expected: no errors
