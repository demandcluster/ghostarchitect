# Ending Page Redesign — Classified Stamp + Incident Report

Supersedes: `2026-03-22-ending-page-design.md`

## Summary

Replace the current flat ending screen with a three-act cinematic reveal: suspense typewriter → classified stamp verdict flash → branded internal incident report document. The verdict (PROMOTED/FIRED/LATERAL/NEUTRAL) is the hero moment. The incident report uses team branding and playerHandle, and includes a quirky AI-generated analyst remark about a key decision.

## Data Flow

EndingPage reads directly from zustand stores (consistent with other phase components):
- `useGameStore` → `teamName`, `fakeDomain`, `playerHandle`, `ending` (derived)
- `useScoreStore` → `categoryScores` (phishingIQ, passwordHygiene, networkSecurity, forensicSkill)
- `useNarrativeStore` → `flags` (Set\<string\>)

The parent (`page.tsx`) passes only `onPlayAgain` callback as a prop. All other data is store-driven.

The AI remark API call fires at mount (start of Act 1) so the response arrives well before Act 3 renders the document (~4.5s later). If the call hasn't resolved by Act 3 render time, use the static fallback immediately — no loading state, no swap.

## Game Step

No change — uses existing `"ending"` step after `"debrief"`.

## Three-Act Flow

### Act 1: Blackout + Typewriter (0–3s)

- Full-screen black background
- Single monospace line types out character by character (35ms/char): `"Incident #GA-2026-0847 — Final disposition pending..."`
- Blinking cursor during typing
- Case number is static (cosmetic, not derived from real data)

### Act 2: Classified Stamp (3–4.5s)

- Typewriter fades out (300ms)
- Brief white screen flash (100ms)
- Stamp slams in center-screen with GSAP spring animation:
  - Scale from 1.8→1.0 with overshoot
  - Rotation from -15°→-6° with settle
  - Duration ~400ms
- Stamp visual: bordered rectangle (4px solid, 8px radius), slightly rotated (-6°), verdict word in large bold caps (56px, 900 weight, 10px letter-spacing)
- Radial glow behind stamp (verdict color at 15% opacity)
- Glow pulses once (opacity 0.15→0.3→0.15, 600ms)
- Subtitle fades in below: new title/consequence (e.g., "SENIOR SECURITY ANALYST")
- Case number in top-right corner (9px monospace, 15% white)
- Holds for ~1.5s

**Stamp colors by verdict:**

| Verdict | Color | Subtitle |
|---------|-------|----------|
| PROMOTED | `#22c55e` (green) | "Senior Security Analyst" |
| LATERAL | `#3b82f6` (blue) | "Transferred to Security Operations" |
| NEUTRAL | `#a1a1aa` (gray) | "Investigation Concluded" |
| FIRED | `#ef4444` (red) | "Security Clearance Revoked" |

### Act 3: Incident Report (4.5s+)

- GSAP owns the Act 2→3 crossfade (stamp fade out + backdrop color transition, 500ms). Framer Motion owns the document entry and section staggers within Act 3.
- Crossfade into dark backdrop (`#111`) with centered paper document
- Document slides up from y:40px with opacity fade (600ms, easeOut)
- Sections animate in top-to-bottom with 100ms stagger

**Document structure:**

1. **Header bar** — Dark (`#1e293b`) background, team name (bold, sans-serif, letter-spaced) + "Internal Security Division" subtitle on left. "CLASSIFICATION: CONFIDENTIAL" on right in amber.

2. **Title block** — "INCIDENT RESPONSE REPORT" with case number, classification, date (today's date via `new Date().toLocaleDateString()`). Separated by 2px bottom border.

3. **Personnel row** — Three columns: Responding Analyst (playerHandle), Division (teamName — SOC), Disposition (verdict in verdict color).

4. **Executive Summary** — 2-3 sentence paragraph using teamName and playerHandle. Content varies by verdict:
   - PROMOTED: "successfully containing the breach within 47 minutes with zero data exfiltration confirmed"
   - LATERAL: "contained the breach with minor procedural deviations noted"
   - NEUTRAL: "investigation concluded with mixed results; further training recommended"
   - FIRED: "breach resulted in exfiltration of 4,500 records; containment protocols were not followed"

5. **Performance Assessment** — 2x2 grid showing the 4 category scores (phishingIQ, passwordHygiene, networkSecurity, forensicSkill) as `X/25` in light gray boxes.

6. **Analyst Note** — Amber left-bordered callout box with quirky remark about a key decision. See "Analyst Remark System" section below.

7. **Footer** — "This document is the property of {teamName}. Unauthorized distribution prohibited." + "Page 1 of 1"

8. **Faded stamp watermark** — Verdict word in verdict color at 40% opacity, rotated -12°, positioned bottom-right of document.

9. **CONFIDENTIAL watermark** — Large rotated text at 4% black opacity, centered on document.

**Paper styling:** `background: #f8f7f4`, `box-shadow: 0 8px 40px rgba(0,0,0,0.5)`, `font-family: Georgia, serif`, `max-width: 520px`, `border-radius: 4px`.

### Post-Reveal

- Confetti burst for PROMOTED and LATERAL endings only (canvas-confetti, 150 particles, colors: `[verdictColor, '#ffffff', '#fbbf24']`)
- "Play Again" button fades in below document (1s after document fully visible)
- TrophyBadge modal still triggers with 1s delay as before
- Cliffhanger teasers and credits from the old EndingPage are intentionally removed — the incident report is the complete ending

### FIRED Variant

For the FIRED ending, the document restyled:
- Header bar uses `#7f1d1d` (dark red) instead of `#1e293b`
- Executive summary references data exfiltration
- Additional section: "Data Exposure Summary" — the fake dark web listing with "SIMULATION — NO REAL DATA" watermark (moved from current EndingPage)
- No confetti

## Analyst Remark System

A quirky 1-2 sentence remark in the "ANALYST NOTE" callout, referencing the player's most notable decision.

### AI Path (preferred)

After the game ends, call `GET /api/v1/content/analyst-remark?flags=clicked_phishing_link,chose_strong_password&handle=Nacho&verdict=promoted`.

The endpoint sends the flags + handle + verdict to OpenAI with a prompt like: "Write a single witty, dry-humor 1-2 sentence analyst note for an incident report about {handle}. They {flag description}. Keep it professional but funny, like a tired security analyst writing notes at 2am."

Returns `{ remark: "..." }`. If it fails, returns empty and the client uses the fallback.

### Fallback Map (static)

Priority order: negative flags first (funnier), then positive, then generic.

| Flag | Remark |
|------|--------|
| `clicked_phishing_link` | "Clicked a phishing link. The attacker sends their regards." |
| `fell_for_social_engineering` | "Handed credentials to a vendor impersonator within 30 seconds. We've updated the gullibility benchmarks accordingly." |
| `over_quarantined` | "Quarantined PowerShell. The sysadmins would like a word." |
| `gave_creds_to_vendor` | "Shared their password with a stranger on the internet. Boldly going where no security policy wanted them to go." |
| `chose_strong_password` | "Selected a 128-bit passphrase. The password cracker filed a formal complaint." |
| `caught_all_phishing` | "Flagged every phishing email without breaking a sweat. We're checking if they wrote the phishing emails." |
| `avoided_evil_twin` | "Spotted the evil twin AP by BSSID alone. Either well-trained or deeply paranoid. Both useful." |
| `extracted_all_iocs` | "Extracted all six IOCs in under two minutes. The threat actor is requesting a transfer." |
| _(no notable flags)_ | "Performed adequately. HR has no further comment at this time." |

Selection logic: iterate the flag list in priority order, pick the first match from the player's flags Set.

## Files to Modify

| File | Change |
|------|--------|
| `src/phases/ending/EndingPage.tsx` | Full rewrite — three-act flow with stamp + incident report |
| `src/app/api/v1/content/analyst-remark/route.ts` | New — lightweight AI endpoint for quirky remark |
| `src/phases/ending/IncidentReport.tsx` | New — the branded document component |
| `src/phases/ending/ClassifiedStamp.tsx` | New — the stamp animation component |
| `src/phases/ending/analystRemarks.ts` | New — static fallback remark map + selection logic |

## Dependencies

- GSAP (already in project) for stamp spring animation
- Framer Motion (already in project) for section stagger animations
- canvas-confetti (already in project) for celebration
- OpenAI client (already in project) for analyst remark generation

## Accessibility

When `prefers-reduced-motion` is active, skip Acts 1 and 2 entirely — render the incident report document immediately with no typewriter, stamp, or stagger animations.
