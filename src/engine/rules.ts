export type Ending = "fired" | "promoted" | "lateral" | "neutral";

export interface DerivedFlags {
  caughtAllPhishing: boolean;
  fellForSocialEngineering: boolean;
  choseStrongPassword: boolean;
  avoidedEvilTwin: boolean;
  containedQuickly: boolean;
  extractedAllIOCs: boolean;
  deferredToCSIRT: boolean;
  failedIOCExtraction: boolean;
  rotatedCredentials: boolean;
  escalatedInTime: boolean;
  overQuarantined: boolean;
  ending: Ending;
}

export function deriveFlags(
  decisions: Record<string, string>,
  flags: Set<string>
): DerivedFlags {
  const caughtAllPhishing = flags.has("caught_all_phishing");
  const fellForSocialEngineering = flags.has("fell_for_social_engineering");
  const choseStrongPassword = flags.has("chose_strong_password");
  const avoidedEvilTwin = flags.has("avoided_evil_twin");
  const containedQuickly = flags.has("contained_quickly");
  const extractedAllIOCs = flags.has("extracted_all_iocs");
  const deferredToCSIRT = flags.has("deferred_to_csirt");
  const failedIOCExtraction = flags.has("failed_ioc_extraction");
  const rotatedCredentials = flags.has("rotated_credentials");
  const escalatedInTime = flags.has("escalated_in_time");
  const overQuarantined = flags.has("over_quarantined");

  const positives = [
    caughtAllPhishing,
    choseStrongPassword,
    avoidedEvilTwin,
    containedQuickly,
    extractedAllIOCs || deferredToCSIRT,
    rotatedCredentials,
    escalatedInTime,
  ].filter(Boolean).length;

  const negatives = [
    fellForSocialEngineering,
    overQuarantined,
    failedIOCExtraction,
  ].filter(Boolean).length;

  let ending: Ending;
  if (positives >= 6 && negatives === 0) {
    ending = "promoted";
  } else if (positives <= 2 || negatives >= 2) {
    ending = "fired";
  } else if (positives >= 4) {
    ending = "lateral";
  } else {
    ending = "neutral";
  }

  return {
    caughtAllPhishing,
    fellForSocialEngineering,
    choseStrongPassword,
    avoidedEvilTwin,
    containedQuickly,
    extractedAllIOCs,
    deferredToCSIRT,
    failedIOCExtraction,
    rotatedCredentials,
    escalatedInTime,
    overQuarantined,
    ending,
  };
}
