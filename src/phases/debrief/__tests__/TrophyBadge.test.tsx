import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { TrophyBadge } from "@/shared/components/TrophyBadge";
import { useScoreStore } from "@/stores/scoreStore";
import { useNarrativeStore } from "@/stores/narrativeStore";
import React from "react";

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => <span {...props}>{children}</span>,
    button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));

// Mock canvas-confetti
vi.mock("canvas-confetti", () => ({
  default: vi.fn(),
}));

describe("TrophyBadge", () => {
  beforeEach(() => {
    useScoreStore.getState().reset();
    useNarrativeStore.getState().reset();
    vi.clearAllMocks();
  });

  describe("PLATINUM rank (score 450+)", () => {
    it("renders PLATINUM rank for perfect score of 500", async () => {
      const store = useScoreStore.getState();
      store.addAction({
        id: "test-1",
        category: "phishingIQ",
        points: 125,
        maxPoints: 125,
        label: "Perfect phishing score",
      });
      store.addAction({
        id: "test-2",
        category: "passwordHygiene",
        points: 125,
        maxPoints: 125,
        label: "Perfect password score",
      });
      store.addAction({
        id: "test-3",
        category: "networkSecurity",
        points: 125,
        maxPoints: 125,
        label: "Perfect network score",
      });
      store.addAction({
        id: "test-4",
        category: "forensicSkill",
        points: 125,
        maxPoints: 125,
        label: "Perfect forensic score",
      });

      render(<TrophyBadge isOpen={true} onClose={() => {}} />);

      await waitFor(() => {
        expect(screen.getByText(/PLATINUM/i)).toBeInTheDocument();
        expect(screen.getByText("🏆")).toBeInTheDocument();
        expect(screen.getByText(/500/)).toBeInTheDocument();
      });
    });

    it("renders PLATINUM rank for score of 475", async () => {
      const store = useScoreStore.getState();
      store.addAction({
        id: "test-1",
        category: "phishingIQ",
        points: 125,
        maxPoints: 125,
        label: "Good phishing",
      });
      store.addAction({
        id: "test-2",
        category: "passwordHygiene",
        points: 125,
        maxPoints: 125,
        label: "Good password",
      });
      store.addAction({
        id: "test-3",
        category: "networkSecurity",
        points: 125,
        maxPoints: 125,
        label: "Good network",
      });
      store.addAction({
        id: "test-4",
        category: "forensicSkill",
        points: 100,
        maxPoints: 125,
        label: "Good forensic",
      });

      render(<TrophyBadge isOpen={true} onClose={() => {}} />);

      await waitFor(() => {
        expect(screen.getByText(/PLATINUM/i)).toBeInTheDocument();
        expect(screen.getByText(/475/)).toBeInTheDocument();
      });
    });
  });

  describe("GOLD rank (score 400-449)", () => {
    it("renders GOLD rank for score of 449", async () => {
      const store = useScoreStore.getState();
      store.addAction({
        id: "test-1",
        category: "phishingIQ",
        points: 125,
        maxPoints: 125,
        label: "Phishing",
      });
      store.addAction({
        id: "test-2",
        category: "passwordHygiene",
        points: 125,
        maxPoints: 125,
        label: "Password",
      });
      store.addAction({
        id: "test-3",
        category: "networkSecurity",
        points: 100,
        maxPoints: 125,
        label: "Network",
      });
      store.addAction({
        id: "test-4",
        category: "forensicSkill",
        points: 99,
        maxPoints: 125,
        label: "Forensic",
      });

      render(<TrophyBadge isOpen={true} onClose={() => {}} />);

      await waitFor(() => {
        expect(screen.getByText(/GOLD/i)).toBeInTheDocument();
        expect(screen.getByText("🥇")).toBeInTheDocument();
        expect(screen.getByText(/449/)).toBeInTheDocument();
      });
    });
  });

  describe("SILVER rank (score 250-399)", () => {
    it("renders SILVER rank for score of 399", async () => {
      const store = useScoreStore.getState();
      store.addAction({
        id: "test-1",
        category: "phishingIQ",
        points: 125,
        maxPoints: 125,
        label: "Phishing",
      });
      store.addAction({
        id: "test-2",
        category: "passwordHygiene",
        points: 99,
        maxPoints: 125,
        label: "Password",
      });
      store.addAction({
        id: "test-3",
        category: "networkSecurity",
        points: 100,
        maxPoints: 125,
        label: "Network",
      });
      store.addAction({
        id: "test-4",
        category: "forensicSkill",
        points: 75,
        maxPoints: 125,
        label: "Forensic",
      });

      render(<TrophyBadge isOpen={true} onClose={() => {}} />);

      await waitFor(() => {
        expect(screen.getByText(/SILVER/i)).toBeInTheDocument();
        expect(screen.getByText("🥈")).toBeInTheDocument();
        expect(screen.getByText(/399/)).toBeInTheDocument();
      });
    });
  });

  describe("BRONZE rank (score 0-249)", () => {
    it("renders BRONZE rank for score of 249", async () => {
      const store = useScoreStore.getState();
      store.addAction({
        id: "test-1",
        category: "phishingIQ",
        points: 75,
        maxPoints: 125,
        label: "Phishing",
      });
      store.addAction({
        id: "test-2",
        category: "passwordHygiene",
        points: 74,
        maxPoints: 125,
        label: "Password",
      });
      store.addAction({
        id: "test-3",
        category: "networkSecurity",
        points: 50,
        maxPoints: 125,
        label: "Network",
      });
      store.addAction({
        id: "test-4",
        category: "forensicSkill",
        points: 50,
        maxPoints: 125,
        label: "Forensic",
      });

      render(<TrophyBadge isOpen={true} onClose={() => {}} />);

      await waitFor(() => {
        expect(screen.getByText(/BRONZE/i)).toBeInTheDocument();
        expect(screen.getByText("🥉")).toBeInTheDocument();
        expect(screen.getByText(/249/)).toBeInTheDocument();
      });
    });

    it("renders BRONZE rank for score of 0 (worst case)", async () => {
      render(<TrophyBadge isOpen={true} onClose={() => {}} />);

      await waitFor(() => {
        expect(screen.getByText(/BRONZE/i)).toBeInTheDocument();
        expect(screen.getByText(/0/)).toBeInTheDocument();
      });
    });
  });

  describe("component behavior", () => {
    it("does not render when isOpen is false", () => {
      render(<TrophyBadge isOpen={false} onClose={() => {}} />);

      expect(screen.queryByText(/PLATINUM|GOLD|SILVER|BRONZE/i)).not.toBeInTheDocument();
    });

    it("renders Continue button", async () => {
      const store = useScoreStore.getState();
      store.addAction({
        id: "test",
        category: "phishingIQ",
        points: 125,
        maxPoints: 125,
        label: "Test",
      });

      render(<TrophyBadge isOpen={true} onClose={() => {}} />);

      await waitFor(() => {
        expect(screen.getByText("Continue")).toBeInTheDocument();
      });
    });

    it("calls onClose when Continue button is clicked", async () => {
      const store = useScoreStore.getState();
      store.addAction({
        id: "test",
        category: "phishingIQ",
        points: 125,
        maxPoints: 125,
        label: "Test",
      });

      const onClose = vi.fn();
      render(<TrophyBadge isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        const continueButton = screen.getByText("Continue");
        continueButton.click();
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
