"use client";

import { motion } from "framer-motion";

interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "success" | "warning" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  children: React.ReactNode;
}

const variantStyles = {
  primary: "bg-[var(--accent)] text-black hover:brightness-110 shadow-[0_0_15px_rgba(0,229,51,0.25)]",
  secondary: "bg-[var(--bg-window-sunken)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--bg-tertiary)]",
  danger: "bg-[var(--danger)] text-white hover:brightness-110 shadow-[0_0_15px_rgba(239,68,68,0.25)]",
  success: "bg-[var(--success)] text-white hover:brightness-110 shadow-[0_0_15px_rgba(34,197,94,0.25)]",
  warning: "bg-[var(--warning)] text-black hover:brightness-110 shadow-[0_0_15px_rgba(234,179,8,0.25)]",
  ghost: "text-[var(--text-primary)] hover:bg-[var(--bg-window-sunken)]",
};

const sizeStyles = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export function AnimatedButton({
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  children,
  className = "",
  ...props
}: AnimatedButtonProps) {
  const baseStyles = "rounded font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]";
  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

  return (
    <motion.button
      {...props}
      disabled={disabled || isLoading}
      className={combinedClassName}
      whileHover={!(disabled || isLoading) ? { scale: 1.02 } : undefined}
      whileTap={!(disabled || isLoading) ? { scale: 0.98 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full"
          />
          Loading...
        </span>
      ) : (
        children
      )}
    </motion.button>
  );
}
