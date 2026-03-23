const REMARK_MAP: [flag: string, remark: string][] = [
  ["clicked_phishing_link", "Clicked a phishing link. The attacker sends their regards."],
  ["fell_for_social_engineering", "Handed credentials to a vendor impersonator within 30 seconds. We've updated the gullibility benchmarks accordingly."],
  ["over_quarantined", "Quarantined PowerShell. The sysadmins would like a word."],
  ["gave_creds_to_vendor", "Shared their password with a stranger on the internet. Boldly going where no security policy wanted them to go."],
  ["chose_strong_password", "Selected a 128-bit passphrase. The password cracker filed a formal complaint."],
  ["caught_all_phishing", "Flagged every phishing email without breaking a sweat. We're checking if they wrote the phishing emails."],
  ["avoided_evil_twin", "Spotted the evil twin AP by BSSID alone. Either well-trained or deeply paranoid. Both useful."],
  ["extracted_all_iocs", "Extracted all six IOCs in under two minutes. The threat actor is requesting a transfer."],
];
const GENERIC_REMARK = "Performed adequately. HR has no further comment at this time.";

export function getStaticRemark(flags: Set<string>): string {
  for (const [flag, remark] of REMARK_MAP) {
    if (flags.has(flag)) return remark;
  }
  return GENERIC_REMARK;
}
