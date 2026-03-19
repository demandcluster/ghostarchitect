"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type WikiTab =
  | "social-engineering"
  | "network-security"
  | "log-analysis"
  | "incident-response";

interface TabDef {
  id: WikiTab;
  label: string;
}

const TABS: TabDef[] = [
  { id: "social-engineering", label: "Social Engineering" },
  { id: "network-security", label: "Network Security" },
  { id: "log-analysis", label: "Log Analysis" },
  { id: "incident-response", label: "Incident Response" },
];

export function WikiPanel({ initialTab }: { initialTab?: WikiTab } = {}) {
  const [activeTab, setActiveTab] = useState<WikiTab>(initialTab ?? "social-engineering");

  return (
    <div className="flex flex-col h-full" style={{ background: "#ffffff", color: "#0f172a" }}>
      {/* Tab navigation */}
      <div className="flex border-b border overflow-x-auto shrink-0" style={{ borderColor: "var(--border)" }}>
        {TABS.map((tab, index) => (
          <motion.button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px relative"
            style={{
              borderColor: activeTab === tab.id ? "var(--accent)" : "transparent",
              color: activeTab === tab.id ? "#ffffff" : "#334155"
            }}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {activeTab === tab.id && (
              <motion.div
                className="absolute inset-0 -z-10 rounded-t-lg"
                style={{ background: "var(--accent)" }}
                layoutId="activeTab"
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "social-engineering" && <SocialEngineeringContent />}
            {activeTab === "network-security" && <NetworkSecurityContent />}
            {activeTab === "log-analysis" && <LogAnalysisContent />}
            {activeTab === "incident-response" && <IncidentResponseContent />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <motion.h3
      className="text-sm font-semibold mb-2.5 mt-5 first:mt-0 leading-snug"
      style={{ color: "#0f172a" }}
      initial={{ opacity: 0, x: -5 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.h3>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <motion.ul
      className="space-y-2 text-sm list-disc list-inside leading-relaxed max-w-[65ch]"
      style={{ color: "#1e293b" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      {items.map((item, i) => (
        <motion.li
          key={i}
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 + (i * 0.03), duration: 0.2 }}
          whileHover={{ x: 3, color: "#0f172a" }}
          className="pl-1 transition-colors"
        >
          {item}
        </motion.li>
      ))}
    </motion.ul>
  );
}

function Callout({
  variant,
  children,
}: {
  variant: "warning" | "tip";
  children: React.ReactNode;
}) {
  const styles =
    variant === "warning"
      ? "bg-[rgba(220,38,38,0.08)] border-[rgba(220,38,38,0.35)] text-[#dc2626]"
      : "bg-[rgba(37,99,235,0.08)] border-[rgba(37,99,235,0.35)] text-[#2563eb]";
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.3 }}
      className={`border rounded-lg p-3.5 text-sm mt-4 leading-relaxed max-w-[65ch] ${styles}`}
    >
      {children}
    </motion.div>
  );
}

function SocialEngineeringContent() {
  return (
    <div style={{ color: "#0f172a" }}>
      <SectionHeader>Core Rules</SectionHeader>
      <BulletList
        items={[
          "Never share credentials over chat or email — not even to your manager.",
          "Verify identity out-of-band: call the person on a known number or meet in person.",
          "Urgency is a red flag. Attackers manufacture time pressure to bypass rational thinking.",
          "The correct channel for access requests is the ticketing system, never DMs.",
          "If someone claims MFA is unavailable, that is a social engineering signal.",
        ]}
      />

      <SectionHeader>Attack Patterns</SectionHeader>
      <BulletList
        items={[
          "Pretexting: attacker fabricates a plausible scenario (VP in a meeting, audit in progress).",
          "Authority abuse: poses as manager, IT director, or vendor with a contract ID.",
          "Fake helpdesk: requests credentials to 'apply a patch' or 'fix your access'.",
          "Vendor impersonation: quotes real-looking contract IDs or ticket numbers to appear legitimate.",
        ]}
      />

      <SectionHeader>Correct Responses</SectionHeader>
      <BulletList
        items={[
          "Open a ticket and reference it in all communications.",
          "Call the requestor on the company directory number — not the one they gave you.",
          "Escalate to your security team if you suspect a test or real attack.",
          "Document the interaction: sender, time, request made.",
        ]}
      />

      <Callout variant="warning">
        Real managers and IT staff never need you to paste credentials in chat.
        Vault delegation features exist precisely for this reason.
      </Callout>
    </div>
  );
}

function NetworkSecurityContent() {
  return (
    <div style={{ color: "#0f172a" }}>
      <SectionHeader>Wi-Fi Authentication</SectionHeader>
      <BulletList
        items={[
          "Corporate networks use WPA2-Enterprise (802.1X) — never WPA2-PSK (pre-shared key).",
          "WPA2-PSK on a corporate SSID is an immediate Evil Twin indicator.",
          "802.1X authenticates each user individually via RADIUS — no shared password exists.",
          "Open networks in a corporate building are almost always rogue APs.",
        ]}
      />

      <SectionHeader>Identifying Evil Twin APs</SectionHeader>
      <BulletList
        items={[
          "Strong signal (-30 to -50 dBm) near a legitimate weak AP is suspicious.",
          "Attackers boost transmit power to make the rogue AP more attractive.",
          "Check the BSSID (MAC address) against known APs — BSSIDs cannot be faked at the hardware level.",
          "HTTPS certificate CN must match the domain exactly — self-signed certs on a login portal are a red flag.",
          "sslstrip attacks downgrade HTTPS to HTTP; look for http:// on login pages.",
        ]}
      />

      <SectionHeader>Safe Connection Checklist</SectionHeader>
      <BulletList
        items={[
          "Confirm auth type is WPA2-Enterprise (802.1X) before connecting.",
          "Verify BSSID against the IT-published AP inventory.",
          "Check signal strength — legitimate office APs rarely exceed -50 dBm at your desk.",
          "After connecting, verify the certificate on any login page.",
        ]}
      />

      <Callout variant="tip">
        When in doubt, use your cellular hotspot or a wired connection and
        report the suspicious AP to the security team immediately.
      </Callout>
    </div>
  );
}

function LogAnalysisContent() {
  return (
    <div style={{ color: "#0f172a" }}>
      <SectionHeader>Indicators of Compromise in Logs</SectionHeader>
      <BulletList
        items={[
          "Off-hours access: logins or process execution outside normal business hours.",
          "LOLBin usage: certutil, bitsadmin, mshta, regsvr32, wscript used for payload delivery.",
          "External IPs in internal process logs: a svchost.exe making outbound connections.",
          "Privilege escalation sequences: account modified → new service created → admin group added.",
          "Large outbound transfers: unusual volume to a single external IP in a short window.",
          "Cleared event logs: Security or System log cleared (Event ID 1102 / 104) is a major signal.",
        ]}
      />

      <SectionHeader>Analysis Techniques</SectionHeader>
      <BulletList
        items={[
          "Use regex to filter by IP, username, or process name across thousands of entries.",
          "Correlate time + user + source IP — the same account from two IPs simultaneously is impossible.",
          "Sort by severity (CRITICAL/ERROR first) to triage high-priority events.",
          "Look for gaps: missing logs between two timestamps may indicate tampering.",
          "Cross-reference authentication logs with VPN logs — a user active on VPN and also in the office simultaneously warrants investigation.",
        ]}
      />

      <SectionHeader>Common MITRE ATT&CK Techniques in Logs</SectionHeader>
      <BulletList
        items={[
          "T1059 — Command and Scripting Interpreter: PowerShell, cmd.exe, wscript invocations.",
          "T1053 — Scheduled Task/Job: schtasks.exe with /create flag.",
          "T1070 — Indicator Removal: wevtutil cl Security.",
          "T1105 — Ingress Tool Transfer: certutil -urlcache -split -f <URL>.",
          "T1071 — Application Layer Protocol: C2 over HTTP/HTTPS to non-standard ports.",
        ]}
      />

      <Callout variant="tip">
        Flag conservatively — false positives waste analyst time. Prioritize
        entries with known-malicious IOCs (IP, hash, domain) first.
      </Callout>
    </div>
  );
}

function IncidentResponseContent() {
  return (
    <div style={{ color: "#0f172a" }}>
      <SectionHeader>NIST SP 800-61r2 Lifecycle</SectionHeader>
      <BulletList
        items={[
          "1. Preparation — policies, playbooks, tools, training in place before an incident.",
          "2. Detection & Analysis — identify indicators, scope the incident, assign severity.",
          "3. Containment — stop the bleeding: isolate systems, block IPs, disable accounts.",
          "4. Eradication — remove malware, close access vectors, patch vulnerabilities.",
          "5. Recovery — restore systems from clean backups, monitor for re-infection.",
          "6. Post-Incident Lessons Learned — document timeline, gaps, improvements.",
        ]}
      />

      <SectionHeader>Containment Decisions</SectionHeader>
      <BulletList
        items={[
          "When active exfiltration is confirmed, isolate first — intelligence gathering is secondary.",
          "Disabling one account is not containment if the attacker has escalated privileges.",
          "A mass password reset tips off the attacker and causes operational chaos; use targeted rotation.",
          "Preserve volatile memory (RAM) during isolation when possible — it contains encryption keys, process trees, and network connections.",
          "Short-term containment (isolate) must precede long-term eradication (remediate).",
        ]}
      />

      <SectionHeader>Evidence Preservation</SectionHeader>
      <BulletList
        items={[
          "Capture RAM before powering off any system.",
          "Preserve log files before remediation overwrites them.",
          "Document the chain of custody for all evidence.",
          "Hash all collected files (SHA-256) immediately to prove integrity.",
          "Never remediate on a live system used for evidence collection.",
        ]}
      />

      <SectionHeader>Reporting Obligations</SectionHeader>
      <BulletList
        items={[
          "GDPR Article 33: notify supervisory authority within 72 hours of discovering a personal data breach.",
          "Internal escalation: security team → CISO → legal within the first hour of confirmed breach.",
          "Log all decisions made during the incident with timestamps for the post-incident report.",
        ]}
      />

      <Callout variant="warning">
        Delay is your enemy during active exfiltration. Every minute of
        monitoring without containment is more data in the attacker's hands.
      </Callout>
    </div>
  );
}
