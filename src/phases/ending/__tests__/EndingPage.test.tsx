import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { IncidentReport } from "../IncidentReport";

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
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

describe("IncidentReport", () => {
  const baseProps = {
    teamName: "IriusRisk",
    playerHandle: "Nacho",
    categoryScores: { phishingIQ: 23, passwordHygiene: 25, networkSecurity: 20, forensicSkill: 22 },
    remark: "Performed adequately. HR has no further comment at this time.",
    onPlayAgain: vi.fn(),
  };

  it("renders promoted variant with correct branding", () => {
    render(<IncidentReport {...baseProps} ending="promoted" verdict="PROMOTED" color="#22c55e" />);
    expect(screen.getByText("IRIUSRISK")).toBeInTheDocument();
    expect(screen.getAllByText("Nacho").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("PROMOTED").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("INCIDENT RESPONSE REPORT")).toBeInTheDocument();
  });

  it("renders fired variant with dark web listing", () => {
    render(<IncidentReport {...baseProps} ending="fired" verdict="FIRED" color="#ef4444" />);
    expect(screen.getByText("[DARK WEB MARKETPLACE]")).toBeInTheDocument();
    expect(screen.getByText(/SIMULATION/)).toBeInTheDocument();
  });

  it("renders lateral variant", () => {
    render(<IncidentReport {...baseProps} ending="lateral" verdict="LATERAL" color="#3b82f6" />);
    expect(screen.getAllByText("LATERAL").length).toBeGreaterThanOrEqual(1);
  });

  it("renders neutral variant", () => {
    render(<IncidentReport {...baseProps} ending="neutral" verdict="NEUTRAL" color="#a1a1aa" />);
    expect(screen.getAllByText("NEUTRAL").length).toBeGreaterThanOrEqual(1);
  });

  it("displays category scores", () => {
    render(<IncidentReport {...baseProps} ending="promoted" verdict="PROMOTED" color="#22c55e" />);
    expect(screen.getAllByText("23/25").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("25/25").length).toBeGreaterThanOrEqual(1);
  });

  it("displays analyst remark", () => {
    render(<IncidentReport {...baseProps} ending="promoted" verdict="PROMOTED" color="#22c55e" remark="Test remark here." />);
    expect(screen.getByText(/Test remark here/)).toBeInTheDocument();
  });
});
