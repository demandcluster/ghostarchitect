"use client";

import { useRef, useCallback } from "react";
import { useGameStore } from "@/stores/gameStore";
import gsap from "gsap";
import { motion, AnimatePresence } from "framer-motion";

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
    // Create text node to type into, preserving cursor element
    const textNode = document.createTextNode("");
    el.insertBefore(textNode, el.firstChild);
    const interval = setInterval(() => {
      textNode.textContent = text.slice(0, i + 1);
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

      {/* Scanline overlay for breach mode */}
      <AnimatePresence>
        {useGameStore((s) => s.visualMode) === "breach" && (
          <motion.div
            initial={{ opacity: 0.3 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 2 }}
            exit={{ opacity: 0.3 }}
            style={{
              pointerEvents: "none",
              position: "fixed",
              inset: 0,
              background: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)`
            }}
          />
        )}
      </AnimatePresence>
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
      // with RGB shift and screen shake
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

      let shakeInterval: NodeJS.Timeout;

      // Start screen shake at glitch phase start
      tl.call(() => {
        shakeInterval = setInterval(() => {
          const overlayEl = document.querySelector(".transition-overlay") as HTMLElement;
          if (overlayEl) {
            overlayEl.style.transform = `translate(${Math.random() * 6 - 3}px, ${Math.random() * 6 - 3}px)`;
          }
        }, 50);
      });

      for (let i = 0; i < bandCount; i++) {
        const band = document.createElement("div");
        band.style.cssText = `
          position:absolute;width:100%;
          top:${(i / bandCount) * 100}%;
          height:${100 / bandCount}%;
          background:${bandBgs[i]};
          mix-blend-mode:${i % 2 === 0 ? "difference" : "normal"};
        `;

        // Add RGB shift text shadow to bands
        const updateRGBShift = () => {
          band.style.textShadow = `
            ${Math.random() * 4 - 2}px ${Math.random() * 4 - 2}px 0 rgba(255,0,0,0.5),
            ${Math.random() * 4 - 2}px ${Math.random() * 4 - 2}px 0 rgba(0,255,0,0.5),
            ${Math.random() * 4 - 2}px ${Math.random() * 4 - 2}px 0 rgba(0,0,255,0.5)
          `;
        };

        // Continuously update RGB shift during glitch
        const rgbInterval = setInterval(updateRGBShift, 50);

        overlay.appendChild(band);

        tl.to(
          band,
          {
            x: (Math.random() - 0.5) * 40,
            opacity: 0.7 + Math.random() * 0.3,
            duration: 0.8,
            ease: "steps(4)",
            onComplete: () => {
              clearInterval(rgbInterval);
            },
          },
          0
        );
      }

      // Phase 2: Blackout (400ms) - stop screen shake
      tl.to(overlay, {
        backgroundColor: "#000",
        duration: 0.1,
        onStart: () => {
          clearInterval(shakeInterval);
          const overlayEl = document.querySelector(".transition-overlay") as HTMLElement;
          if (overlayEl) {
            overlayEl.style.transform = "none";
          }
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

      // Phase 3: Fake POST screen (1200ms) with faster typewriter effect and blinking cursor
      tl.call(() => {
        cursor.remove();
        overlay.style.background = "#0a0e14";
        overlay.style.padding = "20px";
        overlay.style.fontFamily = '"JetBrains Mono", monospace';
        overlay.style.fontSize = "13px";
        overlay.style.overflowY = "auto";
      });

      const postLines = getPostLines(fakeDomain);
      let cursorEl: HTMLSpanElement | null = null;

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

          // Create blinking cursor for this line
          cursorEl = document.createElement("span");
          cursorEl.textContent = "█";
          cursorEl.style.animation = "blink-cursor 0.7s infinite";
          cursorEl.style.color = color;
          el.appendChild(cursorEl);

          // Faster typing: 10ms per character (was 18ms)
          typewriterLine(el, line, 10).then(() => {
            // Remove cursor after typing completes
            if (cursorEl && cursorEl.parentNode === el) {
              cursorEl.remove();
            }
          });
        });

        if (i < postLines.length - 1) {
          tl.to({}, { duration: Math.max(0.2, line.length * 0.01 + 0.05) });
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
  }, [setIsTransitioning, setVisualMode, setPhase, fakeDomain]);

  return { trigger };
}
