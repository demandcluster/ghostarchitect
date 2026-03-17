export const SOCIAL_ENGINEERING_DM_TEMPLATE = `Generate {count} social engineering DM messages for a cybersecurity training scenario.

Requirements:
- Realistic corporate jargon (IT director, security manager, help desk)
- Phishing attempts: credential requests, urgent access, vendor impersonation
- Multi-choice responses with correct/wrong options
- Include trustDelta (-20 to +20) and scoring (0-5 points)
- Avatar initials, senderRole field
- Locale: {locale}

Format as JSON array matching DMMessage interface. Each message must have: id, sender, senderRole, avatar, text, timestamp (number), choices array. Each choice must have: id, label, isCorrect, trustDelta, optional scoreEffect, optional nextMessageId, optional flag.`;

export const NPC_BAD_ADVICE_TEMPLATE = `Generate {count} bad advice messages from security staff during incident response scenario.

Requirements:
- Poor containment advice (disable account only, ignore logs, mass password reset)
- Realistic security roles (network engineer, help desk, senior sysadmin)
- Incorrect guidance that sounds plausible
- Include trustDelta (-10 to -5) and scoring
- Locale: {locale}

Format as JSON array matching DMMessage interface with isBadAdvice: true. Each message must have: id, sender, senderRole, avatar, text, timestamp (number), choices array. Each choice must have: id, label, isCorrect, trustDelta, optional scoreEffect.`;
