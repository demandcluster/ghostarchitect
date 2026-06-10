"use client";

import { useState, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { OSShell } from "@/shared/components/OSShell";
import { DMSidebar } from "@/shared/components/DMSidebar";
import { useBreachTransition } from "@/shared/components/TransitionOverlay";
import { useStepTransition } from "@/shared/hooks/useStepTransition";
import { useGameStore, hydrateGameStore } from "@/stores/gameStore";
import { useScoreStore } from "@/stores/scoreStore";
import { useNarrativeStore } from "@/stores/narrativeStore";
import { getGameService } from "@/services/config/serviceConfig";
import dynamic from "next/dynamic";
const StartScreen = dynamic(
  () => import("@/phases/onboarding/StartScreen").then((m) => ({ default: m.StartScreen })),
  { ssr: false }
);
import { LoginScreen } from "@/phases/onboarding/LoginScreen";
import { Scoreboard } from "@/shared/components/Scoreboard";
import { WikiPanel } from "@/shared/components/WikiPanel";
import { MFAPuzzle } from "@/phases/onboarding/MFAPuzzle";
import { SimIntroScreen } from "@/phases/onboarding/SimIntroScreen";
import { EmailClient } from "@/phases/breach/EmailClient";
import { PasswordPuzzle } from "@/phases/breach/PasswordPuzzle";
import { EvilTwinWiFi } from "@/phases/breach/EvilTwinWiFi";
import { LogTerminal } from "@/phases/investigation/LogTerminal";
import { TaskManagerView } from "@/phases/investigation/TaskManagerView";
import { ContainmentDecision } from "@/phases/investigation/ContainmentDecision";
import { IOCExtraction } from "@/phases/investigation/IOCExtraction";
import { CredentialRotation } from "@/phases/investigation/CredentialRotation";
import { DebriefPage } from "@/phases/debrief/DebriefPage";
import { EndingPage } from "@/phases/ending/EndingPage";
import { resetRemarkCache } from "@/phases/ending/analystRemarks";
import {
  PRE_BREACH_EMAILS,
  BREACH_EMAILS,
  FILLER_EMAILS
} from "@/content/emails";
import {
  SOCIAL_ENGINEERING_DM,
  NPC_BAD_ADVICE,
  OFFICE_CHATTER_DMS
} from "@/content/dmScripts";
import { intersperseFiller, revealedWithFiller } from "@/content/fillerDMs";
import { LOG_ENTRIES } from "@/content/logEntries";
import { LOLBINS } from "@/content/fileListings";
import type { DMChoice, Email, LogEntry } from "@/content/types";

/**
 * Replace hardcoded "NexusCorp"/"nexuscorp.com" in static content with the
 * current team branding from the game store. This ensures the static fallback
 * content matches the team identity when no AI/pool content is available.
 */
/** Derives the typosquat version of a domain (.com→.co, .nl→.ml, else →.co) */
function typosquatDomain(domain: string): string {
  if (domain.endsWith(".com")) return domain.slice(0, -4) + ".co";
  if (domain.endsWith(".nl"))  return domain.slice(0, -3) + ".ml";
  return domain.replace(/\.[^.]+$/, ".co");
}

function brandEmails<T extends Email>(
  emails: T[],
  teamName: string,
  fakeDomain: string,
  playerHandle: string
): T[] {
  if (teamName === "NexusCorp" && fakeDomain === "nexuscorp.com") return emails;
  const fakeBase = fakeDomain.split(".")[0];
  const fakeTypo = typosquatDomain(fakeDomain);
  return emails.map((e) => {
    const json = JSON.stringify(e);
    const branded = json
      .replace(/nexuscorp-servicedesk\.com/gi, `${fakeBase}-servicedesk.com`)
      .replace(/nexuscorp-security\.com/gi, `${fakeBase}-security.com`)
      .replace(/nexuscorp-it\.com/gi, `${fakeBase}-it.com`)
      .replace(/nexuscorp\.co(?!m)/gi, fakeTypo)
      .replace(/nexuscorp\.com/gi, fakeDomain)
      .replace(/NexusCorp/g, teamName)
      .replace(/you@/g, `${playerHandle}@`);
    return JSON.parse(branded) as T;
  });
}

type GameStep =
  | "start"
  | "login"
  | "sim-intro"
  | "mfa"
  | "onboarding-portal"
  | "breach-email"
  | "breach-password"
  | "breach-wifi"
  | "investigation-containment"
  | "investigation-logs"
  | "investigation-lolbins"
  | "investigation-ioc"
  | "investigation-rotation"
  | "debrief"
  | "ending";

export default function Home() {
  // Always start with "start" so server and client render the same initial HTML
  // (React 19 throws on server/client mismatch). useLayoutEffect below restores
  // the saved step before the first paint — no visible flash.
  const [step, setStep] = useState<GameStep>("start");

  const [showScoreboard, setShowScoreboard] = useState(false);
  const setPhase = useGameStore((s) => s.setPhase);
  const setVisualMode = useGameStore((s) => s.setVisualMode);

  // Restore saved step + visual mode before the first paint (client-only).
  // useLayoutEffect is synchronous, so the user never sees the "start" flash.
  useLayoutEffect(() => {
    const breachSteps: GameStep[] = [
      "breach-email", "breach-password", "breach-wifi",
      "investigation-containment", "investigation-logs", "investigation-lolbins",
      "investigation-ioc", "investigation-rotation", "debrief",
    ];

    // Dev: ?step= URL param overrides localStorage
    if (process.env.NODE_ENV === "development") {
      const p = new URLSearchParams(window.location.search).get("step");
      if (p) {
        const devStep = p as GameStep;
        setStep(devStep);
        if (breachSteps.includes(devStep)) setVisualMode("breach");
        return;
      }
    }

    const savedStep = localStorage.getItem("ghost-architect:step");
    const savedSessionId = localStorage.getItem("ghost-architect:sessionId");
    if (savedStep && savedSessionId && savedStep !== "start" && savedStep !== "ending") {
      const restored = savedStep as GameStep;
      setStep(restored);
      if (breachSteps.includes(restored)) setVisualMode("breach");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // setStep and setVisualMode are stable — intentionally runs once on mount

  // Restore persisted player/team identity from localStorage after first render.
  // Must run after SSR hydration to avoid server/client HTML mismatch.
  useEffect(() => { hydrateGameStore(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const teamName = useGameStore((s) => s.teamName);
  const fakeDomain = useGameStore((s) => s.fakeDomain);
  const gameStore = useGameStore();
  const { trigger: triggerBreach } = useBreachTransition();

  const playerHandle = useGameStore((s) => s.playerHandle) || "User";

  // Brand static emails with current team identity
  const brandedPreEmails = useMemo(
    () =>
      brandEmails(
        [...PRE_BREACH_EMAILS, ...FILLER_EMAILS.slice(0, 2)],
        teamName,
        fakeDomain,
        playerHandle
      ),
    [teamName, fakeDomain, playerHandle]
  );
  const brandedBreachEmails = useMemo(
    () =>
      brandEmails(
        [...BREACH_EMAILS, ...FILLER_EMAILS.slice(2)],
        teamName,
        fakeDomain,
        playerHandle
      ),
    [teamName, fakeDomain, playerHandle]
  );

  // Hydrate team branding from API if localStorage has stale defaults
  const teamId = useGameStore((s) => s.teamId);
  const setTeamName = useGameStore((s) => s.setTeamName);
  const setFakeDomain = useGameStore((s) => s.setFakeDomain);
  const setLogoUrl = useGameStore((s) => s.setLogoUrl);
  useEffect(() => {
    if (!teamId || (teamName !== "NexusCorp" && fakeDomain !== "nexuscorp.com"))
      return;
    fetch(`/api/v1/teams/${teamId}/info`)
      .then((r) => (r.ok ? r.json() : null))
      .then((team) => {
        if (!team) return;
        if (team.name) setTeamName(team.name);
        if (team.fakeDomain) setFakeDomain(team.fakeDomain);
        if (team.logoUrl) setLogoUrl(team.logoUrl);
      })
      .catch(() => {});
  }, [teamId, teamName, fakeDomain, setTeamName, setFakeDomain, setLogoUrl]);

  const adjustTrust = useScoreStore((s) => s.adjustTrust);
  const addAction = useScoreStore((s) => s.addAction);
  const categoryScores = useScoreStore((s) => s.categoryScores);
  const addFlag = useNarrativeStore((s) => s.addFlag);
  const addTimelineEntry = useNarrativeStore((s) => s.addTimelineEntry);
  const revealedDmIds = useNarrativeStore((s) => s.revealedDmIds);
  const setRevealedDmIds = useNarrativeStore((s) => s.setRevealedDmIds);
  const npcDmIndex = useNarrativeStore((s) => s.npcDmIndex);
  const setNpcDmIndex = useNarrativeStore((s) => s.setNpcDmIndex);

  // Sync scores to backend whenever category scores change (debounced 1s).
  // Triggers the SSE leaderboard broadcast so the trainer dashboard updates live.
  const scoreSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionId = useGameStore((s) => s.sessionId);
  useEffect(() => {
    if (!sessionId || !teamId) return;
    if (scoreSyncTimerRef.current) clearTimeout(scoreSyncTimerRef.current);
    scoreSyncTimerRef.current = setTimeout(async () => {
      try {
        const service = await getGameService();
        const totalScore = Object.values(categoryScores).reduce((a, b) => a + b, 0);
        await service.updateSession(sessionId, {
          // phaseScores stores the per-category scores so the trainer dashboard
          // can display them by category (phishingIQ, passwordHygiene, etc.)
          phaseScores: categoryScores as Record<string, number>,
          totalScore,
        });
      } catch { /* silently ignore — score sync is best-effort */ }
    }, 1000);
    return () => {
      if (scoreSyncTimerRef.current) clearTimeout(scoreSyncTimerRef.current);
    };
  }, [sessionId, teamId, categoryScores]); // eslint-disable-line react-hooks/exhaustive-deps

  const [showWiki, setShowWiki] = useState(false);
  const [wikiTab, setWikiTab] = useState<
    "social-engineering" | "network-security" | "incident-response"
  >("social-engineering");

  const [dmDone, setDmDone] = useState(false);
  const dmInteractionsDoneRef = useRef(0);
  const [flaggedLogs, setFlaggedLogs] = useState<LogEntry[]>([]);
  const [logAnalysisResult, setLogAnalysisResult] = useState<{
    correctFlags: number;
    falseFlags: number;
    missed: number;
    points: number;
  } | null>(null);
  const { changeStep } = useStepTransition(setStep);

  // Filler DMs: merge office chatter into DM streams
  const [aiChatterDMs, setAiChatterDMs] = useState<typeof OFFICE_CHATTER_DMS>(
    []
  );
  useEffect(() => {
    fetch("/api/v1/content/chatter")
      .then((r) => (r.ok ? r.json() : []))
      .then((dms) => {
        if (Array.isArray(dms) && dms.length > 0) setAiChatterDMs(dms);
      })
      .catch(() => {});
  }, []);
  const fillerPool =
    aiChatterDMs.length > 0 ? aiChatterDMs : OFFICE_CHATTER_DMS;
  const mergedSocialDMs = useMemo(
    () => intersperseFiller(SOCIAL_ENGINEERING_DM, fillerPool),
    [fillerPool]
  );
  const mergedNpcDMs = useMemo(
    () => intersperseFiller(NPC_BAD_ADVICE, fillerPool.slice(3)),
    [fillerPool]
  );

  // Persist step so returning players resume where they left off
  useEffect(() => {
    if (step === "start" || step === "ending") {
      localStorage.removeItem("ghost-architect:step");
      return;
    }
    localStorage.setItem("ghost-architect:step", step);
  }, [step]);


  // Generate a session ID on first interaction
  useEffect(() => {
    if (step === "start") return;
    if (gameStore.sessionId) return;
    gameStore.setSessionId(crypto.randomUUID());
  }, [step, gameStore]);


  // Reveal the first social-engineering DM once the portal is reached.
  // Lives here (not in MFA's onComplete) so a refresh at onboarding-portal
  // before the reveal fired cannot strand the player with an empty sidebar.
  useEffect(() => {
    if (step !== "onboarding-portal") return;
    if (revealedDmIds.length > 0) return;
    const timer = setTimeout(() => {
      if (useNarrativeStore.getState().revealedDmIds.length === 0) {
        setRevealedDmIds([SOCIAL_ENGINEERING_DM[0].id]);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [step, revealedDmIds.length, setRevealedDmIds]);

  // Restore DM completion progress after a refresh — dmDone/dmInteractionsDoneRef
  // are component state, but answered choices live in the persisted timeline.
  useEffect(() => {
    const answered = new Set(
      useNarrativeStore
        .getState()
        .timeline.filter((t) => t.phase === "onboarding" && t.decisionKey)
        .map((t) => t.decisionKey)
    ).size;
    dmInteractionsDoneRef.current = answered;
    if (answered >= 4) setDmDone(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // runs once on mount, after persist rehydration

  // Auto-reveal informational DMs in a chain
  useEffect(() => {
    if (
      ![
        "onboarding-portal",
        "breach-email",
        "breach-password",
        "breach-wifi"
      ].includes(step)
    )
      return;
    if (revealedDmIds.length === 0) return;

    const lastId = revealedDmIds[revealedDmIds.length - 1];
    const dms = SOCIAL_ENGINEERING_DM;
    const currentMsg = dms.find((m) => m.id === lastId);

    // If it's an informational message (no choices) and points to another message
    if (
      currentMsg &&
      (!currentMsg.choices || currentMsg.choices.length === 0) &&
      (currentMsg as { nextMessageId?: string }).nextMessageId
    ) {
      const nextId = (currentMsg as { nextMessageId?: string }).nextMessageId;
      console.log(
        "[DM Auto-reveal] last msg:",
        lastId,
        "has no choices, chaining to:",
        nextId,
        "msg choices:",
        currentMsg.choices
      );
      if (nextId && !revealedDmIds.includes(nextId)) {
        const timer = setTimeout(() => {
          setRevealedDmIds([...revealedDmIds, nextId]);
        }, 2500); // Delay for reading
        return () => clearTimeout(timer);
      }
    }
  }, [revealedDmIds, step]);

  const handleDMChoice = useCallback(
    (messageId: string, choice: DMChoice) => {
      const dms = SOCIAL_ENGINEERING_DM;
      const currentMsg = dms.find((m) => m.id === messageId);
      const complexity = currentMsg?.complexity || 5;
      const complexityMultiplier = complexity / 5;

      // Game logic: correct choice = +10 trust, wrong choice = -10 trust
      const trustAdjustment = choice.isCorrect ? 10 : -10;
      adjustTrust(trustAdjustment);

      if (choice.scoreEffect) {
        addAction({
          id: `dm-${messageId}-${choice.id}`,
          category: choice.scoreEffect.category,
          points: Math.round(choice.scoreEffect.points * complexityMultiplier),
          maxPoints: Math.round(
            choice.scoreEffect.maxPoints * complexityMultiplier
          ),
          label: choice.label
        });
      }
      if (choice.flag) addFlag(choice.flag);

      addTimelineEntry({
        id: `dm-${messageId}`,
        phase: "onboarding",
        description: `DM response: "${choice.label}"`,
        decisionKey: messageId
      });

      // Threading fix: Add the reply ID to revealed IDs immediately.
      // This preserves chronological discovery order.
      // Read the current list from the store — this callback is memoized with
      // stable deps only, so the `revealedDmIds` prop value would be stale here.
      if (choice.nextMessageId) {
        const current = useNarrativeStore.getState().revealedDmIds;
        setRevealedDmIds(
          current.includes(choice.nextMessageId)
            ? current
            : [...current, choice.nextMessageId]
        );
      }

      // Track completion — ref avoids unnecessary re-renders
      dmInteractionsDoneRef.current += 1;
      if (dmInteractionsDoneRef.current >= 4) {
        setDmDone(true);
      }
    },
    [
      adjustTrust,
      addAction,
      addFlag,
      addTimelineEntry,
      setRevealedDmIds,
      setDmDone
    ]
  );

  const handleNpcChoice = useCallback(
    (messageId: string, choice: DMChoice) => {
      const npcDms = NPC_BAD_ADVICE;
      const currentMsg = npcDms.find((m) => m.id === messageId);
      const complexity = currentMsg?.complexity || 5;
      const complexityMultiplier = complexity / 5;

      // Game logic: correct choice = +10 trust, wrong choice = -10 trust
      const trustAdjustment = choice.isCorrect ? 10 : -10;
      adjustTrust(trustAdjustment);

      if (choice.scoreEffect) {
        addAction({
          id: `npc-${messageId}-${choice.id}`,
          category: choice.scoreEffect.category,
          points: Math.round(choice.scoreEffect.points * complexityMultiplier),
          maxPoints: Math.round(
            choice.scoreEffect.maxPoints * complexityMultiplier
          ),
          label: choice.label
        });
      }
      if (choice.flag) addFlag(choice.flag);

      addTimelineEntry({
        id: `npc-${messageId}`,
        phase: "investigation",
        description: `NPC advice response: "${choice.label}"`,
        decisionKey: messageId
      });

      // Reveal next NPC after delay
      setTimeout(() => {
        const npcDms = NPC_BAD_ADVICE;
        if (npcDmIndex < npcDms.length - 1) {
          setNpcDmIndex(npcDmIndex + 1);
        }
      }, 1000);
    },
    [adjustTrust, addAction, addFlag, addTimelineEntry, npcDmIndex]
  );

  const handleEmailComplete = useCallback(
    async (results: Record<string, string>) => {
      const emails = brandedBreachEmails;
      console.log("[handleEmailComplete] emails count:", emails.length);
      const phishingEmails = emails.filter((e) => e.isPhishing);
      const correctPhishing = phishingEmails.filter(
        (e) => results[e.id] === "phishing"
      ).length;
      const safeEmails = emails.filter((e) => !e.isPhishing);
      const correctSafe = safeEmails.filter(
        (e) => results[e.id] === "safe"
      ).length;

      const total = correctPhishing + correctSafe;
      const max = emails.length;
      const wrongCount = max - total;

      // Calculate average complexity
      const avgComplexity =
        emails.length > 0
          ? emails.reduce((sum, e) => sum + (e.complexity || 5), 0) /
            emails.length
          : 5;
      const complexityMultiplier = avgComplexity / 5;

      const points = Math.max(
        0,
        Math.round((total * 12 - wrongCount * 8) * complexityMultiplier)
      );

      addAction({
        id: "email-triage",
        category: "phishingIQ",
        points,
        maxPoints: 125,
        label: `Email triage: ${total}/${max} correct`
      });

      if (correctPhishing === phishingEmails.length) {
        addFlag("caught_all_phishing");
      }

      addTimelineEntry({
        id: "email-triage",
        phase: "breach",
        description: `Email triage completed: ${total}/${max} correct`
      });

      await changeStep("breach-password");
    },
    [addAction, addFlag, addTimelineEntry, changeStep, brandedBreachEmails]
  );

  const mergedRevealedIds = useMemo(
    () => revealedWithFiller(revealedDmIds, mergedSocialDMs),
    [revealedDmIds, mergedSocialDMs]
  );

  // Full reset for replay/exit: Home never unmounts (OSShell is keyed by step,
  // not the page), so component state must be cleared alongside the stores.
  const resetGame = useCallback(() => {
    useScoreStore.getState().reset();
    useNarrativeStore.getState().reset();
    useGameStore.getState().reset();
    resetRemarkCache();
    localStorage.removeItem("ghost-architect:step");
    setDmDone(false);
    dmInteractionsDoneRef.current = 0;
    setFlaggedLogs([]);
    setLogAnalysisResult(null);
    setShowWiki(false);
    setShowScoreboard(false);
    setStep("start");
  }, []);

  // Start screen (full screen, no OS shell)
  if (step === "start") {
    return <StartScreen onStart={() => changeStep("sim-intro")} />;
  }

  if (step === "sim-intro") {
    return <SimIntroScreen onComplete={() => changeStep("login")} />;
  }

  // Login & MFA screens (full screen, no OS shell)
  if (step === "login") {
    return <LoginScreen onLogin={() => changeStep("mfa")} />;
  }

  if (step === "mfa") {
    return (
      <MFAPuzzle
        onComplete={() => {
          // First DM reveal is handled by the onboarding-portal effect above.
          changeStep("onboarding-portal");
        }}
      />
    );
  }

  // Build windows based on current step
  const windows = [];

  if (step === "onboarding-portal") {
    windows.push({
      id: "email",
      title: `${teamName} Mail`,
      content: <EmailClient emails={brandedPreEmails} onComplete={() => {}} />
    });
    windows.push({
      id: "welcome",
      title: `${teamName} Intranet`,
      content: (
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3 pb-4 border-b border">
            <div
              className="w-10 h-10 rounded flex items-center justify-center text-white font-bold text-sm select-none shrink-0"
              style={{ background: "var(--accent)" }}
            >
              {teamName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-base font-bold text-primary leading-tight">
                {teamName} Intranet Portal
              </h1>
              <p className="text-xs text-secondary">{fakeDomain}</p>
            </div>
          </div>

          {/* First Day Checklist */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-secondary mb-2">
              First Day Checklist
            </h2>
            <ul className="space-y-1.5 line-through">
              {[
                "Read welcome email",
                "Review security policy",
                "Complete MFA setup"
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-sm text-primary"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    className="shrink-0"
                    style={{ color: "var(--accent)" }}
                  >
                    <circle
                      cx="8"
                      cy="8"
                      r="7"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M5 8l2 2 4-4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Getting Started quick links */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-secondary mb-2">
              Getting Started
            </h2>
            <div className="flex gap-2">
              {(
                [
                  { label: "IT Helpdesk", tab: "incident-response" },
                  { label: "Security Portal", tab: "social-engineering" }
                ] as const
              ).map(({ label, tab }) => (
                <button
                  key={label}
                  onClick={() => {
                    setWikiTab(tab);
                    setShowWiki(true);
                  }}
                  className="px-3 py-1.5 rounded border border text-xs text-secondary bg-window-sunken hover:bg-window hover:text-primary transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {/*Next steps*/}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-secondary mb-2">
              Next steps
            </h2>
            For now, check your Slack messages!
          </div>

          {/* Continue button */}
          {dmDone && (
            <div className="pt-2 border-t border">
              <button
                onClick={async () => {
                  await triggerBreach();
                  await changeStep("breach-email");
                }}
                className="w-full px-4 py-2 rounded text-sm font-semibold text-white transition-colors"
                style={{ background: "var(--accent)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--accent-hover)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "var(--accent)")
                }
              >
                Continue to next task
              </button>
            </div>
          )}
        </div>
      )
    });
  }

  if (step === "breach-email") {
    windows.push({
      id: "email",
      title: `${teamName} Mail — INCIDENT MODE`,
      content: (
        <EmailClient
          emails={brandedBreachEmails}
          onComplete={handleEmailComplete}
        />
      )
    });
  }

  if (step === "breach-password") {
    windows.push({
      id: "password",
      title: "Password Reset Required",
      content: <PasswordPuzzle onComplete={() => changeStep("breach-wifi")} />
    });
  }

  if (step === "breach-wifi") {
    windows.push({
      id: "wifi",
      title: "Network Connection",
      content: (
        <EvilTwinWiFi
          networks={undefined}
          onComplete={async () => {
            addTimelineEntry({
              id: "breach-complete",
              phase: "breach",
              description: "Breach phase completed"
            });
            setPhase("investigation");
            await changeStep("investigation-containment");
          }}
        />
      )
    });
  }

  // Investigation phase
  if (step === "investigation-containment") {
    windows.push({
      id: "containment",
      title: "Containment Decision",
      content: (
        <ContainmentDecision
          onComplete={async () => {
            await changeStep("investigation-logs");
          }}
        />
      )
    });
  }

  if (step === "investigation-logs") {
    windows.push({
      id: "terminal",
      title: "Log Analysis Terminal",
      content: (
        <LogTerminal entries={LOG_ENTRIES} onFlaggedChange={setFlaggedLogs} />
      )
    });
    // Flagged events panel as second window
    windows.push({
      id: "flagged",
      title: `Flagged Events (${flaggedLogs.length})`,
      content: (
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-auto p-3">
            {flaggedLogs.length === 0 ? (
              <p className="text-xs text-muted">
                Click log lines to flag them for investigation.
              </p>
            ) : (
              <div className="space-y-2">
                {flaggedLogs.map((log, idx) => (
                  <div
                    key={`${log.id}-${idx}`}
                    className="p-2 bg-window-sunken rounded text-xs border border"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="font-bold"
                        style={{
                          color:
                            log.level === "CRITICAL" || log.level === "ERROR"
                              ? "#e63946"
                              : log.level === "WARN"
                                ? "#ffdd57"
                                : "#e0e0e0"
                        }}
                      >
                        [{log.level}]
                      </span>
                      <span className="text-muted">{log.timestamp}</span>
                    </div>
                    <div className="text-primary mt-1 font-mono text-[11px]">
                      {(log.message ?? "").slice(0, 100)}
                      {(log.message ?? "").length > 100 ? "..." : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {logAnalysisResult && (
              <div
                className={`mt-3 p-3 rounded text-xs border ${logAnalysisResult.correctFlags > logAnalysisResult.falseFlags ? "bg-[var(--success-subtle)] border-[var(--success)]/40" : "bg-[var(--danger-subtle)] border-[var(--danger)]/40"}`}
              >
                <p
                  className="font-bold"
                  style={{
                    color:
                      logAnalysisResult.correctFlags >
                      logAnalysisResult.falseFlags
                        ? "var(--success)"
                        : "var(--danger)"
                  }}
                >
                  {logAnalysisResult.correctFlags > logAnalysisResult.falseFlags
                    ? "Good analysis!"
                    : "Needs improvement"}
                </p>
                <p className="mt-1 text-[var(--text-secondary)]">
                  {logAnalysisResult.correctFlags} malicious entries correctly
                  flagged, {logAnalysisResult.falseFlags} false positive
                  {logAnalysisResult.falseFlags !== 1 ? "s" : ""}.
                  {logAnalysisResult.missed > 0 &&
                    ` ${logAnalysisResult.missed} malicious entries missed.`}
                </p>
                <p className="mt-1 font-mono text-[var(--accent)]">
                  +{logAnalysisResult.points}/25 forensic skill
                </p>
              </div>
            )}
          </div>
          <div className="p-3 border-t border-[var(--border)] shrink-0">
            {logAnalysisResult ? (
              <button
                onClick={() => changeStep("investigation-lolbins")}
                className="w-full py-2 bg-accent text-white rounded text-xs font-medium hover:bg-accent-hover"
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={() => {
                  const validatedLogs = LOG_ENTRIES;
                  const malicious = validatedLogs.filter((e) => e.isMalicious);
                  const correctFlags = flaggedLogs.filter(
                    (f) => f.isMalicious
                  ).length;
                  const falseFlags = flaggedLogs.filter(
                    (f) => !f.isMalicious
                  ).length;
                  const missed = malicious.length - correctFlags;
                  const points = Math.max(
                    0,
                    Math.round(
                      ((correctFlags - falseFlags) /
                        Math.max(malicious.length, 1)) *
                        25
                    )
                  );

                  addAction({
                    id: "log-analysis",
                    category: "forensicSkill",
                    points,
                    maxPoints: 25,
                    label: `Log analysis: ${correctFlags} correct flags, ${falseFlags} false positives`
                  });

                  addTimelineEntry({
                    id: "log-analysis",
                    phase: "investigation",
                    description: `Flagged ${flaggedLogs.length} log entries (${correctFlags} malicious)`
                  });

                  setLogAnalysisResult({
                    correctFlags,
                    falseFlags,
                    missed,
                    points
                  });
                }}
                className="w-full py-2 bg-accent text-white rounded text-xs font-medium hover:bg-accent-hover"
              >
                {flaggedLogs.length > 0
                  ? "Submit Flagged Events"
                  : "Continue →"}
              </button>
            )}
          </div>
        </div>
      )
    });
  }

  if (step === "investigation-lolbins") {
    const npcDms = NPC_BAD_ADVICE;
    const allNpcMessagesAnswered = npcDmIndex >= npcDms.length;

    windows.push({
      id: "taskmanager",
      title: "Task Manager — Process Analysis",
      content: (
        <div className="h-full flex flex-col">
          <div className="flex-1 overflow-auto">
            <TaskManagerView
              processes={LOLBINS}
              onComplete={() => changeStep("investigation-ioc")}
            />
          </div>
          {allNpcMessagesAnswered && (
            <div
              className="p-4 border-t"
              style={{ borderColor: "var(--border)" }}
            >
              <button
                onClick={() => changeStep("investigation-ioc")}
                className="w-full px-4 py-2 rounded text-sm font-semibold text-white transition-colors"
                style={{ background: "var(--accent)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--accent-hover)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "var(--accent)")
                }
              >
                Continue to IOC Analysis
              </button>
            </div>
          )}
        </div>
      )
    });
  }

  if (step === "investigation-ioc") {
    windows.push({
      id: "ioc",
      title: "IOC Documentation",
      content: (
        <IOCExtraction
          onComplete={() => changeStep("investigation-rotation")}
        />
      )
    });
  }

  if (step === "investigation-rotation") {
    windows.push({
      id: "rotation",
      title: "Post-Breach Response",
      content: (
        <CredentialRotation
          onComplete={async () => {
            addTimelineEntry({
              id: "investigation-complete",
              phase: "investigation",
              description: "Investigation phase completed"
            });
            setPhase("debrief");
            await changeStep("debrief");
          }}
        />
      )
    });
  }

  if (step === "debrief") {
    windows.push({
      id: "debrief",
      title: "Incident Debrief",
      content: <DebriefPage onContinue={() => changeStep("ending")} />
    });
  }

  // DM sidebar — onboarding uses social engineering, investigation uses NPC bad advice
  const isInvestigation = step.startsWith("investigation-");
  const dmSidebar =
    step === "onboarding-portal" ? (
      <DMSidebar
        messages={mergedSocialDMs}
        onChoice={handleDMChoice}
        revealedIds={mergedRevealedIds}
      />
    ) : isInvestigation ? (
      <DMSidebar
        messages={mergedNpcDMs.slice(
          0,
          npcDmIndex + 1 + Math.floor((npcDmIndex + 1) / 3)
        )}
        onChoice={handleNpcChoice}
        revealUpTo={npcDmIndex + 1 + Math.floor((npcDmIndex + 1) / 3)}
      />
    ) : undefined;

  // When wiki is open, add it as an extra window
  if (showWiki) {
    windows.push({
      id: "wiki",
      title: "Security Wiki",
      content: <WikiPanel key={wikiTab} initialTab={wikiTab} />
    });
  }

  return (
    <>
      {step === "ending" ? (
        <EndingPage onPlayAgain={resetGame} />
      ) : (
        <OSShell
          key={step}
          windows={windows}
          dmSidebar={dmSidebar}
          panelOpen={{ scoreboard: showScoreboard, wiki: showWiki }}
          onExit={resetGame}
          onAppClick={(appId) => {
            if (appId === "scoreboard") {
              setShowScoreboard((v) => !v);
            }
            if (appId === "wiki") {
              setShowWiki((v) => !v);
            }
          }}
        />
      )}

      {/* Floating scoreboard — bottom-left overlay */}
      <AnimatePresence>
        {showScoreboard && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-14 left-3 z-50 w-80 max-h-[60vh] rounded-lg border border-[var(--border)] bg-[var(--bg-window)] shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="h-8 flex items-center justify-between px-3 border-b border-[var(--border)] bg-[var(--bg-secondary)] shrink-0">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)]">
                Scoreboard
              </span>
              <button
                onClick={() => setShowScoreboard(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs transition-colors"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <Scoreboard />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
