"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { isLikelyBot } from "@/lib/botDetection";
import { OSShell } from "@/shared/components/OSShell";
import { DMSidebar } from "@/shared/components/DMSidebar";
import { useBreachTransition } from "@/shared/components/TransitionOverlay";
import { useStepTransition } from "@/shared/hooks/useStepTransition";
import { useGameStore } from "@/stores/gameStore";
import { useScoreStore } from "@/stores/scoreStore";
import { useNarrativeStore } from "@/stores/narrativeStore";
import { StartScreen } from "@/phases/onboarding/StartScreen";
import { LoginScreen } from "@/phases/onboarding/LoginScreen";
import { Scoreboard } from "@/shared/components/Scoreboard";
import { WikiPanel } from "@/shared/components/WikiPanel";
import { MFAPuzzle } from "@/phases/onboarding/MFAPuzzle";
import { EmailClient } from "@/phases/breach/EmailClient";
import { PasswordPuzzle } from "@/phases/breach/PasswordPuzzle";
import { EvilTwinWiFi } from "@/phases/breach/EvilTwinWiFi";
import { LogTerminal } from "@/phases/investigation/LogTerminal";
import { TaskManagerView } from "@/phases/investigation/TaskManagerView";
import { ContainmentDecision } from "@/phases/investigation/ContainmentDecision";
import { IOCExtraction } from "@/phases/investigation/IOCExtraction";
import { CredentialRotation } from "@/phases/investigation/CredentialRotation";
import { DebriefPage } from "@/phases/debrief/DebriefPage";
import { PRE_BREACH_EMAILS, BREACH_EMAILS } from "@/content/emails";
import { SOCIAL_ENGINEERING_DM, NPC_BAD_ADVICE } from "@/content/dmScripts";
import { LOG_ENTRIES } from "@/content/logEntries";
import { LOLBINS } from "@/content/fileListings";
import type { DMChoice, LogEntry } from "@/content/types";
import { ContentLoadingScreen } from "@/components/ContentLoadingScreen";
import { createContentGenerator } from "@/services/contentGenerator";
import { useContentStore } from "@/stores/contentStore";
import { useShallow } from "zustand/react/shallow";

type GameStep =
  | "start"
  | "login"
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
  | "debrief";

export default function Home() {
  const [step, setStep] = useState<GameStep>(() => {
    if (
      process.env.NODE_ENV === "development" &&
      typeof window !== "undefined"
    ) {
      const p = new URLSearchParams(window.location.search).get("step");
      if (p) return p as GameStep;
    }
    return "start";
  });

  const [showScoreboard, setShowScoreboard] = useState(false);
  const phase = useGameStore((s) => s.phase);
  const setPhase = useGameStore((s) => s.setPhase);
  const setVisualMode = useGameStore((s) => s.setVisualMode);
  const teamName = useGameStore((s) => s.teamName);
  const fakeDomain = useGameStore((s) => s.fakeDomain);
  const gameStore = useGameStore();
  const { trigger: triggerBreach } = useBreachTransition();

  // Content store state
  const {
    preBreachEmails,
    breachEmails,
    logEntries,
    socialEngineeringDMs,
    npcBadAdvice,
    lolbins,
    wifi,
    isContentReady
  } = useContentStore(useShallow((s) => ({
    preBreachEmails: s.preBreachEmails,
    breachEmails: s.breachEmails,
    logEntries: s.logEntries,
    socialEngineeringDMs: s.socialEngineeringDMs,
    npcBadAdvice: s.npcBadAdvice,
    lolbins: s.lolbins,
    wifi: s.wifi,
    isContentReady: s.isContentReady
  })));
  const adjustTrust = useScoreStore((s) => s.adjustTrust);
  const addAction = useScoreStore((s) => s.addAction);
  const addFlag = useNarrativeStore((s) => s.addFlag);
  const addTimelineEntry = useNarrativeStore((s) => s.addTimelineEntry);
  const [showWiki, setShowWiki] = useState(false);
  const [wikiTab, setWikiTab] = useState<
    | "social-engineering"
    | "network-security"
    | "log-analysis"
    | "incident-response"
  >("social-engineering");
  const [dmReveal, setDmReveal] = useState(0);
  const [dmDone, setDmDone] = useState(false);
  const [flaggedLogs, setFlaggedLogs] = useState<LogEntry[]>([]);
  const [npcDmReveal, setNpcDmReveal] = useState(0);
  const [npcDmIndex, setNpcDmIndex] = useState(0);
  const { isTransitioning, changeStep } = useStepTransition(setStep);

  // Content generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({
    current: "",
    total: 0
  });
  const [retryState, setRetryState] = useState<
    { attempt: number; max: number } | undefined
  >();
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationDisabled, setGenerationDisabled] = useState(false);
  const contentStore = useContentStore();
  const generator = createContentGenerator();
  const generationInProgressRef = useRef(false);
  const userInteractedRef = useRef(false);
  const contentStoreRef = useRef(contentStore); // Ref to prevent infinite loops

  // Keep ref in sync with store
  useEffect(() => {
    contentStoreRef.current = contentStore;
  }, [contentStore]);

  // Initialize content generation (only after user login/MFA completion)
  useEffect(() => {
    // Don't generate content on start, login or mfa steps
    if (step === "start" || step === "login" || step === "mfa") {
      return;
    }

    // Prevent duplicate generation
    if (generationInProgressRef.current) {
      return;
    }

    const initContent = async () => {
      // Check for cached content from previous sessions
      if (contentStoreRef.current.isContentReady()) {
        // Content already cached, skip generation
        setIsGenerating(false);
        return;
      }

      // Try to restore from localStorage first
      contentStoreRef.current.restoreFromStorage();

      if (contentStoreRef.current.isContentReady()) {
        // Content restored from storage, skip generation
        setIsGenerating(false);
        return;
      }

      // Generate new session ID
      const sessionId = crypto.randomUUID();
      contentStoreRef.current.setSessionId(sessionId);
      gameStore.setSessionId(sessionId);

      if (!generator) {
        console.log('Generator not available, using fallback content');
        // Fallback to offline content
        contentStoreRef.current.setIsOfflineContent(true);
        setIsGenerating(false);
        return;
      }

      // Set flag to prevent duplicate requests
      generationInProgressRef.current = true;
      setIsGenerating(true);
      setGenerationProgress({ current: "Pre-breach emails", total: 0 });

      try {
        const contentLocale = useGameStore.getState().contentLocale;
        console.log('Starting content generation with generator:', !!generator);
        const result = await generator.generateAll({
          sessionId,
          locale: contentLocale,
          temperature: 0.9
        });

        // Server has already parsed the JSON strings into arrays
        contentStoreRef.current.setPreBreachEmails(result.preBreachEmails);
        contentStoreRef.current.setBreachEmails(result.breachEmails);
        contentStoreRef.current.setLogEntries(result.logEntries);
        contentStoreRef.current.setSocialEngineeringDMs(result.socialEngineeringDMs);
        contentStoreRef.current.setNPCBadAdvice(result.npcBadAdvice);
        contentStoreRef.current.setLOLBins(result.lolbins);
        contentStoreRef.current.setWiFi(result.wifi);
        contentStoreRef.current.setIsOfflineContent(result.isOfflineContent);

        contentStoreRef.current.persistToStorage();
        setGenerationError(null); // Clear any previous error
        setIsGenerating(false);
        generationInProgressRef.current = false;
      } catch (error: any) {
        console.error("Content generation failed:", error);

        // Check for rate limit errors and disable further generation
        if (error.message && (
          error.message.includes('Rate limit') ||
          error.message.includes('Too Many Requests') ||
          error.message.includes('Please wait') ||
          error.message.includes('Too many errors')
        )) {
          setGenerationError(error.message);
          setGenerationDisabled(true); // Disable generation to prevent hammering
          console.warn('Rate limit hit, disabling content generation for this session');
        }

        contentStoreRef.current.setIsOfflineContent(true);
        setIsGenerating(false);
        generationInProgressRef.current = false;
      }
    };

    initContent();
  }, [step, generator]);

  // Dev shortcut: set breach visual mode when ?step= targets a post-breach phase
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const p = new URLSearchParams(window.location.search).get("step");
    if (
      p &&
      (p.startsWith("breach-") ||
        p.startsWith("investigation-") ||
        p === "debrief")
    ) {
      setVisualMode("breach");
    }
  }, [setVisualMode]);

  const handleDMChoice = useCallback(
    (messageId: string, choice: DMChoice) => {
      if (choice.trustDelta) adjustTrust(choice.trustDelta);
      if (choice.scoreEffect) {
        addAction({
          id: `dm-${messageId}-${choice.id}`,
          ...choice.scoreEffect,
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

      const dmMessages = isContentReady()
        ? socialEngineeringDMs
        : SOCIAL_ENGINEERING_DM;
      const nextIdx = dmMessages.findIndex(
        (m) => m.id === choice.nextMessageId
      );
      if (nextIdx >= 0) {
        setTimeout(() => {
          setDmReveal(nextIdx + 1);
          setDmDone(true);
        }, 1000);
      }
    },
    [
      adjustTrust,
      addAction,
      addFlag,
      addTimelineEntry,
      isContentReady,
      socialEngineeringDMs
    ]
  );

  const handleNpcChoice = useCallback(
    (messageId: string, choice: DMChoice) => {
      if (choice.trustDelta) adjustTrust(choice.trustDelta);
      if (choice.scoreEffect) {
        addAction({
          id: `npc-${messageId}-${choice.id}`,
          ...choice.scoreEffect,
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
        const npcDms = isContentReady() ? npcBadAdvice : NPC_BAD_ADVICE;
        if (npcDmIndex < npcDms.length - 1) {
          setNpcDmIndex((i) => i + 1);
          setNpcDmReveal((r) => r + 1);
        }
      }, 1000);
    },
    [
      adjustTrust,
      addAction,
      addFlag,
      addTimelineEntry,
      npcDmIndex,
      isContentReady,
      npcBadAdvice
    ]
  );

  const handleEmailComplete = useCallback(
    async (results: Record<string, string>) => {
      const emails = isContentReady() ? breachEmails : BREACH_EMAILS;
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
      const points = Math.max(0, total * 12 - wrongCount * 8);

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
    [addAction, addFlag, addTimelineEntry, changeStep, isContentReady, breachEmails]
  );

  // Start screen (full screen, no OS shell)
  if (step === "start") {
    return <StartScreen onStart={() => changeStep("login")} />;
  }

  // Login & MFA screens (full screen, no OS shell)
  if (step === "login") {
    return <LoginScreen onLogin={() => changeStep("mfa")} />;
  }

  if (step === "mfa") {
    return (
      <MFAPuzzle
        onComplete={() => {
          userInteractedRef.current = true; // Mark user as having interacted
          changeStep("onboarding-portal");
          setTimeout(() => setDmReveal(1), 2000); // James informational
          setTimeout(() => setDmReveal(2), 4000); // David Park choice
          setTimeout(() => setDmReveal(3), 7000); // Sarah first message
          setTimeout(() => setDmReveal(4), 10000); // Sarah API key request
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
      content: (
        <EmailClient
          emails={isContentReady() ? preBreachEmails : PRE_BREACH_EMAILS}
          onComplete={() => {}}
        />
      )
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
            <ul className="space-y-1.5">
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
          emails={isContentReady() ? breachEmails : BREACH_EMAILS}
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
            setNpcDmReveal(1);
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
        <LogTerminal
          entries={isContentReady() ? logEntries : LOG_ENTRIES}
          onFlaggedChange={setFlaggedLogs}
        />
      )
    });
    // Flagged events panel as second window
    windows.push({
      id: "flagged",
      title: `Flagged Events (${flaggedLogs.length})`,
      content: (
        <div className="p-3">
          {flaggedLogs.length === 0 ? (
            <p className="text-xs text-muted mb-4">
              Click log lines to flag them for investigation.
            </p>
          ) : (
            <div className="space-y-2 mb-4">
              {flaggedLogs.map((log) => (
                <div
                  key={log.id}
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
                    {log.message.slice(0, 100)}
                    {log.message.length > 100 ? "..." : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={async () => {
              const malicious = (
                isContentReady() ? logEntries : LOG_ENTRIES
              ).filter((e) => e.isMalicious);
              const correctFlags = flaggedLogs.filter(
                (f) => f.isMalicious
              ).length;
              const falseFlags = flaggedLogs.filter(
                (f) => !f.isMalicious
              ).length;

              addAction({
                id: "log-analysis",
                category: "forensicSkill",
                points: Math.max(
                  0,
                  Math.round(
                    ((correctFlags - falseFlags) / malicious.length) * 25
                  )
                ),
                maxPoints: 25,
                label: `Log analysis: ${correctFlags} correct flags, ${falseFlags} false positives`
              });

              addTimelineEntry({
                id: "log-analysis",
                phase: "investigation",
                description: `Flagged ${flaggedLogs.length} log entries (${correctFlags} malicious)`
              });

              await changeStep("investigation-lolbins");
            }}
            className="w-full py-2 bg-accent text-white rounded text-xs font-medium hover:bg-accent-hover"
          >
            {flaggedLogs.length > 0 ? "Submit Flagged Events" : "Continue →"}
          </button>
        </div>
      )
    });
  }

  if (step === "investigation-lolbins") {
    windows.push({
      id: "taskmanager",
      title: "Task Manager — Process Analysis",
      content: (
        <TaskManagerView
          processes={isContentReady() ? lolbins : LOLBINS}
          onComplete={() => changeStep("investigation-ioc")}
        />
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
      content: <DebriefPage />
    });
  }

  // DM sidebar — onboarding uses social engineering, investigation uses NPC bad advice
  const isInvestigation = step.startsWith("investigation-");
  const dmSidebar =
    step === "onboarding-portal" ? (
      <DMSidebar
        messages={
          isContentReady() ? socialEngineeringDMs : SOCIAL_ENGINEERING_DM
        }
        onChoice={handleDMChoice}
        revealUpTo={dmReveal}
      />
    ) : isInvestigation ? (
      <DMSidebar
        messages={(isContentReady() ? npcBadAdvice : NPC_BAD_ADVICE).slice(
          0,
          npcDmIndex + 1
        )}
        onChoice={handleNpcChoice}
        revealUpTo={npcDmReveal}
      />
    ) : undefined;

  // When scoreboard is open, add it as an extra window
  if (showScoreboard) {
    windows.push({
      id: "scoreboard",
      title: "Scoreboard",
      content: <Scoreboard />
    });
  }

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
      {isGenerating && (
        <ContentLoadingScreen
          progress={generationProgress}
          retryState={retryState}
          error={generationError}
          onCancel={() => {
            // Cancel generation and use fallback
            contentStoreRef.current.setIsOfflineContent(true);
            setIsGenerating(false);
          }}
        />
      )}
      <OSShell
        key={step}
        windows={windows}
        dmSidebar={dmSidebar}
        onAppClick={(appId) => {
          if (appId === "scoreboard") {
            setShowScoreboard((v) => !v);
          }
          if (appId === "wiki") {
            setShowWiki((v) => !v);
          }
        }}
      />
    </>
  );
}
