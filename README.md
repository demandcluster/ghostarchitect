# The Ghost Architect

A cybersecurity educational browser game that teaches real-world security concepts through an immersive corporate breach investigation experience.

## Overview

**The Ghost Architect** is a browser-based cybersecurity training game that simulates a realistic corporate breach investigation. Players take on the role of an IT staff member who must:

1. **Onboarding** - Navigate corporate portal, handle MFA setup, spot social engineering attacks
2. **Triage Breach** - Analyze 10 phishing emails, check password security, identify Evil Twin WiFi access points
3. **Investigate** - Review system logs, analyze LOLBins processes, extract IOCs, make containment decisions
4. **Debrief** - Review performance metrics, see MITRE ATT&CK mappings, receive recognition

The game teaches practical security skills through hands-on decision-making rather than theoretical knowledge.

## Features

### Realistic OS Interface
- **Taskbar** with app icons (Email, Terminal, Task Manager, Scoreboard, Wiki)
- **Tiling windows** for multi-task workflows
- **Two visual themes:** Clean corporate portal → Dark breach mode
- **Smooth animations:** Framer Motion transitions, GSAP-powered breach reveal
- **Responsive design:** Works on desktop and tablet

### Gameplay Systems

#### Phase 1: Onboarding
- **MFA Puzzle:** Choose between authenticator app vs SMS - teaches phishing vulnerability
- **Social Engineering:** Spot DM messages with real security jargon, avoid bad advice
- **Corporate Portal:** Familiarize with company documentation and procedures

#### Phase 2: Breach Detection
- **Email Triage:** 10 emails to analyze (SPF/DKIM headers, sender verification, content evaluation)
- **Password Security:** Password entropy meter, MFA choice consequences
- **WiFi Security:** BSSID analysis, signal strength evaluation, WPA2-PSK vs 802.1X comparison

#### Phase 3: Investigation
- **Syslog Terminal:** Streaming log analysis with Ctrl+F intercept mechanic
- **LOLBins Task Manager:** Identify suspicious processes, quarantine potential threats
- **Containment Decision:** Stop the spread or risk business continuity
- **IOC Extraction:** Document attacker IPs, C2 infrastructure, malware hashes
- **Credential Rotation:** Rotate compromised credentials post-breach

#### Phase 4: Debrief
- **Radar Chart:** Visual breakdown of skills (Phishing IQ, Password Hygiene, Network Security, Forensic Skill)
- **Timeline Replay:** See how decisions affected the incident
- **MITRE ATT&CK Mapping:** Connect gameplay to real security frameworks
- **Multiple Endings:** Promoted, Lateral Move, Neutral, or Fired based on performance

### Scoring System

The game uses a detailed scoring model with **5 categories × 125 points = 500 maximum**:

| Category | Max Points | What It Measures |
|-----------|------------|------------------|
| Phishing IQ | 125 | Email triage (correct/incorrect), social engineering decisions |
| Password Hygiene | 125 | MFA choice, password entropy tiers, password policies |
| Network Security | 125 | WiFi selection, containment decisions |
| Forensic Skill | 125 | LOLBins analysis, IOC extraction, credential rotation |

**Time Bonus:** Up to +25 points total for fast decisions (under 120s window)

**Ranks:** Based on final score (0-500)
- 🥉 Bronze: 0-249 points
- 🥈 Silver: 250-399 points
- 🥇 Gold: 400-449 points
- 🏆 Platinum: 450-500 points

## Tech Stack

### Frontend
- **Framework:** Next.js 16.1.6 (App Router, Server Components)
- **Runtime:** Node.js (no Edge runtime)
- **UI Library:** React 18 with TypeScript
- **Styling:** Tailwind CSS with custom CSS variables for theming
- **Animations:** Framer Motion (UI transitions), GSAP (breach reveal)
- **State Management:** Zustand stores (gameStore, scoreStore, narrativeStore)
- **Icons:** SVG icons for taskbar and UI elements

### Backend
- **API Routes:** Next.js API routes under `/api/v1/`
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** JWT access tokens with HttpOnly refresh cookies (using `jose`)
- **Player Identity:** AnonymousId UUID in localStorage (no auth required)
- **Invite Codes:** 6-char consonants+digits, crypto-random, no vowels
- **Leaderboard:** Real-time SSE streaming per team

### Content & Game Logic
- **Scoring Engine:** `/src/engine/scoring.ts` - computes scores from decisions and actions
- **Rule Engine:** `/src/engine/rules.ts` - derives flags and determines endings
- **Content Arrays:** Strongly-typed arrays for emails, DM scripts, log entries, LOLBins
- **Theme System:** CSS variables with data-theme attribute for corporate/breach modes

### Testing
- **Framework:** Vitest
- **Type Checking:** TypeScript (tsc --noEmit)
- **Linting:** ESLint
- **Test Location:** Tests alongside source files using `__tests__` directories

## Installation & Running

### Prerequisites
- Node.js 20+ (recommended 18 or 20)
- npm or yarn package manager
- PostgreSQL 13+ (optional, for backend features)

### Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The game will be available at http://localhost:3000

### Available Scripts

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run type-check   # TypeScript type checking
npm run test         # Run all tests
npm run test:watch   # Tests in watch mode
npm run lint         # Run ESLint

# Generate Prisma client (after schema changes)
npx prisma generate
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Database (required for backend features)
DATABASE_URL="postgresql://user:password@localhost:5432/ghostarchitect"

# JWT secrets (required for trainer auth)
JWT_SECRET="your-secret-min-32-chars"
JWT_REFRESH_SECRET="your-refresh-secret-min-32-chars"
```

### Production Build

```bash
npm run build
```

The production build uses `output: "standalone"` configuration for Docker deployment.

### Docker Deployment

The project includes Docker configuration for deployment to a Kubernetes cluster:

```bash
# Build Docker image
docker build -t ghostarchitect:latest .

# Run container
docker run -p 3000:3000 -e DATABASE_URL="..." ghostarchitect:latest
```

**Kubernetes manifests:** Located in `/k8s/` directory for deployment to Rancher RKE clusters.

### Trainer Features

When `NEXT_PUBLIC_BACKEND_ENABLED=true`, the game connects to a backend for:

- **Team Management:** Trainers create teams with invite codes
- **Real-time Leaderboard:** SSE streaming of team scores during gameplay
- **Score Persistence:** Player scores saved to database
- **Session Management:** Track player sessions and progress

## Credits

### Development

**Developed and Designed by:**
- **Demandcluster BV** - https://demandcluster.com

### Security Consultation

**Cybersecurity Specialist:**
- **Ron van Etten** - Security advisor and consultant

### License

This educational game is designed for cybersecurity awareness training. All scenarios, characters, and security concepts are fictionalized for educational purposes.

## Learning Objectives

The Ghost Architect is designed to teach players:

- **Phishing Awareness:** Spot suspicious emails, verify senders, check headers
- **Password Security:** Understand password entropy, MFA importance, secure practices
- **Network Security:** Identify suspicious WiFi access points, understand WPA2 vs 802.1X
- **Digital Forensics:** Analyze logs, identify suspicious processes, extract indicators of compromise
- **Incident Response:** Containment vs. eradication tradeoffs, credential rotation, communication
- **SOC Reporting:** Timeline documentation, evidence preservation, proper escalation

## Contributing

This is a focused educational cybersecurity game. For bug reports, feature suggestions, or security issues, please contact the development team.

## Resources

- **Next.js:** https://nextjs.org/docs
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Zustand:** https://zustand-demo.pmnd.rs/
- **Prisma:** https://www.prisma.io/docs
- **Framer Motion:** https://www.framer.com/motion
- **GSAP:** https://greensock.com/gsap/

---

Made with ❤️ for cybersecurity education
