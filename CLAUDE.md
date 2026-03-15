# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build (requires next build to pass without DB)
npm run type-check   # tsc --noEmit
npm run test         # Run all tests (vitest run)
npm run test:watch   # Watch mode
npm run lint         # ESLint

# Run a single test file
npx vitest run src/engine/rules.test.ts

# Run tests matching a pattern
npx vitest run --reporter=verbose -t "deriveFlags"

# Regenerate Prisma client after schema changes
npx prisma generate
```

## Architecture Overview

### Game Flow
The entire game is a single React page (`src/app/page.tsx`) driven by a `GameStep` string union. Steps advance linearly: `start → login → mfa → onboarding-portal → breach-email → breach-password → breach-wifi → investigation-containment → investigation-logs → investigation-lolbins → investigation-ioc → investigation-rotation → debrief`. There is no routing library — phase transitions are local state.

### Three Zustand Stores
All scoring and narrative logic flows through three stores in `src/stores/`:
- **gameStore** — current phase, visualMode (`corporate`|`breach`), sessionId, teamId, playerHandle
- **scoreStore** — trustScore (0–100), categoryScores (phishingIQ/passwordHygiene/networkSecurity/forensicSkill, max 25 each), append-only actions[]
- **narrativeStore** — decisions Record, flags Set\<string\>, timeline[]

Flags are string keys (e.g. `"caught_all_phishing"`, `"fell_for_social_engineering"`). The `deriveFlags()` function in `src/engine/rules.ts` is the single source of branching truth — it reads the flags Set and determines the ending (`promoted/lateral/neutral/fired`).

### Adapter Pattern (Offline ↔ API)
`src/services/gameService.ts` defines the `GameService` interface. `src/services/config/serviceConfig.ts` lazily loads either:
- `localStorageAdapter` — default, no backend required, `joinTeam` is a no-op
- `apiAdapter` — activated by `NEXT_PUBLIC_BACKEND_ENABLED=true`

Never call `fetch` directly from components or stores — use `getGameService()`.

### Theme System
`ThemeProvider` sets a `data-theme` attribute on `<html>`. CSS variables in `globals.css` drive all colors for both modes. The `TransitionOverlay` component (GSAP timeline) masks the Corporate→Breach mode switch: glitch bands → blackout → fake POST screen → new theme reveal. **GSAP** is used for this timeline; **Framer Motion** is used for component-level animations only.

### Backend (Next.js API Routes)
All routes live under `src/app/api/v1/`. Prisma client (`src/lib/prisma.ts`) returns `null` when `DATABASE_URL` is unset — routes call `requirePrisma()` which throws `NoDatabaseError`, caught and returned as 503. This allows `next build` and tests to pass without a database.

Trainer auth: JWT access token (15 min, memory only) + HttpOnly refresh cookie (7 days). Use `jose`, not `jsonwebtoken`. Middleware helper is `src/lib/auth.ts`.

### Real-Time Leaderboard
`src/lib/leaderboard.ts` holds a module-level `Map<teamId, Set<SSEWriter>>`. When `PATCH /api/v1/sessions/:id` is called, it triggers `computeAndBroadcastLeaderboard()` which pushes to all SSE clients for that team. **This is single-replica only.** Multi-replica requires Redis pub/sub (not yet implemented).

### Content
All game content (emails, log entries, DM scripts, LOLBins) lives in `src/content/*.ts` as strongly-typed arrays. Content is static — do not fetch it from an API. The `requiredFlags` field on content types enables branch-aware filtering without embedding logic in content files.

### Scoring
- 4 categories × 25 points max = 100 total (`src/engine/scoring.ts`)
- Response time bonus: up to +5 points for decisions under 30s
- Trust score is separate (0–100) and affects the ending calculation alongside category scores
- Penalise over-quarantining (flagging the legitimate PowerShell decoy) — sets `over_quarantined` flag

## Key Constraints

- **No Edge runtime** anywhere. All API routes run on Node.js (default). Do not add `export const runtime = 'edge'`.
- **`output: standalone`** in `next.config.ts` — required for the Docker image. Do not remove.
- **Prisma schema** is at `src/prisma/schema.prisma` (not the default `prisma/` root). Run `prisma generate` after any schema change.
- **Fake PII rules**: structurally invalid SSNs only (9xx prefix), fictional names, "SIMULATION — NO REAL DATA" watermark on the dark web ending screen. Never use real name/address/SSN formats.
- **Invite codes**: charset `BCDFGHJKLMNPQRSTVWXYZ0123456789` (no vowels). Validated by `isValidInviteCodeFormat()` in `src/lib/inviteCode.ts`.

## Deployment

The app deploys to a private Rancher RKE cluster. Kubernetes manifests are in `k8s/`. The `k8s/secret.yaml` contains placeholder values — fill in `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET` before deploying. The CI/CD pipeline (`.github/workflows/ci.yml`) builds the Docker image, pushes to a private registry, and applies manifests on push to `main`. Required GitHub secrets: `REGISTRY`, `REGISTRY_USERNAME`, `REGISTRY_PASSWORD`, `KUBECONFIG`.

PostgreSQL runs in-cluster. `DATABASE_URL` should point to the CloudNativePG service: `postgresql://user:pass@postgres-service.namespace.svc.cluster.local:5432/ghostarchitect`.
