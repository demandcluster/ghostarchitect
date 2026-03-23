import { describe, it, expect } from "vitest";
import { getStaticRemark } from "../analystRemarks";

describe("getStaticRemark", () => {
  it("returns negative flag remark with highest priority", () => {
    const flags = new Set(["chose_strong_password", "clicked_phishing_link"]);
    const remark = getStaticRemark(flags);
    expect(remark).toContain("phishing link");
  });
  it("returns positive flag remark when no negatives", () => {
    const flags = new Set(["caught_all_phishing"]);
    const remark = getStaticRemark(flags);
    expect(remark).toContain("phishing email");
  });
  it("returns generic remark when no flags match", () => {
    const remark = getStaticRemark(new Set());
    expect(remark).toContain("HR");
  });
  it("prefers fell_for_social_engineering over positive flags", () => {
    const flags = new Set(["fell_for_social_engineering", "avoided_evil_twin"]);
    const remark = getStaticRemark(flags);
    expect(remark).toContain("vendor impersonator");
  });
});
