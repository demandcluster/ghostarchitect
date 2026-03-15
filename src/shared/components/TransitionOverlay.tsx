"use client";

import { useRef, useCallback } from "react";
import { useGameStore } from "@/stores/gameStore";
import gsap from "gsap";

function getPostLines(fakeDomain: string): string[] {
  return [
    "[BOOT] System integrity check... FAILED",
    "[ALERT] Unauthorized access detected on port 443",
    `[WARN] Certificate mismatch: CN=*.${fakeDomain}`,
    "[ALERT] Lateral movement detected: 10.0.0.0/24 → 10.0.1.0/24",
    "[CRITICAL] Data exfiltration in progress — 45.33.xx.xx:8443",
    "[WARN] Service account svc_backup: anomalous query volume",
    "[ALERT] Credential dump detected: lsass.exe memory access",
    "[CRITICAL] BREACH CONFIRMED — Activating incident response...",
  ];
}

function typewriterLine(el: HTMLElement, text: string, charDelay: number): Promise<void> {
  return new Promise((resolve) => {
    let i = 0;
    el.textContent = "";
    const interval = setInterval(() => {
      el.textContent = text.slice(0, i + 1);
      i++;
      if (i >= text.length) {
        clearInterval(interval);
        resolve();
      }
    }, charDelay);
  });
}

export function TransitionOverlay() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const isTransitioning = useGameStore((s) => s.isTransitioning);

  return (
    <>
      {isTransitioning && (
        <div
          ref={overlayRef}
          className="transition-overlay"
          style={{ pointerEvents: "all" }}
        />
      )}
    </>
  );
}

function removeAllChildren(el: HTMLElement) {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

export function useBreachTransition() {
  const setIsTransitioning = useGameStore((s) => s.setIsTransitioning);
  const setVisualMode = useGameStore((s) => s.setVisualMode);
  const setPhase = useGameStore((s) => s.setPhase);
  const fakeDomain = useGameStore((s) => s.fakeDomain);

  const trigger = useCallback(() => {
    return new Promise<void>((resolve) => {
      setIsTransitioning(true);

      // Respect the user's motion preference: skip the glitch/typewriter
      // animation entirely and switch themes instantly.
      const prefersReduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      if (prefersReduced) {
        setVisualMode("breach");
        setPhase("breach");
        setIsTransitioning(false);
        resolve();
        return;
      }

      const overlay = document.createElement("div");
      overlay.style.cssText =
        "position:fixed;inset:0;z-index:9999;overflow:hidden;";
      document.body.appendChild(overlay);

      const tl = gsap.timeline({
        onComplete: () => {
          overlay.remove();
          setIsTransitioning(false);
          resolve();
        },
      });

      // Phase 1: Glitch bands (800ms) — alternating bg colors, mix-blend-mode difference
      const bandCount = 8;
      const bandBgs = [
        "var(--window-header-from)",
        "var(--bg-window)",
        "var(--window-header-from)",
        "var(--bg-window)",
        "var(--window-header-from)",
        "var(--bg-window)",
        "var(--window-header-from)",
        "var(--bg-window)",
      ];
      for (let i = 0; i < bandCount; i++) {
        const band = document.createElement("div");
        band.style.cssText = `
          position:absolute;width:100%;
          top:${(i / bandCount) * 100}%;
          height:${100 / bandCount}%;
          background:${bandBgs[i]};
          mix-blend-mode:${i % 2 === 0 ? "difference" : "normal"};
        `;
        overlay.appendChild(band);

        tl.to(
          band,
          {
            x: (Math.random() - 0.5) * 40,
            opacity: 0.7 + Math.random() * 0.3,
            duration: 0.8,
            ease: "steps(4)",
          },
          0
        );
      }

      // Phase 2: Blackout (400ms)
      tl.to(overlay, {
        backgroundColor: "#000",
        duration: 0.1,
        onStart: () => {
          removeAllChildren(overlay);
        },
      });

      const cursor = document.createElement("div");
      cursor.style.cssText =
        "position:absolute;top:50%;left:50%;width:10px;height:20px;background:var(--accent,#00e533);";
      overlay.appendChild(cursor);

      tl.to(cursor, {
        opacity: 0,
        repeat: 3,
        yoyo: true,
        duration: 0.1,
      });

      // Phase 3: Fake POST screen (1200ms) with typewriter effect
      tl.call(() => {
        cursor.remove();
        overlay.style.background = "#0a0e14";
        overlay.style.padding = "20px";
        overlay.style.fontFamily = '"JetBrains Mono", monospace';
        overlay.style.fontSize = "13px";
        overlay.style.overflowY = "auto";
      });

      const postLines = getPostLines(fakeDomain);
      postLines.forEach((line, i) => {
        tl.call(() => {
          const el = document.createElement("div");
          el.className = "post-line";
          const color = line.includes("CRITICAL")
            ? "var(--danger, #ff2d55)"
            : line.includes("ALERT")
              ? "var(--warning, #ffb800)"
              : line.includes("WARN")
                ? "var(--warning, #ffb800)"
                : "var(--accent, #00e533)";
          el.style.color = color;
          overlay.appendChild(el);
          typewriterLine(el, line, 18);
        });
        if (i < postLines.length - 1) {
          tl.to({}, { duration: Math.max(0.2, line.length * 0.018 + 0.05) });
        }
      });

      tl.to({}, { duration: 0.4 });

      // Phase 4: Switch theme — white flash then reveal (800ms)
      tl.call(() => {
        setVisualMode("breach");
        setPhase("breach");
      });

      // Brief white flash
      tl.to(overlay, {
        backgroundColor: "#ffffff",
        duration: 0.08,
        ease: "power3.in",
      });

      tl.to(overlay, {
        opacity: 0,
        duration: 0.8,
        ease: "power3.inOut",
      });
    });
  }, [setIsTransitioning, setVisualMode, setPhase]);

  return { trigger };
}
