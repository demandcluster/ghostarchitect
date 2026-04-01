# Trainer Terms of Service — Design Spec

**Date:** 2026-04-01
**Status:** Approved
**Author:** Ron van Etten / Demandcluster B.V.

---

## Context

The trainer registration form at `/trainer` includes a Terms of Service checkbox with a broken link (styled `<span>`, no `href`). This spec covers the content, structure, and implementation of the terms page.

## Scope

Trainer-only B2B terms. Player-facing privacy is already handled by the in-game privacy modal (anonymous UUID, no personal data collected). These terms gate trainer account registration only.

## Legal Entity

**Demandcluster B.V.**, Diemen, Netherlands
Contact: enquiries@ghostarchitectgame.com
Governing law: Netherlands, jurisdiction: Amsterdam

## Content Structure (Approach C — plain language + legal anchors)

12 sections designed to give security/procurement teams enough substance for a security annex:

1. **Definitions** — Platform, Trainer, Organisation, Team/Session, Participant
2. **Grant of Use** — Free, non-exclusive, non-transferable, training purposes only
3. **Acceptable Use** — Training only; no real phishing/social engineering; no reselling; white-labelling via dashboard is explicitly permitted
4. **Participants** — Not registered; join via invite code; trainers must inform participants to use first name/pseudonym only; trainer responsible for audience suitability
5. **Data Processing** — No participant personal data collected; trainer stores email + hashed password only; team deletion is instant and permanent; sub-processors listed (see below)
6. **Intellectual Property** — Platform content owned by Demandcluster; trainer branding assets remain trainer's property
7. **Availability** — No formal SLA; fully redundant 2+1 configuration across Hetzner (DE) and OVH (FR)
8. **Limitation of Liability** — As-is, to maximum extent permitted by Dutch law
9. **Termination** — Demandcluster may terminate for violations; trainer may delete account and all data at any time (instant)
10. **Governing Law & Jurisdiction** — Netherlands, Amsterdam courts
11. **Changes** — Effective date updated; continued use = acceptance
12. **Contact** — Demandcluster B.V., Diemen, enquiries@ghostarchitectgame.com

## Sub-Processors

| Sub-processor | Role | Location |
|---|---|---|
| Hetzner Online GmbH | Bare-metal hosting | Germany (EU) |
| OVH SAS | Bare-metal hosting | France (EU) |
| Cloudflare Inc. | Ingress / Zero Trust proxy | US (EU SCCs apply) |

All servers are bare-metal (not shared cloud). No third-party SaaS touches user data.

## Implementation

- **Route:** `/terms` — new Next.js page at `src/app/terms/page.tsx`
- **Layout:** `src/app/terms/layout.tsx` — same scroll-unlock pattern as `/about`
- **Style:** Dark theme matching `/about` (background `#050709`, accent `#00e533`, framer-motion stagger)
- **Link fix:** `src/app/trainer/page.tsx` — replace the `<span>` with a `<Link href="/terms" target="_blank">` so it opens in a new tab without losing the registration form
- **Preamble note:** Encourages trainers to actually read the terms and share section 5 with their security team

## Non-Goals

- No player-facing terms (handled by privacy modal)
- No billing/refund language (free forever)
- No formal DPA document (available on request via email)
- No cookie policy (no analytics, no tracking cookies)
