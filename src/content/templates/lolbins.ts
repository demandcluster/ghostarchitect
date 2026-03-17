export const LOLBIN_TEMPLATE = `Generate {count} LOLBin (Living Off The Land) entries for cybersecurity training.

Requirements:
- Use actual Windows binaries: certutil, bitsadmin, powershell, cmd, wscript, regsvr32, mshta, schtasks, rundll32
- Include both legitimate usage patterns and malicious attack patterns
- MITRE ATT&CK IDs in Txxxx.xxx format
- Process IDs (pid), command lines with flags
- Locale: {locale}

Format as JSON array matching LOLBin interface. Each entry must have: id, processName, pid, commandLine, isMalicious, description, optional mitreId.`;
