const REMARK_MAP: [flag: string, remark: string][] = [
  ["clicked_phishing_link", "Clicked a phishing link. The attacker sends their regards."],
  ["fell_for_social_engineering", "Handed credentials to a vendor impersonator within 30 seconds. We've updated the gullibility benchmarks accordingly."],
  ["over_quarantined", "Quarantined PowerShell. The sysadmins would like a word."],
  ["failed_ioc_extraction", "Attempted IOC extraction solo and documented almost none of them. CSIRT redid the work and billed the hours to this department."],
  ["gave_creds_to_vendor", "Shared their password with a stranger on the internet. Boldly going where no security policy wanted them to go."],
  ["chose_strong_password", "Selected a 128-bit passphrase. The password cracker filed a formal complaint."],
  ["caught_all_phishing", "Flagged every phishing email without breaking a sweat. We're checking if they wrote the phishing emails."],
  ["avoided_evil_twin", "Spotted the evil twin AP by BSSID alone. Either well-trained or deeply paranoid. Both useful."],
  ["extracted_all_iocs", "Extracted all six IOCs in under two minutes. The threat actor is requesting a transfer."],
  ["deferred_to_csirt", "Escalated to CSIRT instead of freelancing the forensics. Someone actually read the incident response plan. Framed it for the break room."],
];
const GENERIC_REMARK = "Performed adequately. HR has no further comment at this time.";

export function getStaticRemark(flags: Set<string>): string {
  for (const [flag, remark] of REMARK_MAP) {
    if (flags.has(flag)) return remark;
  }
  return GENERIC_REMARK;
}

// Module-level cache for AI remark prefetching.
// DebriefPage calls prefetchRemark(), EndingPage calls getCachedRemark().
let cachedRemark: string | null = null;
let fetchPromise: Promise<string> | null = null;

export function prefetchRemark(flags: Set<string>, playerHandle: string, ending: string): void {
  if (fetchPromise) return; // already in flight
  const flagList = Array.from(flags).join(",");
  fetchPromise = fetch(
    `/api/v1/content/analyst-remark?flags=${encodeURIComponent(flagList)}&handle=${encodeURIComponent(playerHandle || "Analyst")}&verdict=${ending}`
  )
    .then((r) => (r.ok ? r.json() : { remark: "" }))
    .then((data) => {
      cachedRemark = data.remark || null;
      return cachedRemark || "";
    })
    .catch(() => {
      cachedRemark = null;
      return "";
    });
}

export function getCachedRemark(): string | null {
  return cachedRemark;
}

export function resetRemarkCache(): void {
  cachedRemark = null;
  fetchPromise = null;
}
