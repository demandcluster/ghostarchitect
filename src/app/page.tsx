"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
import type { DMChoice, LogEntry, IOCIndicator } from "@/content/types";
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
    expectedIOCs
  } = useContentStore(useShallow((s) => ({
    preBreachEmails: s.preBreachEmails,
    breachEmails: s.breachEmails,
    logEntries: s.logEntries,
    socialEngineeringDMs: s.socialEngineeringDMs,
    npcBadAdvice: s.npcBadAdvice,
    lolbins: s.lolbins,
    wifi: s.wifi,
    expectedIOCs: s.expectedIOCs as IOCIndicator[]
  })));
  const isContentReady = useContentStore(s => s.isContentReady);

  console.log("[DEBUG] Content State:", {
    ready: isContentReady(),
    preCount: preBreachEmails.length,
    breachCount: breachEmails.length,
    dmCount: socialEngineeringDMs.length,
    step
  });

  const adjustTrust = useScoreStore((s) => s.adjustTrust);
  const addAction = useScoreStore((s) => s.addAction);
  const addFlag = useNarrativeStore((s) => s.addFlag);
  const addTimelineEntry = useNarrativeStore((s) => s.addTimelineEntry);
  const [showWiki, setShowWiki] = useState(false);
  const [wikiTab, setWikiTab] = useState<
    | "social-engineering"
    | "network-security"
    | "incident-response"
  >("social-engineering");

  const [revealedDmIds, setRevealedDmIds] = useState<string[]>([]);
  const [dmInteractionsDone, setDmInteractionsDone] = useState(0);
  const [dmDone, setDmDone] = useState(false);
  const [flaggedLogs, setFlaggedLogs] = useState<LogEntry[]>([]);
  const [npcDmReveal, setNpcDmReveal] = useState(0);
  const [npcDmIndex, setNpcDmIndex] = useState(0);
  const [npcDmDone, setNpcDmDone] = useState(false);
  const { isTransitioning, changeStep } = useStepTransition(setStep);

  // Content generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [fakeProgress, setFakeProgress] = useState(0);
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
  const generationAttemptCountRef = useRef(0);
  const userInteractedRef = useRef(false);
  const contentStoreRef = useRef(contentStore); // Ref to prevent infinite loops

  // Keep ref in sync with store
  useEffect(() => {
    contentStoreRef.current = contentStore;
  }, [contentStore]);

  // Initialize content generation (start during Login/MFA to save time)
  useEffect(() => {
    // Don't generate content on start step
    if (step === "start") {
      return;
    }

    // Prevent duplicate generation
    if (generationInProgressRef.current) {
      return;
    }

    // Check if generation was disabled due to rate limits
    if (generationDisabled) {
      console.warn('Content generation disabled for this session');
      return;
    }

    // Prevent too many generation attempts
    if (generationAttemptCountRef.current > 5) {
      console.warn(`Generation already attempted ${generationAttemptCountRef.current} times, disabling for this session`);
      setGenerationDisabled(true);
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

      // Stage 1: Initial Content (Emails and DMs)
      // Set flag to prevent duplicate requests
      generationInProgressRef.current = true;
      generationAttemptCountRef.current++;
      setIsGenerating(true);
      setFakeProgress(0);
      setGenerationProgress({ current: "Pre-breach emails", total: 0 });

      // Start simulating step transitions for UI feedback (Initial Section)
      const initialSteps = [
        'Pre-breach emails',
        'Breach phishing emails',
        'Social engineering DMs',
      ];
      let stepIdx = 0;
      const progressInterval = setInterval(() => {
        if (stepIdx < initialSteps.length - 1) {
          stepIdx++;
          setGenerationProgress({ current: initialSteps[stepIdx], total: stepIdx + 1 });
        }
      }, 2500); 

      // Start the progress bar timer (accumulates even during Login/MFA)
      const barInterval = setInterval(() => {
        setFakeProgress((prev) => {
          if (prev >= 98) return prev;
          const increment = Math.random() * 2 + 0.2;
          return Math.min(98, prev + increment);
        });
      }, 300);

      try {
        const { contentLocale, teamName, fakeDomain, playerHandle } = useGameStore.getState();
        console.log(`Starting INITIAL content generation (attempt ${generationAttemptCountRef.current})`);
        
        const initialResult = await generator.generateAll({
          sessionId,
          locale: contentLocale,
          temperature: 0.9,
          section: 'initial',
          teamName,
          fakeDomain,
          playerHandle: playerHandle || "User"
        });

        console.log("[DEBUG] initialResult:", initialResult.preBreachEmails.length, "pre,", initialResult.breachEmails.length, "breach");

        contentStoreRef.current.setPreBreachEmails(initialResult.preBreachEmails);
        contentStoreRef.current.setBreachEmails(initialResult.breachEmails);
        contentStoreRef.current.setSocialEngineeringDMs(initialResult.socialEngineeringDMs);
        
        // Clear blocking UI once initial content is ready
        clearInterval(progressInterval);
        clearInterval(barInterval);
        setIsGenerating(false);
        setGenerationError(null);

        // Stage 2: Secondary Content (Background)
        console.log('Starting SECONDARY content generation in background...');
        generator.generateAll({
          sessionId,
          locale: contentLocale,
          temperature: 0.8,
          section: 'secondary',
          teamName,
          fakeDomain,
          playerHandle: playerHandle || "User"
        }).then(secondaryResult => {
          contentStoreRef.current.setLogEntries(secondaryResult.logEntries);
          contentStoreRef.current.setNPCBadAdvice(secondaryResult.npcBadAdvice);
          contentStoreRef.current.setLOLBins(secondaryResult.lolbins);
          contentStoreRef.current.setWiFi(secondaryResult.wifi);
          contentStoreRef.current.setExpectedIOCs(secondaryResult.expectedIOCs as IOCIndicator[]);
          contentStoreRef.current.persistToStorage();
          console.log('Secondary content generation complete.');
        }).catch(err => {
          console.error('Secondary content generation failed (background):', err);
          // Don't block the user, store will just use fallback/empty arrays for these fields
        });

      } catch (error: unknown) {
        console.error("Content generation failed:", error);
        clearInterval(progressInterval);
        clearInterval(barInterval);
        
        const err = error as { message?: string };
        // Check for rate limit errors and disable further generation
        if (err.message && (
          err.message.includes('Rate limit') ||
          err.message.includes('Too Many Requests') ||
          err.message.includes('Please wait') ||
          err.message.includes('Too many errors')
        )) {
          setGenerationError(err.message);
          setGenerationDisabled(true); 
          console.warn('Rate limit hit, disabling content generation for this session');
        }

        // Fallback to offline content on error
        contentStoreRef.current.setIsOfflineContent(true);
      } finally {
        setIsGenerating(false);
        generationInProgressRef.current = false;
      }
    };

    initContent();
  }, [step, generator, generationDisabled, gameStore]);

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

  // Auto-reveal informational DMs in a chain
  useEffect(() => {
    if (step !== "onboarding-portal") return;
    if (revealedDmIds.length === 0) return;

    const lastId = revealedDmIds[revealedDmIds.length - 1];
    const dms = isContentReady() ? socialEngineeringDMs : SOCIAL_ENGINEERING_DM;
    const currentMsg = dms.find(m => m.id === lastId);

    // If it's an informational message (no choices) and points to another message
    if (currentMsg && (!currentMsg.choices || currentMsg.choices.length === 0) && (currentMsg as { nextMessageId?: string }).nextMessageId) {
      const nextId = (currentMsg as { nextMessageId?: string }).nextMessageId;
      if (nextId && !revealedDmIds.includes(nextId)) {
        const timer = setTimeout(() => {
          setRevealedDmIds(prev => [...prev, nextId]);
        }, 2500); // Delay for reading
        return () => clearTimeout(timer);
      }
    }
  }, [revealedDmIds, step, isContentReady, socialEngineeringDMs]);

  const handleDMChoice = useCallback(
    (messageId: string, choice: DMChoice) => {
      const dms = isContentReady() ? socialEngineeringDMs : SOCIAL_ENGINEERING_DM;
      const currentMsg = dms.find(m => m.id === messageId);
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
          maxPoints: Math.round(choice.scoreEffect.maxPoints * complexityMultiplier),
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
      if (choice.nextMessageId) {
        setRevealedDmIds((prev) => prev.includes(choice.nextMessageId!) ? prev : [...prev, choice.nextMessageId!]);
      }

      // Track completion
      setDmInteractionsDone((prev) => {
        const nextCount = prev + 1;
        // Phase ends after 4 scenarios
        if (nextCount >= 4) {
          setDmDone(true);
        }
        return nextCount;
      });
    },
    [
      adjustTrust,
      addAction,
      addFlag,
      addTimelineEntry,
      setRevealedDmIds,
      setDmDone,
      isContentReady,
      socialEngineeringDMs
    ]
  );

  const handleNpcChoice = useCallback(
    (messageId: string, choice: DMChoice) => {
      const npcDms = isContentReady() ? npcBadAdvice : NPC_BAD_ADVICE;
      const currentMsg = npcDms.find(m => m.id === messageId);
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
          maxPoints: Math.round(choice.scoreEffect.maxPoints * complexityMultiplier),
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
        const npcDms = isContentReady() && npcBadAdvice.length > 0 ? npcBadAdvice : NPC_BAD_ADVICE;
        if (npcDmIndex < npcDms.length - 1) {
          setNpcDmIndex((i) => i + 1);
          setNpcDmReveal((r) => r + 1);
        } else {
          // All NPC messages completed
          setNpcDmDone(true);
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
      const avgComplexity = emails.length > 0 
        ? emails.reduce((sum, e) => sum + (e.complexity || 5), 0) / emails.length 
        : 5;
      const complexityMultiplier = avgComplexity / 5;

      const points = Math.max(0, Math.round((total * 12 - wrongCount * 8) * complexityMultiplier));

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
          
          // Initial DM reveal sequence: Show the first message (intro) after a delay
          setTimeout(() => {
            const dms = isContentReady() ? socialEngineeringDMs : SOCIAL_ENGINEERING_DM;
            if (dms.length > 0) {
              setRevealedDmIds([dms[0].id]);
            }
          }, 2000);
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
          networks={isContentReady() && wifi.length > 0 ? wifi : undefined}
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
          entries={isContentReady() && logEntries.length > 0 ? logEntries : LOG_ENTRIES}
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
    const npcDms = isContentReady() ? npcBadAdvice : NPC_BAD_ADVICE;
    const allNpcMessagesAnswered = npcDmIndex >= npcDms.length;

    windows.push({
      id: "taskmanager",
      title: "Task Manager — Process Analysis",
      content: (
        <div className="h-full flex flex-col">
          <div className="flex-1 overflow-auto">
            <TaskManagerView
              processes={isContentReady() && lolbins.length > 0 ? lolbins : LOLBINS}
              onComplete={() => {}}
            />
          </div>
          {allNpcMessagesAnswered && (
            <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <button
                onClick={() => changeStep("investigation-ioc")}
                className="w-full px-4 py-2 rounded text-sm font-semibold text-white transition-colors"
                style={{ background: 'var(--accent)' }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'var(--accent-hover)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'var(--accent)')
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
          expectedIOCs={isContentReady() && expectedIOCs.length > 0 ? expectedIOCs : undefined}
          logEntries={isContentReady() && logEntries.length > 0 ? logEntries : undefined}
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
        revealedIds={revealedDmIds}
      />
    ) : isInvestigation ? (
      <DMSidebar
        messages={(isContentReady() && npcBadAdvice.length > 0 ? npcBadAdvice : NPC_BAD_ADVICE).slice(
          0,
          npcDmIndex + 1
        )}
        onChoice={handleNpcChoice}
        revealUpTo={npcDmIndex + 1}
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
      {isGenerating && step === "onboarding-portal" && (
        <ContentLoadingScreen
          progress={generationProgress}
          fakeProgress={fakeProgress}
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
