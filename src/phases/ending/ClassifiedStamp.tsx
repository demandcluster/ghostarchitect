"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";

interface ClassifiedStampProps {
  verdict: string;
  color: string;
  subtitle: string;
  onComplete: () => void;
}

export function ClassifiedStamp({ verdict, color, subtitle, onComplete }: ClassifiedStampProps) {
  const stampRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) { onComplete(); return; }

    let holdTimer: ReturnType<typeof setTimeout>;
    const tl = gsap.timeline({
      onComplete: () => { holdTimer = setTimeout(onComplete, 1500); },
    });

    tl.fromTo(flashRef.current, { opacity: 0 }, { opacity: 0.8, duration: 0.05 })
      .to(flashRef.current, { opacity: 0, duration: 0.15 });

    tl.fromTo(stampRef.current,
      { scale: 1.8, rotation: -15, opacity: 0 },
      { scale: 1, rotation: -6, opacity: 1, duration: 0.4, ease: "back.out(2)" },
      "-=0.05"
    );

    tl.fromTo(glowRef.current, { opacity: 0.15 }, { opacity: 0.3, duration: 0.3, yoyo: true, repeat: 1 }, "-=0.2");

    tl.fromTo(subtitleRef.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4 }, "-=0.3");

    return () => { tl.kill(); clearTimeout(holdTimer); };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center" style={{ background: "#0a0a0a" }}>
      <div ref={flashRef} className="absolute inset-0 bg-white opacity-0 pointer-events-none" />
      <div ref={glowRef} className="absolute rounded-full"
        style={{ width: 400, height: 400, background: `radial-gradient(circle, ${color}26 0%, transparent 60%)`, opacity: 0.15 }} />
      <div ref={stampRef} className="relative rounded-lg px-12 py-3.5"
        style={{ border: `4px solid ${color}`, transform: "rotate(-6deg) scale(1.8)", opacity: 0, boxShadow: `0 0 40px ${color}33, inset 0 0 20px ${color}0d` }}>
        <div className="font-black tracking-[10px]" style={{ fontSize: 56, color, textShadow: `0 0 30px ${color}66` }}>
          {verdict}
        </div>
      </div>
      <div ref={subtitleRef} className="mt-5 tracking-[4px] text-[11px]" style={{ color: `${color}99`, opacity: 0 }}>
        {subtitle}
      </div>
      <div className="absolute top-4 right-6 font-mono text-[9px]" style={{ color: "rgba(255,255,255,0.15)" }}>
        CASE #GA-2026-0847
      </div>
    </div>
  );
}
