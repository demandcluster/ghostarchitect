export const LOG_ENTRY_TEMPLATE = `Generate {count} log entries for a cybersecurity investigation scenario.

Requirements:
- Mix of INFO, WARN, ERROR, CRITICAL levels
- Include legitimate sources: systemd, cron, nginx, postfix
- Include malicious sources: sshd, cmd.exe, powershell.exe
- Realistic timestamps within 24-hour window
- IP addresses in corporate subnet (10.0.0.0/8 or 185.234.x.x)
- MITRE ATT&CK IDs in Txxxx.xxx format
- Include both legitimate and suspicious activity
- Locale: {locale}

Format as JSON array matching LogEntry interface. Each entry must have: id, timestamp, level, source, message, isMalicious, optional attackTechnique and mitreId.`;
