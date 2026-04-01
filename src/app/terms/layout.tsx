"use client";

import { useEffect } from "react";

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    const prevH = document.body.style.height;
    document.body.style.overflow = "auto";
    document.body.style.height = "auto";
    return () => {
      document.body.style.overflow = prev;
      document.body.style.height = prevH;
    };
  }, []);

  return <>{children}</>;
}
