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
        "position:fixed;inset:0;z-index:9999;overflow:hidden;background:transparent;";
      document.body.appendChild(overlay);

      // --- Layer 1: Video background (always visible) ---
      const video = document.createElement("video");
      video.src = "/ghostvideo.mp4";
      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;
      video.setAttribute("muted", "");
      video.style.cssText =
        "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1;";
      overlay.appendChild(video);

      // --- Layer 2: Glitch layer (bands animate here) ---
      const glitchLayer = document.createElement("div");
      glitchLayer.style.cssText = "position:absolute;inset:0;z-index:2;";
      overlay.appendChild(glitchLayer);

      // --- Layer 3: Dark tint (replaces hard blackout, video bleeds through) ---
      const darkTint = document.createElement("div");
      darkTint.style.cssText =
        "position:absolute;inset:0;z-index:3;background:rgba(0,0,0,0);pointer-events:none;";
      overlay.appendChild(darkTint);

      // --- Layer 4: POST screen text (readable dark bg, sits over video) ---
      const postLayer = document.createElement("div");
      postLayer.style.cssText =
        "position:absolute;inset:0;z-index:4;background:rgba(10,14,20,0);padding:20px;" +
        'font-family:"JetBrains Mono",monospace;font-size:15px;line-height:1.8;overflow-y:auto;opacity:0;';
      overlay.appendChild(postLayer);

      const tl = gsap.timeline({
        onComplete: () => {
          overlay.remove();
          setIsTransitioning(false);
          resolve();
        },
      });

      // Phase 1: Glitch bands (800ms) over video — alternating bg colors, mix-blend-mode difference
      // with RGB shift and screen shake
      const bandCount = 12;
      const bandBgs = [
        "var(--window-header-from)",
        "var(--bg-window)",
        "var(--window-header-from)",
        "var(--bg-window)",
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
          const overlayEl = document.querySelector(".transition-overlay");
          if (overlayEl instanceof HTMLElement) {
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

        glitchLayer.appendChild(band);

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

      // Phase 2: Dark tint + cursor blink (video visible through tint) — stop screen shake
      tl.to(darkTint, {
        background: "rgba(0,0,0,0.35)",
        duration: 0.1,
        onStart: () => {
          clearInterval(shakeInterval);
          const overlayEl = document.querySelector(".transition-overlay") as HTMLElement;
          if (overlayEl) {
            overlayEl.style.transform = "none";
          }
          // Clear glitch bands
          while (glitchLayer.firstChild) glitchLayer.removeChild(glitchLayer.firstChild);
        },
      });

      const cursor = document.createElement("div");
      cursor.style.cssText =
        "position:absolute;top:50%;left:50%;width:10px;height:20px;z-index:5;background:var(--accent,#00e533);";
      overlay.appendChild(cursor);

      tl.to(cursor, {
        opacity: 0,
        repeat: 3,
        yoyo: true,
        duration: 0.1,
      });

      // Hold so the 5s bumper video has time to play
      tl.to({}, { duration: 3.5 });

      // Phase 3: Fade in POST layer (dark tint fades back, POST bg provides contrast over video)
      tl.call(() => {
        cursor.remove();
      });

      tl.to(darkTint, { background: "rgba(0,0,0,0)", duration: 0.2 });
      tl.to(postLayer, { opacity: 1, background: "rgba(10,14,20,0.88)", duration: 0.2 }, "<");

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
          postLayer.appendChild(el);

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

      tl.to({}, { duration: 0.3 });

      // Phase 4: Switch theme — white flash then reveal (~0.5s, total ≈ 5s)
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
        duration: 0.4,
        ease: "power3.inOut",
      });
    });
  }, [setIsTransitioning, setVisualMode, setPhase, fakeDomain]);

  return { trigger };
}
