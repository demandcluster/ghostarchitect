import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock gameStore — factory function so vi.mock hoisting works correctly
vi.mock("@/stores/gameStore", () => ({
  useGameStore: (selector: (s: { teamName: string }) => unknown) =>
    selector({ teamName: "AcmeCorp" }),
}));

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: true, // simulate prefers-reduced-motion: reduce
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

import { SimIntroScreen } from "../SimIntroScreen";

describe("SimIntroScreen", () => {
  it("renders hired announcement with correct teamName in reduced-motion mode", () => {
    render(<SimIntroScreen onComplete={vi.fn()} />);
    expect(screen.getByText(/WELCOME TO ACMECORP/i)).toBeInTheDocument();
  });

  it("calls onComplete when CTA button is clicked", () => {
    const onComplete = vi.fn();
    render(<SimIntroScreen onComplete={onComplete} />);
    fireEvent.click(screen.getByRole("button", { name: /ENTER PORTAL/i }));
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("renders Security Analyst copy in hired phase", () => {
    render(<SimIntroScreen onComplete={vi.fn()} />);
    expect(screen.getByText(/Security Analyst/i)).toBeInTheDocument();
  });
});
