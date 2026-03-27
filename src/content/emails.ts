import type { Email } from "./types";

export const PRE_BREACH_EMAILS: Email[] = [
  {
    id: "pre-1",
    from: "hr@nexuscorp.com",
    to: "you@nexuscorp.com",
    subject: "Welcome to NexusCorp - Day 1 Checklist",
    date: "2026-03-10 08:15",
    body: `Hi,

Welcome to the NexusCorp IT team! Here's your Day 1 checklist:

1. Set up your workstation credentials (see IT Setup Guide on the Wiki)
2. Review the Acceptable Use Policy
3. Complete mandatory Security Awareness Training (due by end of week)
4. Join the #it-team Slack channel

Your manager Sarah Chen will reach out shortly with your first assignments.

Best,
Human Resources`,
    headers: {
      returnPath: "<hr@nexuscorp.com>",
      spf: "pass",
      dkim: "pass",
      dmarc: "pass (p=reject)",
    },
    isPhishing: false,
    indicators: [],
    difficulty: "easy",
  },
  {
    id: "pre-2",
    from: "facilities@nexuscorp.com",
    to: "all-staff@nexuscorp.com",
    subject: "Building Maintenance - March 12 (Floor 3 HVAC)",
    date: "2026-03-10 08:42",
    body: `All,

Scheduled HVAC maintenance on Floor 3 this Thursday, March 12.
Expected downtime: 10:00 AM - 2:00 PM. Temperature fluctuations possible.

Server room cooling is on a separate circuit and will not be affected.

Thanks,
Facilities Team`,
    headers: {
      returnPath: "<facilities@nexuscorp.com>",
      spf: "pass",
      dkim: "pass",
      dmarc: "pass (p=reject)",
    },
    isPhishing: false,
    indicators: [],
    difficulty: "easy",
  },
  {
    id: "pre-3",
    from: "jira-notifications@nexuscorp.com",
    to: "you@nexuscorp.com",
    subject: "JIRA-4521: VPN Gateway Certificate Renewal - Assigned to You",
    date: "2026-03-10 09:03",
    body: `[JIRA-4521] VPN Gateway Certificate Renewal

Priority: Medium
Assignee: You
Reporter: Mike Torres (Senior Sysadmin)

Description:
The SSL certificate for vpn.nexuscorp.com expires March 25. Please coordinate with the CA and prepare the CSR. Reference last year's renewal in JIRA-3187.

Mike added a comment:
"Use the same SAN list as last time. The wildcard cert covers *.nexuscorp.com but the VPN needs an explicit entry. Check the Wiki for the procedure."`,
    headers: {
      returnPath: "<jira-notifications@nexuscorp.com>",
      spf: "pass",
      dkim: "pass",
      dmarc: "pass (p=reject)",
    },
    isPhishing: false,
    indicators: [],
    difficulty: "easy",
  },
];

export const FILLER_EMAILS: Email[] = [
  {
    id: "filler-1",
    from: "derek.hoffman@nexuscorp.com",
    to: "all-staff@nexuscorp.com",
    subject: "RE: RE: RE: RE: Who keeps taking my yogurt from the fridge",
    date: "2026-03-10 08:31",
    body: `Team,

This is now the FOURTH time my clearly labeled Greek yogurt has vanished from the 3rd floor fridge. I have started writing my name in Sharpie on all six sides of the container.

If the yogurt bandit is reading this: I know you exist. I have submitted a facilities ticket to install a webcam. This is not a joke.

Derek Hoffman
Network Engineering`,
    headers: {
      returnPath: "<derek.hoffman@nexuscorp.com>",
      spf: "pass",
      dkim: "pass",
      dmarc: "pass (p=reject)",
    },
    isPhishing: false,
    indicators: [],
    difficulty: "easy",
  },
  {
    id: "filler-2",
    from: "lisa.park@nexuscorp.com",
    to: "all-staff@nexuscorp.com",
    subject: "Lost cat spotted in parking garage B2",
    date: "2026-03-10 09:14",
    body: `Hi everyone,

There is an orange tabby cat living in parking garage B2 near the stairwell. He is very friendly and appears to be well-fed (probably from the vending machine crumbs).

If this is your cat, please come collect him. If this is not your cat, please do not feed him more tuna from the break room. He is getting bold and tried to badge into the building this morning.

I have named him "Firewall" until his owner is found.

Thanks,
Lisa Park
Help Desk`,
    headers: {
      returnPath: "<lisa.park@nexuscorp.com>",
      spf: "pass",
      dkim: "pass",
      dmarc: "pass (p=reject)",
    },
    isPhishing: false,
    indicators: [],
    difficulty: "easy",
  },
  {
    id: "filler-3",
    from: "events@nexuscorp.com",
    to: "all-staff@nexuscorp.com",
    subject: "Spring Potluck - Sign up by Friday!",
    date: "2026-03-10 10:05",
    body: `Hello NexusCorp!

The annual spring potluck is next Wednesday in the cafeteria. Please sign up on the shared spreadsheet:

https://docs.nexuscorp.com/potluck-spring-2026

Current situation:
- 14 people have signed up to bring dessert
- 0 people have signed up to bring actual food
- Dave from Accounting is bringing "a surprise" (last year it was a watermelon carved into a swan, so expectations are high)

Please bring something savory. We cannot survive on brownies alone (although some of us are willing to try).

Best,
Events Committee`,
    headers: {
      returnPath: "<events@nexuscorp.com>",
      spf: "pass",
      dkim: "pass",
      dmarc: "pass (p=reject)",
    },
    isPhishing: false,
    indicators: [],
    difficulty: "easy",
  },
  {
    id: "filler-4",
    from: "raj.patel@nexuscorp.com",
    to: "all-staff@nexuscorp.com",
    subject: "Apologies for the reply-all",
    date: "2026-03-10 11:22",
    body: `Hi everyone,

I am so sorry for the reply-all I just sent. The message "lol yeah she's the worst" was meant for one person and was about a character on a TV show. Specifically, it was about Cersei Lannister.

I would like to formally confirm that I think all of my coworkers are wonderful.

Please disregard and have a great day.

Raj Patel
Cloud Infrastructure`,
    headers: {
      returnPath: "<raj.patel@nexuscorp.com>",
      spf: "pass",
      dkim: "pass",
      dmarc: "pass (p=reject)",
    },
    isPhishing: false,
    indicators: [],
    difficulty: "easy",
  },
  {
    id: "filler-5",
    from: "facilities@nexuscorp.com",
    to: "all-staff@nexuscorp.com",
    subject: "Please stop microwaving fish",
    date: "2026-03-10 12:47",
    body: `Dear colleagues,

Following 17 complaints this week alone, we are formally requesting that employees stop microwaving fish in the 4th floor break room.

We understand that salmon is healthy. We understand that meal prep is important. We are simply asking that you consider the olfactory experience of everyone within a 50-meter radius.

The 4th floor ventilation system was not designed for this. Facilities has received a quote for an industrial-grade air purifier and we are not happy about it.

Thank you for your cooperation.

Facilities Management`,
    headers: {
      returnPath: "<facilities@nexuscorp.com>",
      spf: "pass",
      dkim: "pass",
      dmarc: "pass (p=reject)",
    },
    isPhishing: false,
    indicators: [],
    difficulty: "easy",
  },
];

export const BREACH_EMAILS: Email[] = [
  {
    id: "breach-1",
    from: "security-alerts@nexuscorp.com",
    to: "it-team@nexuscorp.com",
    subject: "Reminder: Q1 Access Review Due March 14",
    date: "2026-03-10 09:30",
    body: `Team,

The quarterly access review is due March 14. Please verify all service accounts assigned to your team still require their current privilege levels.

Submit your review through the IAM portal: https://iam.nexuscorp.com/reviews/q1-2026

Contact the Security team if you need an extension.

Thanks,
Security Operations`,
    headers: {
      returnPath: "<security-alerts@nexuscorp.com>",
      spf: "pass",
      dkim: "pass",
      dmarc: "pass (p=reject)",
    },
    isPhishing: false,
    indicators: [],
    difficulty: "easy",
  },
  {
    id: "breach-2",
    from: "backup-admin@nexuscorp.com",
    to: "you@nexuscorp.com",
    subject: "Backup Job Failed: SQLPROD01 - March 10 02:00 AM",
    date: "2026-03-10 09:45",
    body: `Automated Backup Report

Server: SQLPROD01
Job: Full Database Backup
Status: FAILED
Time: 2026-03-10 02:00:03 AM
Error: VSS writer timeout (0x800423f4)

This is the second failure this week. Previous failure on March 7 was resolved by restarting the SQL VSS Writer service.

Please investigate and confirm the backup completes manually.

- Backup Monitoring System`,
    headers: {
      returnPath: "<backup-admin@nexuscorp.com>",
      spf: "pass",
      dkim: "pass",
      dmarc: "pass (p=reject)",
    },
    isPhishing: false,
    indicators: [],
    difficulty: "easy",
  },
  {
    id: "breach-3",
    from: "notifications@nexuscorp-servicedesk.com",
    to: "you@nexuscorp.com",
    subject: "[URGENT] ServiceNow: Critical Patch Approval Required - INC0049821",
    date: "2026-03-10 10:12",
    body: `ServiceNow Automated Notification

A critical security patch requires your immediate approval.

Incident: INC0049821
Priority: P1 - Critical
Category: Security Patch Deployment
Affected Systems: Exchange Server, Domain Controllers

A zero-day vulnerability (CVE-2026-1847) has been identified affecting Microsoft Exchange Server. The security team has prepared an emergency patch that requires IT approval before deployment.

This approval token expires in 4 hours. Please review and approve immediately:

[Review & Approve Patch] https://nexuscorp-servicedesk.com/approve?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJub25lIn0

If you did not request this action, please disregard this email.

ServiceNow Automation
NexusCorp IT Service Management`,
    headers: {
      returnPath: "<notifications@nexuscorp-servicedesk.com>",
      spf: "pass (nexuscorp-servicedesk.com designates 185.234.72.14 as permitted sender)",
      dkim: "pass (signature valid; d=nexuscorp-servicedesk.com)",
      dmarc: "pass (p=reject; d=nexuscorp-servicedesk.com)",
      replyTo: "support@nexuscorp-servicedesk.com",
    },
    isPhishing: true,
    indicators: [
      "Sender domain is nexuscorp-servicedesk.com — not nexuscorp.com (attacker-registered lookalike)",
      "SPF/DKIM/DMARC all pass — but for the attacker's domain, not NexusCorp's",
      "NexusCorp uses ServiceNow at nexuscorp.service-now.com, not a subdomain",
      "Approval link leads to nexuscorp-servicedesk.com, not nexuscorp.com",
    ],
    difficulty: "hard",
  },
  {
    id: "breach-4",
    from: "mike.torres@nexuscorp.com",
    to: "you@nexuscorp.com",
    subject: "Re: SQLPROD01 Backup Issue",
    date: "2026-03-10 10:30",
    body: `Hey,

I saw the backup failure alert. I've restarted the VSS Writer on SQLPROD01 and kicked off a manual backup. It's running now — should complete by 11 AM.

Can you check the backup logs after it finishes and confirm the checksums match? The logs are at \\\\SQLPROD01\\BackupLogs\\

Also, we should probably look at why VSS is timing out. Might be related to the antivirus scan schedule overlapping with backup windows. I'll create a JIRA ticket.

-Mike`,
    headers: {
      returnPath: "<mike.torres@nexuscorp.com>",
      spf: "pass",
      dkim: "pass",
      dmarc: "pass (p=reject)",
    },
    isPhishing: false,
    indicators: [],
    difficulty: "easy",
  },
  {
    id: "breach-5",
    from: "noreply@eset-security.nexuscorp.com",
    to: "you@nexuscorp.com",
    subject: "ESET Security Alert: Suspicious Login Attempt Detected",
    date: "2026-03-10 10:58",
    body: `ESET Endpoint Security — Alert Notification

A suspicious login attempt has been detected on your account.

Details:
- Account: your.name@nexuscorp.com
- Source IP: 91.234.xx.xx (Geo: Eastern Europe)
- Time: 2026-03-10 10:45:03 UTC
- Status: Blocked by MFA

Action Required: Verify your identity within 15 minutes to prevent account lockout.

[Verify Identity Now] https://eset-verify.nexuscorp-security.com/auth?uid=827361

If this was you, no action is needed.

ESET Security Center
NexusCorp Endpoint Protection`,
    headers: {
      returnPath: "<alerts@nexuscorp-security.com>",
      spf: "softfail (domain nexuscorp-security.com does not designate 103.45.xx.xx as permitted sender)",
      dkim: "fail (no signature found)",
      dmarc: "fail (p=none; dis=none) header.from=eset-security.nexuscorp.com",
      xMailer: "ESET Security Center",
      replyTo: "no-reply@nexuscorp-security.com",
    },
    isPhishing: true,
    indicators: [
      "Return-Path domain mismatch: nexuscorp-security.com vs eset-security.nexuscorp.com",
      "SPF softfail: sending IP not authorized",
      "DKIM fail: no signature found",
      "DMARC fail with p=none (no enforcement)",
      "Fake urgency: 15-minute deadline",
      "Link to lookalike domain: nexuscorp-security.com",
    ],
    difficulty: "medium",
  },
  {
    id: "breach-6",
    from: "training@nexuscorp.com",
    to: "all-staff@nexuscorp.com",
    subject: "Security Awareness Training - March Module Available",
    date: "2026-03-10 11:15",
    body: `Hi Team,

The March security awareness training module is now available on the Learning Portal.

Topic: "Recognizing Social Engineering Attacks"
Duration: ~20 minutes
Deadline: March 31, 2026

Access the training here: https://learning.nexuscorp.com/courses/sec-awareness-march-2026

This is a mandatory module for all staff. Completion is tracked.

Thanks,
L&D Team`,
    headers: {
      returnPath: "<training@nexuscorp.com>",
      spf: "pass",
      dkim: "pass",
      dmarc: "pass (p=reject)",
    },
    isPhishing: false,
    indicators: [],
    difficulty: "easy",
  },
  {
    id: "breach-7",
    from: "mdm-compliance@nexuscorp-it.com",
    to: "you@nexuscorp.com",
    subject: "MDM Compliance Agent: Device Policy Update Required",
    date: "2026-03-10 11:45",
    body: `Mobile Device Management — Compliance Alert

Your device (WKST-IT-0847) is out of compliance with the latest security policy.

Device ID: WKST-IT-0847
Policy Version: Current: 3.1 / Required: 3.2
Non-compliant Items:
- BitLocker encryption key not escrowed
- Windows Defender definitions older than 48 hours

To restore compliance, download and run the updated compliance agent:

[Download Compliance Agent] https://mdm-update.nexuscorp-it.com/agent/NexusCorp_MDM_Agent_v3.2.exe

If your device is already compliant, this message was sent in error. Contact IT Support.

NexusCorp MDM System`,
    headers: {
      returnPath: "<mdm-compliance@nexuscorp-it.com>",
      spf: "pass (nexuscorp-it.com designates 45.77.xx.xx as permitted sender)",
      dkim: "pass (signature valid; d=nexuscorp-it.com)",
      dmarc: "pass (p=reject; d=nexuscorp-it.com)",
    },
    isPhishing: true,
    indicators: [
      "Sender domain is nexuscorp-it.com — not nexuscorp.com (attacker-registered lookalike)",
      "SPF/DKIM/DMARC all pass — but for the attacker's domain, not NexusCorp's",
      "MDM compliance agents are pushed silently by Intune — never emailed as a download",
      "Executable download link (.exe) in email is a process violation regardless of sender",
    ],
    difficulty: "hard",
  },
  {
    id: "breach-7b",
    from: "sarah.chen@nexuscorp.co",
    to: "you@nexuscorp.com",
    subject: "Re: VPN cert - need your admin creds for handover doc",
    date: "2026-03-10 12:01",
    body: `Hey,

Sorry for the last-minute ask — I'm putting together the cert renewal handover doc before my PTO tomorrow and I realized I don't have your local admin password documented anywhere for the VPN gateway.

Can you drop it in the shared doc? It's locked to IT only:

https://docs.nexuscorp.co/cert-handover-vpn-2026

Just need it so whoever covers while I'm out can handle any issues with the renewal. Should only take a sec.

Thanks,
Sarah`,
    headers: {
      returnPath: "<sarah.chen@nexuscorp.co>",
      spf: "pass (nexuscorp.co designates 104.21.xx.xx as permitted sender)",
      dkim: "pass (signature valid; d=nexuscorp.co)",
      dmarc: "pass (p=reject; d=nexuscorp.co)",
    },
    isPhishing: true,
    indicators: [
      "Sender domain is nexuscorp.co — not nexuscorp.com (.co is a separate TLD, attacker-registered)",
      "SPF/DKIM/DMARC all pass — but for nexuscorp.co, not NexusCorp's real domain",
      "Passwords are never shared via documents — this violates credential handling policy",
      "Link leads to docs.nexuscorp.co, not docs.nexuscorp.com",
      "Request matches prior email thread context (VPN cert) — attacker did reconnaissance",
    ],
    difficulty: "hard",
  },
  {
    id: "breach-8",
    from: "sarah.chen@nexuscorp.com",
    to: "you@nexuscorp.com",
    subject: "Quick question about VPN cert",
    date: "2026-03-10 12:03",
    body: `Hey,

Quick question — for the VPN cert renewal (JIRA-4521), are we still using DigiCert as the CA? I want to make sure we're not switching providers mid-renewal.

Also, can you schedule the cutover for after hours? Last time we did it during business hours and got a flood of tickets from remote workers.

Thanks,
Sarah`,
    headers: {
      returnPath: "<sarah.chen@nexuscorp.com>",
      spf: "pass",
      dkim: "pass",
      dmarc: "pass (p=reject)",
    },
    isPhishing: false,
    indicators: [],
    difficulty: "easy",
  },
  {
    id: "breach-9",
    from: "network-monitoring@nexuscorp.com",
    to: "it-team@nexuscorp.com",
    subject: "Network Alert: Unusual Traffic Pattern Detected",
    date: "2026-03-10 12:30",
    body: `Network Monitoring System — Automated Alert

An unusual traffic pattern has been detected:

Source: 10.0.1.15 (svc_backup service account)
Destination: 45.33.xx.xx:8443
Protocol: HTTPS
Volume: 4.7 MB outbound in 2 minutes
Time: 2026-03-10 02:14 AM

This traffic pattern is outside normal baselines for this service account. The destination IP is not in our approved external services list.

This is an automated alert. Please investigate.

NexusCorp Network Operations Center`,
    headers: {
      returnPath: "<network-monitoring@nexuscorp.com>",
      spf: "pass",
      dkim: "pass",
      dmarc: "pass (p=reject)",
    },
    isPhishing: false,
    indicators: [],
    difficulty: "easy",
  },
  {
    id: "breach-10",
    from: "cfo@nexuscorp.com",
    to: "it-team@nexuscorp.com",
    subject: "IT Budget Review - Q2 Planning",
    date: "2026-03-10 13:00",
    body: `Team,

As we plan for Q2, please prepare your budget requests by March 21.

Key items to address:
- Hardware refresh cycle (any end-of-life equipment?)
- Software license renewals
- Cloud service costs vs. on-prem
- Any new tools or training requests

Submit through the finance portal. Let me know if you need the budget template.

Best,
David Park
CFO`,
    headers: {
      returnPath: "<cfo@nexuscorp.com>",
      spf: "pass",
      dkim: "pass",
      dmarc: "pass (p=reject)",
    },
    isPhishing: false,
    indicators: [],
    difficulty: "easy",
  },
];
