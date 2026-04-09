# Accessibility & Design Refresh

**Date:** 2026-04-09  
**Trigger:** First live team run — Edge scroll breakage, contrast failures in bright office, invisible landing visuals, missed breach bumper video.

---

## Problems Being Solved

| # | Problem | Root Cause |
|---|---------|-----------|
| 1 | Landing page bottom clipped on Edge, no scroll | `body { overflow: hidden; height: 100vh }` global — clips StartScreen when content exceeds viewport |
| 2 | Contrast too weak in bright office lighting | Corporate theme `--bg-primary: #00010c` (near-black) + low-opacity borders/text |
| 3 | Landing visuals not noticed by players | NetworkBackground runs at 3–4% opacity; logo glow at 0.25 opacity — invisible in daylight |
| 4 | Breach bumper video (`ghostvideo.mp4`) unnoticed | Video plays at partial opacity inside a fast ~2.5s GSAP overlay — too brief, too dim |

---

## Fix 1 — Edge Scroll Bug

**Scope:** `src/app/globals.css`, `src/shared/components/OSShell.tsx` (or equivalent shell wrapper), `src/phases/onboarding/StartScreen.tsx`

**Change:**
- Remove `overflow: hidden; height: 100vh` from the global `body` rule in `globals.css`. The `OSShell` root div already has `h-screen w-screen overflow-hidden` directly on it (`OSShell.tsx:58`), so the body rule is redundant for all game phases — removing it is safe.
- Make `StartScreen`'s root element use `min-h-[100dvh]` (not `min-h-screen`) and a flex column that pushes the footer down naturally. Replace the `absolute bottom-8` footer with a static element inside a flex-col that has `flex-1` spacer or `justify-between` — no absolute positioning.

**Outcome:** Start screen scrolls on Edge when content exceeds viewport; all OSShell game phases remain locked via their own div styles.

---

## Fix 2 — Slate Mid-Tone Corporate Theme

**Scope:** `src/app/globals.css` — corporate theme CSS variables only. No component changes needed.

**Variable changes:**

| Variable | Before | After |
|----------|--------|-------|
| `--bg-primary` | `#00010c` | `#0f172a` |
| `--bg-secondary` | `#1e293b` | `#1e293b` (no change) |
| `--bg-tertiary` | `#334155` | `#334155` (no change) |
| `--bg-glass` | `rgba(255,255,255,0.06)` | `rgba(255,255,255,0.12)` |
| `--border` | `rgba(15,23,42,0.12)` | `rgba(15,23,42,0.20)` |
| `--border-strong` | `rgba(15,23,42,0.20)` | `rgba(15,23,42,0.32)` |
| `--text-muted` | `#64748b` | `#475569` |
| `--text-placeholder` | `#94a3b8` | `#64748b` |
| `--taskbar-text` | `#94a3b8` | `#64748b` |

All other corporate variables remain. Since every component uses CSS variables, this lifts contrast across the entire corporate phase with no component edits.

---

## Fix 3 — Landing Page Focused Spotlight

**Scope:** `src/phases/onboarding/StartScreen.tsx`, `src/shared/components/NetworkBackground.tsx` (removal)

**Changes:**

1. **Remove `<NetworkBackground />`** — delete the component import and usage from StartScreen. The scattered animated nodes are invisible in daylight and add render cost.

2. **Add radial spotlight** — replace with an inline `<div>` using a CSS radial gradient centered behind the logo area:
   ```css
   background: radial-gradient(ellipse 50% 40% at 50% 30%, rgba(59,130,246,0.18) 0%, transparent 70%);
   ```
   This is always visible even in a bright room.

3. **Corner bracket accents** — add 4 absolutely-positioned L-bracket shapes (thin 20px × 2px + 2px × 20px pairs) in each corner of the viewport, color `rgba(59,130,246,0.5)`. Pure CSS, no JS.

4. **Single slow scan line** — keep the existing scan line animation but increase opacity from `via-[rgba(0,229,51,0.03)]` to `via-[rgba(59,130,246,0.08)]` and slow duration from 8s to 12s. Subtle movement, readable in daylight.

5. **Logo glow boost** — in `BreachLogo`, change the idle `drop-shadow` filter from `rgba(0,229,51,0.25)` to `rgba(59,130,246,0.5)` (slate-theme blue matches corporate phase). Glitch state keeps its green glow.

**Note:** The `NetworkBackground` component file can stay on disk (it may be reused in breach phase) — just remove it from StartScreen.

---

## Fix 4 — Unmissable Breach Bumper

**Scope:** `src/shared/components/TransitionOverlay.tsx`

**Current timeline analysis:**
- Phase 1 — glitch bands: ~0.8s
- Phase 2 — dark tint (`rgba(0,0,0,0.72)`) + cursor blink: ~0.7s (video is almost invisible)
- Phase 3 — POST typewriter lines: ~1.5s
- Phase 4 — white flash + fade out: ~0.5s
- **Total ≈ 3.5s. Video is 5s and barely shows.**

The problem is not video opacity (video is already implicitly `opacity:1`). It is that Phase 2 immediately covers the video with a 72% black tint and moves on in under a second.

**Changes to the GSAP timeline (`TransitionOverlay.tsx`):**

1. **Reduce Phase 2 dark tint** — change `rgba(0,0,0,0.72)` to `rgba(0,0,0,0.35)`. The video bleeds through clearly at this level.

2. **Extend Phase 2 hold duration** — after the cursor blink, add a `tl.to({}, { duration: 3.5 })` hold before transitioning to Phase 3. This gives the 5s bumper ~4s of visible screen time (Phase 1 glitch plays over the video start, then Phase 2 holds while the main video plays).

3. **Glitch bands — full viewport** — each band's height is `${100 / bandCount}%` of the glitch layer, which is `inset:0` — already full viewport. Keep as-is. Increase `bandCount` from 8 to 12 for a denser flash.

4. **POST screen font** — increase `font-size` from `13px` to `15px`, add `line-height:1.8`. Keep existing content and typewriter logic.

5. **Total new duration ≈ 6.5s** — acceptable for a 5s bumper. White flash + fade still ends the sequence cleanly.

6. **No autoplay fallback needed** — video is already `muted + autoplay + playsInline`. Silent failure degrades gracefully to the glitch/POST sequence.

---

## Out of Scope

- WCAG screen reader support (game is not a public-facing product)
- Breach theme changes (breach theme contrast is intentionally extreme for effect)
- Debrief / ending page changes
- Trainer dashboard changes
- Any content changes

---

## Success Criteria

- [ ] Landing page bottom is reachable on Edge (no scroll clip)
- [ ] Corporate phase passes WCAG AA contrast ratio (4.5:1) for body text
- [ ] Landing page background visuals visible to someone standing 2m from a bright monitor
- [ ] Breach bumper video occupies ≥80% of the screen and plays for its full 5s duration before game phase loads
