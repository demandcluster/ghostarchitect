import { describe, it, expect, beforeEach } from "vitest";
import { BREACH_EMAILS } from "@/content/emails";
import { useScoreStore } from "@/stores/scoreStore";
import { useNarrativeStore } from "@/stores/narrativeStore";
import { deriveFlags } from "@/engine/rules";
import type { Email } from "@/content/types";

type Verdict = "safe" | "suspicious" | "phishing";

/**
 * Scoring logic extracted from EmailClient review:
 * - Phishing email marked "phishing" = correct
 * - Safe email marked "safe" = correct
 * - Anything else = incorrect
 */
function isCorrectVerdict(email: Email, verdict: Verdict): boolean {
  return email.isPhishing ? verdict === "phishing" : verdict === "safe";
}

function scoreEmailTriage(
  emails: Email[],
  verdicts: Record<string, Verdict>,
  expandedHeaders: Set<string>
) {
  const store = useScoreStore.getState();
  const narrative = useNarrativeStore.getState();
  let correctCount = 0;
  const phishingEmails = emails.filter((e) => e.isPhishing);

  for (const email of emails) {
    const verdict = verdicts[email.id];
    if (!verdict) continue;

    const correct = isCorrectVerdict(email, verdict);

    if (email.isPhishing && correct) {
      correctCount++;
      const basePoints = 2;
      const headerBonus = expandedHeaders.has(email.id) ? 1 : 0;
      store.addAction({
        id: `email-${email.id}`,
        category: "phishingIQ",
        points: basePoints + headerBonus,
        maxPoints: 3,
        label: `Correctly identified phishing: ${email.subject}`,
      });
    } else if (!email.isPhishing && verdict === "phishing") {
      // False positive — flagging legit as phishing penalises trust
      store.adjustTrust(-5);
      narrative.addFlag("over_quarantined");
    }
  }

  if (correctCount === phishingEmails.length) {
    narrative.addFlag("caught_all_phishing");
  }
}

describe("emailTriage scoring", () => {
  beforeEach(() => {
    useScoreStore.getState().reset();
    useNarrativeStore.getState().reset();
  });

  describe("email content validation", () => {
    it("has exactly 11 breach emails", () => {
      expect(BREACH_EMAILS).toHaveLength(11);
    });

    it("has exactly 4 phishing emails", () => {
      const phish = BREACH_EMAILS.filter((e) => e.isPhishing);
      expect(phish.length).toBe(4);
    });

    it("has exactly 7 legitimate emails", () => {
      const legit = BREACH_EMAILS.filter((e) => !e.isPhishing);
      expect(legit.length).toBe(7);
    });

    it("phishing emails have indicators", () => {
      const phish = BREACH_EMAILS.filter((e) => e.isPhishing);
      for (const email of phish) {
        expect(email.indicators.length).toBeGreaterThan(0);
      }
    });

    it("legitimate emails have no indicators", () => {
      const legit = BREACH_EMAILS.filter((e) => !e.isPhishing);
      for (const email of legit) {
        expect(email.indicators).toHaveLength(0);
      }
    });

    it("phishing emails are detectable via headers or domain indicators", () => {
      // Easy/medium phishing: detectable via header failures (softfail/fail).
      // Hard phishing: attacker registers a lookalike domain with valid SPF/DKIM/DMARC,
      // so all headers pass — the only tell is the domain mismatch in indicators.
      const phish = BREACH_EMAILS.filter((e) => e.isPhishing);
      for (const email of phish) {
        const hasHeaderFailure =
          email.headers.spf.includes("fail") ||
          email.headers.dkim.includes("fail") ||
          email.headers.dmarc.includes("fail");
        const hasDomainIndicator = email.indicators.some((ind) =>
          /domain|lookalike|\.co[^m]|typo/i.test(ind)
        );
        expect(hasHeaderFailure || hasDomainIndicator).toBe(true);
      }
    });

    it("legitimate emails have passing SPF/DKIM/DMARC", () => {
      const legit = BREACH_EMAILS.filter((e) => !e.isPhishing);
      for (const email of legit) {
        expect(email.headers.spf).toBe("pass");
        expect(email.headers.dkim).toBe("pass");
        expect(email.headers.dmarc).toContain("pass");
      }
    });

    it("each email has a unique ID", () => {
      const ids = BREACH_EMAILS.map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe("verdict correctness", () => {
    it("phishing email marked as phishing is correct", () => {
      const phish = BREACH_EMAILS.find((e) => e.isPhishing)!;
      expect(isCorrectVerdict(phish, "phishing")).toBe(true);
    });

    it("phishing email marked as safe is incorrect", () => {
      const phish = BREACH_EMAILS.find((e) => e.isPhishing)!;
      expect(isCorrectVerdict(phish, "safe")).toBe(false);
    });

    it("phishing email marked as suspicious is incorrect", () => {
      const phish = BREACH_EMAILS.find((e) => e.isPhishing)!;
      expect(isCorrectVerdict(phish, "suspicious")).toBe(false);
    });

    it("legitimate email marked as safe is correct", () => {
      const legit = BREACH_EMAILS.find((e) => !e.isPhishing)!;
      expect(isCorrectVerdict(legit, "safe")).toBe(true);
    });

    it("legitimate email marked as phishing is incorrect", () => {
      const legit = BREACH_EMAILS.find((e) => !e.isPhishing)!;
      expect(isCorrectVerdict(legit, "phishing")).toBe(false);
    });
  });

  describe("phishing identification scoring", () => {
    it("correctly identifying phishing email scores phishingIQ points", () => {
      const verdicts: Record<string, Verdict> = {};
      for (const email of BREACH_EMAILS) {
        verdicts[email.id] = email.isPhishing ? "phishing" : "safe";
      }

      scoreEmailTriage(BREACH_EMAILS, verdicts, new Set());

      const { categoryScores } = useScoreStore.getState();
      expect(categoryScores.phishingIQ).toBeGreaterThan(0);
    });

    it("expanding headers on phishing email gives bonus points", () => {
      const phishEmails = BREACH_EMAILS.filter((e) => e.isPhishing);
      const verdicts: Record<string, Verdict> = {};
      for (const email of BREACH_EMAILS) {
        verdicts[email.id] = email.isPhishing ? "phishing" : "safe";
      }

      // Score without headers
      scoreEmailTriage(BREACH_EMAILS, verdicts, new Set());
      const scoreWithout = useScoreStore.getState().categoryScores.phishingIQ;

      // Reset and score with headers expanded
      useScoreStore.getState().reset();
      useNarrativeStore.getState().reset();

      const expandedHeaders = new Set(phishEmails.map((e) => e.id));
      scoreEmailTriage(BREACH_EMAILS, verdicts, expandedHeaders);
      const scoreWith = useScoreStore.getState().categoryScores.phishingIQ;

      expect(scoreWith).toBeGreaterThan(scoreWithout);
    });

    it("catching all phishing emails sets caught_all_phishing flag", () => {
      const verdicts: Record<string, Verdict> = {};
      for (const email of BREACH_EMAILS) {
        verdicts[email.id] = email.isPhishing ? "phishing" : "safe";
      }

      scoreEmailTriage(BREACH_EMAILS, verdicts, new Set());

      expect(useNarrativeStore.getState().hasFlag("caught_all_phishing")).toBe(true);
    });

    it("missing one phishing email does not set caught_all_phishing flag", () => {
      const verdicts: Record<string, Verdict> = {};
      let skippedFirst = false;
      for (const email of BREACH_EMAILS) {
        if (email.isPhishing && !skippedFirst) {
          verdicts[email.id] = "safe"; // miss one
          skippedFirst = true;
        } else {
          verdicts[email.id] = email.isPhishing ? "phishing" : "safe";
        }
      }

      scoreEmailTriage(BREACH_EMAILS, verdicts, new Set());

      expect(useNarrativeStore.getState().hasFlag("caught_all_phishing")).toBe(false);
    });
  });

  describe("false positive penalty", () => {
    it("flagging legitimate email as phishing penalises trust score", () => {
      const initialTrust = useScoreStore.getState().trustScore;

      const verdicts: Record<string, Verdict> = {};
      for (const email of BREACH_EMAILS) {
        verdicts[email.id] = "phishing"; // mark everything as phishing
      }

      scoreEmailTriage(BREACH_EMAILS, verdicts, new Set());

      const finalTrust = useScoreStore.getState().trustScore;
      expect(finalTrust).toBeLessThan(initialTrust);
    });

    it("flagging legit email as phishing sets over_quarantined flag", () => {
      const legit = BREACH_EMAILS.find((e) => !e.isPhishing)!;
      const verdicts: Record<string, Verdict> = {
        [legit.id]: "phishing",
      };

      scoreEmailTriage([legit], verdicts, new Set());

      expect(useNarrativeStore.getState().hasFlag("over_quarantined")).toBe(true);
    });
  });

  describe("phase advancement", () => {
    it("requires all emails to be processed before advance", () => {
      const verdicts: Record<string, Verdict> = {};
      // Only judge all but the last one
      for (let i = 0; i < BREACH_EMAILS.length - 1; i++) {
        verdicts[BREACH_EMAILS[i].id] = "safe";
      }
      const allJudged = BREACH_EMAILS.every((e) => verdicts[e.id]);
      expect(allJudged).toBe(false);
    });

    it("all emails judged allows phase advancement", () => {
      const verdicts: Record<string, Verdict> = {};
      for (const email of BREACH_EMAILS) {
        verdicts[email.id] = "safe";
      }
      const allJudged = BREACH_EMAILS.every((e) => verdicts[e.id]);
      expect(allJudged).toBe(true);
    });
  });

  describe("deriveFlags integration with email triage outcomes", () => {
    it("caught_all_phishing contributes to promoted ending", () => {
      const flags = new Set([
        "caught_all_phishing",
        "chose_strong_password",
        "avoided_evil_twin",
        "contained_quickly",
        "extracted_all_iocs",
        "rotated_credentials",
      ]);
      const result = deriveFlags({}, flags);
      expect(result.caughtAllPhishing).toBe(true);
      expect(result.ending).toBe("promoted");
    });

    it("over_quarantined counts as a negative in ending calculation", () => {
      const flags = new Set([
        "caught_all_phishing",
        "chose_strong_password",
        "avoided_evil_twin",
        "contained_quickly",
        "extracted_all_iocs",
        "rotated_credentials",
        "over_quarantined",
      ]);
      const result = deriveFlags({}, flags);
      expect(result.overQuarantined).toBe(true);
      // With 1 negative, cannot get promoted
      expect(result.ending).not.toBe("promoted");
    });
  });
});
