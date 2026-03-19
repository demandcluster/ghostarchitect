"use client";

import { motion } from "framer-motion";

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  clickable?: boolean;
  delay?: number;
  onClick?: () => void;
}

export function AnimatedCard({
  children,
  className = "",
  hover = true,
  clickable = false,
  delay = 0,
  onClick,
}: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      whileHover={
        hover
          ? {
              y: -2,
              boxShadow: clickable
                ? "var(--shadow-elevated)"
                : "0 4px 12px rgba(0,0,0,0.1)",
            }
          : undefined
      }
      whileTap={clickable ? { scale: 0.99 } : undefined}
      onClick={onClick}
      className={`
        rounded-xl border transition-all duration-200
        ${hover ? "duration-300" : ""}
        ${clickable ? "cursor-pointer" : ""}
        ${className}
      `}
      style={{
        background: "var(--bg-window-raised)",
        borderColor: "var(--border)",
      }}
    >
      {children}
    </motion.div>
  );
}
