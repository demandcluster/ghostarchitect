"use client";

import { motion } from "framer-motion";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: string;
}

const sizes = {
  sm: { width: 16, border: 2 },
  md: { width: 24, border: 3 },
  lg: { width: 40, border: 4 },
};

export function Spinner({ size = "md", color }: SpinnerProps) {
  const { width, border } = sizes[size];
  const borderColor = color || "var(--accent)";

  return (
    <motion.div
      className="rounded-full border-transparent border-t-current"
      style={{
        width: `${width}px`,
        height: `${width}px`,
        borderWidth: `${border}px`,
        borderColor,
      }}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    />
  );
}

export function DotsSpinner({ color }: { color?: string }) {
  const borderColor = color || "var(--text-muted)";

  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="rounded-full"
          style={{
            width: "6px",
            height: "6px",
            background: borderColor,
          }}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

export function PulseSpinner({ color }: { color?: string }) {
  const borderColor = color || "var(--accent)";

  return (
    <div className="relative">
      <motion.div
        className="rounded-full border-2"
        style={{
          width: "32px",
          height: "32px",
          borderColor: `${borderColor}33`,
        }}
        animate={{ scale: [1, 1.5], opacity: [1, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
      />
      <motion.div
        className="rounded-full border-2"
        style={{
          width: "32px",
          height: "32px",
          borderColor: `${borderColor}33`,
        }}
        animate={{ scale: [1, 1.5], opacity: [1, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
      />
      <div
        className="absolute inset-0 rounded-full border-2"
        style={{
          width: "32px",
          height: "32px",
          borderColor,
        }}
      />
    </div>
  );
}
