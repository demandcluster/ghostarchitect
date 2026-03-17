export const PRE_BREACH_EMAIL_TEMPLATE = `Generate {count} normal corporate emails for a cybersecurity training scenario.

Requirements:
- Valid SPF/DKIM/DMARC headers (pass/fail values)
- Professional corporate language
- Include IT announcements, onboarding information
- Locale: {locale}
- From/To: use realistic corporate domains (e.g., @nexuscorp.com)

Format as JSON array matching Email interface. Each email must have: id, from, to, subject, date, body, headers (with returnPath, spf, dkim, dmarc), isPhishing (false), indicators ([]), difficulty ("easy"|"medium"|"hard").`;

export const BREACH_EMAIL_TEMPLATE = `Generate {count} phishing emails for a corporate cybersecurity training scenario.

Requirements:
- Valid SPF/DKIM/DMARC headers (pass/fail/p=none/p=quarantine/p=reject)
- Include 1-3 subtle phishing indicators per email
- Mix of easy/medium/hard difficulty
- Urgency tactics, suspicious from addresses
- Locale: {locale}

Format as JSON array matching Email interface. Each email must have: id, from, to, subject, date, body, headers (with returnPath, spf, dkim, dmarc), difficulty ("easy"|"medium"|"hard").`;
