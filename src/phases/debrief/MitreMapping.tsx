"use client";

interface MitreTechnique {
  id: string;
  name: string;
  tactic: string;
  description: string;
  observedIn: string;
}

const TECHNIQUES: MitreTechnique[] = [
  {
    id: "T1078",
    name: "Valid Accounts",
    tactic: "Persistence / Privilege Escalation",
    description: "Attacker used compromised svc_backup credentials for lateral movement after SSH brute force.",
    observedIn: "SSH login success + NTLM logon with svc_backup",
  },
  {
    id: "T1021.002",
    name: "Remote Services: SMB/Windows Admin Shares",
    tactic: "Lateral Movement",
    description: "NTLM authentication from WKST-UNKNOWN on wrong subnet indicates SMB lateral movement.",
    observedIn: "Event 4624 LogonType=3, WorkstationName=WKST-UNKNOWN",
  },
  {
    id: "T1059.001",
    name: "Command and Scripting Interpreter: PowerShell",
    tactic: "Execution",
    description: "LOLBins used PowerShell download cradles via rundll32 and other system binaries.",
    observedIn: "rundll32.exe → powershell -ep bypass, certutil download",
  },
  {
    id: "T1105",
    name: "Ingress Tool Transfer",
    tactic: "Command and Control",
    description: "Attacker downloaded payloads using certutil and bitsadmin from external C2 server.",
    observedIn: "certutil -urlcache, bitsadmin /transfer, curl to 45.33.91.200",
  },
  {
    id: "T1560.001",
    name: "Archive Collected Data: Archive via Utility",
    tactic: "Collection",
    description: "Data staged with tar+gzip and encrypted with openssl AES-256-CBC before exfiltration.",
    observedIn: "tar czf + openssl enc -aes-256-cbc at 02:15 AM",
  },
  {
    id: "T1041",
    name: "Exfiltration Over C2 Channel",
    tactic: "Exfiltration",
    description: "Encrypted archive uploaded to C2 server via HTTP POST with custom X-Token header.",
    observedIn: "curl POST to 45.33.91.200:8443/upload",
  },
  {
    id: "T1070.003",
    name: "Indicator Removal: Clear Command History",
    tactic: "Defense Evasion",
    description: "Attacker attempted to delete bash_history to cover tracks.",
    observedIn: "auditd syscall=91 (unlink) .bash_history",
  },
];

export function MitreMapping() {
  return (
    <div>
      <h3 className="text-sm font-bold text-text-primary mb-3">
        MITRE ATT&CK Mapping
      </h3>
      <p className="text-xs text-text-secondary mb-4">
        Techniques observed during the Ghost Architect breach, mapped to the
        MITRE ATT&CK framework.
      </p>

      <div className="space-y-2">
        {TECHNIQUES.map((t) => (
          <div
            key={t.id}
            className="p-3 border border-border rounded-lg bg-bg-secondary"
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-accent font-bold">
                {t.id}
              </span>
              <span className="text-xs font-medium text-text-primary">
                {t.name}
              </span>
            </div>
            <div className="text-[10px] text-text-muted mt-0.5">
              Tactic: {t.tactic}
            </div>
            <p className="text-xs text-text-secondary mt-1">{t.description}</p>
            <div className="text-[10px] text-text-muted mt-1 italic">
              Observed: {t.observedIn}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
