# Accessibility & Design Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four first-run issues: Edge scroll clip on landing, low contrast in bright offices, invisible landing visuals, and the breach bumper video going unnoticed.

**Architecture:** Pure CSS variable + component changes. No new abstractions, no new files. Three files touched: `globals.css` (body overflow + theme tokens), `StartScreen.tsx` (layout + visuals), `TransitionOverlay.tsx` (GSAP timing).

**Tech Stack:** Next.js, Tailwind CSS v4, Framer Motion, GSAP, TypeScript

---

## File Map

| File | What changes |
|------|-------------|
| `src/app/globals.css` | Remove `overflow:hidden`/`height:100vh` from `body`; update 7 corporate theme CSS variables |
| `src/phases/onboarding/StartScreen.tsx` | Fix root layout (no clip, dvh); remove `NetworkBackground`; replace Technical Background with spotlight + corner brackets; update scan line + logo glow colors |
| `src/shared/components/TransitionOverlay.tsx` | Reduce Phase 2 dark tint opacity; add 3.5s video hold; increase band count; bump POST font size |

---

## Task 1: Fix Edge scroll clip

**Files:**
- Modify: `src/app/globals.css:109-118`
- Modify: `src/phases/onboarding/StartScreen.tsx:353` (root div) and `src/phases/onboarding/StartScreen.tsx:475` (footer div)

### Why this is safe
`OSShell.tsx:58` already has `h-screen w-screen overflow-hidden` on its own root div — that locks all in-game phases. Removing the same rules from `body` only affects the start screen.

- [ ] **Step 1: Remove `overflow` and `height` from body in globals.css**

  In `src/app/globals.css`, find the `body` block (lines 109–118) and remove the two lines:

  ```css
  body {
    background: var(--bg-primary);
    color: var(--text-primary);
    font-family: "Inter", "IBM Plex Sans", system-ui, sans-serif;
    margin: 0;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  ```

  (Removed: `overflow: hidden;` and `height: 100vh;`)

- [ ] **Step 2: Fix StartScreen root div**

  In `src/phases/onboarding/StartScreen.tsx`, change the root element of the returned JSX (currently line 353) from:

  ```tsx
  <div className="relative flex flex-col items-center min-h-screen bg-[var(--bg-primary)] overflow-hidden px-6 pt-12 md:pt-24 pb-32">
  ```

  to:

  ```tsx
  <div className="relative flex flex-col items-center min-h-[100dvh] bg-[var(--bg-primary)] px-6 pt-12 md:pt-24">
  ```

  Changes: `min-h-screen` → `min-h-[100dvh]`, remove `overflow-hidden`, remove `pb-32`.

- [ ] **Step 3: Fix the absolute-positioned footer**

  Find the `{/* Immersive Footer */}` div (currently `className="absolute bottom-8 w-full px-6 z-20 flex flex-col items-center gap-6"`).

  Replace:
  ```tsx
  <div className="absolute bottom-8 w-full px-6 z-20 flex flex-col items-center gap-6">
  ```

  With:
  ```tsx
  <div className="relative mt-auto pt-12 pb-8 w-full px-6 z-20 flex flex-col items-center gap-6">
  ```

  This makes the footer participate in normal flow so it sits at the bottom of the flex column and is always reachable.

- [ ] **Step 4: Type-check**

  ```bash
  npm run type-check
  ```

  Expected: no errors.

- [ ] **Step 5: Commit**

  ```bash
  git add src/app/globals.css src/phases/onboarding/StartScreen.tsx
  git commit -m "fix: remove body overflow-hidden so landing page scrolls on Edge"
  ```

---

## Task 2: Slate mid-tone corporate theme

**Files:**
- Modify: `src/app/globals.css:4-40` (`:root, [data-theme="corporate"]` block)

All 7 changes are CSS variable values only. Every component already uses these variables — no component edits needed.

- [ ] **Step 1: Update corporate theme variables**

  In the `:root, [data-theme="corporate"]` block, apply these changes:

  | Variable | Old value | New value |
  |----------|-----------|-----------|
  | `--bg-primary` | `#00010c` | `#0f172a` |
  | `--bg-glass` | `rgba(255,255,255,0.06)` | `rgba(255,255,255,0.12)` |
  | `--border` | `rgba(15,23,42,0.12)` | `rgba(15,23,42,0.20)` |
  | `--border-strong` | `rgba(15,23,42,0.20)` | `rgba(15,23,42,0.32)` |
  | `--text-muted` | `#64748b` | `#475569` |
  | `--text-placeholder` | `#94a3b8` | `#64748b` |
  | `--taskbar-text` | `#94a3b8` | `#64748b` |

  The result for that block:

  ```css
  :root,
  [data-theme="corporate"] {
    --bg-primary:       #0f172a;
    --bg-secondary:     #1e293b;
    --bg-tertiary:      #334155;
    --bg-glass:         rgba(255,255,255,0.12);
    --bg-window:        #ffffff;
    --bg-window-raised: #f8fafc;
    --bg-window-sunken: #f1f5f9;
    --text-primary:     #0f172a;
    --text-secondary:   #334155;
    --text-muted:       #475569;
    --text-placeholder: #64748b;
    --accent:           #3b6ef8;
    --accent-hover:     #2555e8;
    --accent-subtle:    rgba(59,110,248,0.10);
    --accent-ring:      rgba(59,110,248,0.35);
    --border:           rgba(15,23,42,0.20);
    --border-strong:    rgba(15,23,42,0.32);
    --window-header-from: #1e40af;
    --window-header-to:   #2563eb;
    --window-header-text: #ffffff;
    --taskbar-bg:       rgba(15,23,42,0.95);
    --taskbar-border:   rgba(59,110,248,0.15);
    --taskbar-text:     #64748b;
    --taskbar-text-active: #0f172a;
    --danger:           #dc2626;
    --danger-subtle:    rgba(220,38,38,0.10);
    --success:          #16a34a;
    --success-subtle:   rgba(22,163,74,0.10);
    --warning:          #ea580c;
    --warning-subtle:   rgba(234,88,12,0.10);
    --info:             #0ea5e9;
    --info-subtle:      rgba(14,165,233,0.10);
    --shadow-window:    0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05);
    --shadow-card:      0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.06);
  }
  ```

- [ ] **Step 2: Type-check**

  ```bash
  npm run type-check
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/app/globals.css
  git commit -m "fix: boost corporate theme contrast for bright office use"
  ```

---

## Task 3: Landing page focused spotlight

**Files:**
- Modify: `src/phases/onboarding/StartScreen.tsx`

Replaces the `NetworkBackground` component + grid overlay with: a radial spotlight behind the logo, 4 corner bracket accents, and an updated scan line. Also updates logo glow colors to match corporate blue.

- [ ] **Step 1: Remove NetworkBackground import and usage**

  At the top of `StartScreen.tsx`, delete the import line:
  ```tsx
  import { NetworkBackground } from "@/shared/components/NetworkBackground";
  ```

  In the JSX (inside the root div), delete:
  ```tsx
  {/* Animated network background */}
  <NetworkBackground />
  ```

- [ ] **Step 2: Replace the Technical Background block**

  Find the entire `{/* Technical Background */}` block (from `<div className="absolute inset-0 pointer-events-none overflow-hidden"` to its closing `</div>`) and replace it with this spotlight + corner brackets block:

  ```tsx
  {/* Spotlight background */}
  <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
    {/* Radial spotlight behind logo area */}
    <div
      className="absolute inset-0"
      style={{
        background:
          "radial-gradient(ellipse 50% 40% at 50% 28%, rgba(59,130,246,0.18) 0%, transparent 70%)",
      }}
    />
    {/* Slow scan line */}
    <motion.div
      className="absolute left-0 w-full h-32 bg-gradient-to-b from-transparent via-[rgba(59,130,246,0.08)] to-transparent"
      animate={{ top: ["-20%", "120%"] }}
      transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
    />
    {/* Corner brackets */}
    {/* Top-left */}
    <div className="absolute top-4 left-4 w-5 h-[2px] bg-blue-500/50" />
    <div className="absolute top-4 left-4 w-[2px] h-5 bg-blue-500/50" />
    {/* Top-right */}
    <div className="absolute top-4 right-4 w-5 h-[2px] bg-blue-500/50" />
    <div className="absolute top-4 right-4 w-[2px] h-5 bg-blue-500/50" />
    {/* Bottom-left */}
    <div className="absolute bottom-4 left-4 w-5 h-[2px] bg-blue-500/50" />
    <div className="absolute bottom-4 left-4 w-[2px] h-5 bg-blue-500/50" />
    {/* Bottom-right */}
    <div className="absolute bottom-4 right-4 w-5 h-[2px] bg-blue-500/50" />
    <div className="absolute bottom-4 right-4 w-[2px] h-5 bg-blue-500/50" />
  </div>
  ```

- [ ] **Step 3: Update BreachLogo idle glow to corporate blue**

  In the `BreachLogo` component (top of the file), find the `animate` prop on the main `<motion.img>`:

  ```tsx
  filter: isGlitching 
    ? "drop-shadow(0 0 30px rgba(0,229,51,0.5)) contrast(2) brightness(1.5)" 
    : "drop-shadow(0 0 30px rgba(0,229,51,0.25)) grayscale(0.2) contrast(1.1)",
  ```

  Change **only the idle (non-glitching) value** — keep the glitch value unchanged:

  ```tsx
  filter: isGlitching
    ? "drop-shadow(0 0 30px rgba(0,229,51,0.5)) contrast(2) brightness(1.5)"
    : "drop-shadow(0 0 30px rgba(59,130,246,0.5)) grayscale(0.2) contrast(1.1)",
  ```

- [ ] **Step 4: Type-check**

  ```bash
  npm run type-check
  ```

  Expected: no errors. If you see "Cannot find module NetworkBackground" it means the import wasn't fully removed — check Step 1.

- [ ] **Step 5: Commit**

  ```bash
  git add src/phases/onboarding/StartScreen.tsx
  git commit -m "feat: replace landing network background with focused spotlight"
  ```

---

## Task 4: Breach bumper — unmissable transition

**Files:**
- Modify: `src/shared/components/TransitionOverlay.tsx`

Three changes: reduce Phase 2 tint so video shows through, add a 3.5s hold so the 5s bumper has time to play, increase band count and POST font size.

- [ ] **Step 1: Increase glitch band count**

  Find:
  ```typescript
  const bandCount = 8;
  ```

  Change to:
  ```typescript
  const bandCount = 12;
  ```

  Also update the `bandBgs` array to have 12 entries (it must match `bandCount`):

  ```typescript
  const bandBgs = [
    "var(--window-header-from)",
    "var(--bg-window)",
    "var(--window-header-from)",
    "var(--bg-window)",
    "var(--window-header-from)",
    "var(--bg-window)",
    "var(--window-header-from)",
    "var(--bg-window)",
    "var(--window-header-from)",
    "var(--bg-window)",
    "var(--window-header-from)",
    "var(--bg-window)",
  ];
  ```

- [ ] **Step 2: Reduce Phase 2 dark tint opacity**

  Find the Phase 2 tween (around line 205):
  ```typescript
  tl.to(darkTint, {
    background: "rgba(0,0,0,0.72)",
    duration: 0.1,
    onStart: () => {
  ```

  Change `rgba(0,0,0,0.72)` to `rgba(0,0,0,0.35)`:
  ```typescript
  tl.to(darkTint, {
    background: "rgba(0,0,0,0.35)",
    duration: 0.1,
    onStart: () => {
  ```

- [ ] **Step 3: Add video hold after cursor blink**

  Find the cursor blink tween and the `tl.call(() => { cursor.remove(); })` that follows it. Insert a hold immediately after the cursor blink, before the cursor remove:

  Before:
  ```typescript
  tl.to(cursor, {
    opacity: 0,
    repeat: 3,
    yoyo: true,
    duration: 0.1,
  });

  // Phase 3: Fade in POST layer
  tl.call(() => {
    cursor.remove();
  });
  ```

  After:
  ```typescript
  tl.to(cursor, {
    opacity: 0,
    repeat: 3,
    yoyo: true,
    duration: 0.1,
  });

  // Hold so the 5s bumper video has time to play
  tl.to({}, { duration: 3.5 });

  // Phase 3: Fade in POST layer
  tl.call(() => {
    cursor.remove();
  });
  ```

- [ ] **Step 4: Increase POST screen font size**

  Find the `postLayer` style string (around line 127):
  ```typescript
  "position:absolute;inset:0;z-index:4;background:rgba(10,14,20,0);padding:20px;" +
  'font-family:"JetBrains Mono",monospace;font-size:13px;overflow-y:auto;opacity:0;'
  ```

  Change `font-size:13px` to `font-size:15px` and add `line-height:1.8`:
  ```typescript
  "position:absolute;inset:0;z-index:4;background:rgba(10,14,20,0);padding:20px;" +
  'font-family:"JetBrains Mono",monospace;font-size:15px;line-height:1.8;overflow-y:auto;opacity:0;'
  ```

- [ ] **Step 5: Type-check**

  ```bash
  npm run type-check
  ```

  Expected: no errors.

- [ ] **Step 6: Commit**

  ```bash
  git add src/shared/components/TransitionOverlay.tsx
  git commit -m "feat: extend breach transition so 5s bumper video plays prominently"
  ```

---

## Task 5: Final build verification

- [ ] **Step 1: Full build**

  ```bash
  npm run build
  ```

  Expected: exits 0, no TypeScript or linting errors. The `--standalone` output compiles correctly.

- [ ] **Step 2: Manual verification checklist**

  Start the dev server:
  ```bash
  npm run dev
  ```

  Check each fix:

  - [ ] **Scroll fix**: Open `http://localhost:3000` in Edge. Shrink the browser window to ~600px tall. The footer ("GHOST ARCHITECT · DEMANDCLUSTER") should be reachable by scrolling.
  - [ ] **Contrast**: On a bright monitor at ~50% ambient light, the landing page background (`#0f172a`) and all text/borders should be clearly readable without straining.
  - [ ] **Spotlight**: The logo should have a visible blue glow halo behind it. 4 corner bracket accents should be visible in each corner of the viewport.
  - [ ] **Breach transition**: Enter an invite code and proceed to the breach phase. The 5s bumper video should be clearly visible (not buried under a dark tint) for its full duration before the POST screen appears.

- [ ] **Step 3: Commit if any last-minute fixes were needed**

  If Step 2 revealed minor tweaks (e.g. spotlight position adjustment), apply and commit:
  ```bash
  git add -p
  git commit -m "fix: visual tweaks from manual verification"
  ```
