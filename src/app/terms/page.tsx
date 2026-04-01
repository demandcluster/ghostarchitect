"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const stagger = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.5, ease: "easeOut" as const },
  }),
};

function Section({ i, title, children }: { i: number; title: string; children: React.ReactNode }) {
  return (
    <motion.section custom={i} initial="hidden" animate="visible" variants={stagger} className="space-y-3">
      <h2 className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: "var(--accent, #00e533)" }}>
        {title}
      </h2>
      {children}
    </motion.section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
      {children}
    </p>
  );
}

function UL({ children }: { children: React.ReactNode }) {
  return (
    <ul className="space-y-1.5 text-sm leading-relaxed list-none" style={{ color: "rgba(255,255,255,0.75)" }}>
      {children}
    </ul>
  );
}

function LI({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span style={{ color: "var(--accent, #00e533)" }} className="mt-0.5 shrink-0">–</span>
      <span>{children}</span>
    </li>
  );
}

function Divider({ i }: { i: number }) {
  return (
    <motion.hr
      custom={i}
      initial="hidden"
      animate="visible"
      variants={stagger}
      style={{ borderColor: "rgba(255,255,255,0.08)" }}
    />
  );
}

export default function TermsPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center px-6 py-16"
      style={{ background: "#050709", color: "#fff" }}
    >
      <div className="w-full max-w-2xl space-y-10">

        {/* Back link */}
        <motion.div custom={0} initial="hidden" animate="visible" variants={stagger}>
          <Link
            href="/trainer"
            className="inline-flex items-center gap-2 text-[11px] font-mono tracking-widest uppercase transition-colors hover:text-white"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            <span>←</span> Back to Trainer Portal
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div custom={1} initial="hidden" animate="visible" variants={stagger} className="space-y-3">
          <div
            className="inline-block px-3 py-1 rounded-full text-[9px] font-bold tracking-[0.3em] uppercase border"
            style={{ color: "var(--accent, #00e533)", borderColor: "rgba(0,229,51,0.3)", background: "rgba(0,229,51,0.06)" }}
          >
            Legal
          </div>
          <h1 className="text-3xl font-black tracking-tight leading-tight">
            Trainer Terms of Service
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)" }} className="text-sm font-mono tracking-wider">
            Version 1.0 &middot; Effective 1 April 2026
          </p>
        </motion.div>

        {/* Read-me callout */}
        <motion.div
          custom={2}
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="rounded-xl p-5 text-sm leading-relaxed"
          style={{
            background: "rgba(0,229,51,0.05)",
            border: "1px solid rgba(0,229,51,0.2)",
            color: "rgba(255,255,255,0.75)",
          }}
        >
          <span style={{ color: "var(--accent, #00e533)" }} className="font-bold">A note before you scroll to the bottom: </span>
          these terms are written to be read, not just accepted. If you are setting up Ghost Architect for your organisation,
          we encourage you to spend five minutes going through them.
          If your security or procurement team needs a data processing summary, <strong className="text-white">section 5</strong> is the place to point them.
        </motion.div>

        <Divider i={3} />

        {/* Parties */}
        <motion.div custom={4} initial="hidden" animate="visible" variants={stagger}>
          <P>
            These Terms are between <strong className="text-white">Demandcluster B.V.</strong>, registered in the Netherlands,
            Diemen (&ldquo;Demandcluster&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) — and the individual registering a
            Trainer account (&ldquo;Trainer&rdquo;, &ldquo;you&rdquo;).
          </P>
        </motion.div>

        <Divider i={5} />

        {/* 1. Definitions */}
        <Section i={6} title="1. Definitions">
          <UL>
            <LI><strong className="text-white">Platform</strong> — The Ghost Architect web application and associated services.</LI>
            <LI><strong className="text-white">Trainer</strong> — An individual who registers an account and creates or manages Sessions on behalf of an Organisation.</LI>
            <LI><strong className="text-white">Organisation</strong> — The employer, client, or institution on whose behalf the Trainer operates.</LI>
            <LI><strong className="text-white">Team / Session</strong> — A group of Participants invited by a Trainer to complete a simulation run.</LI>
            <LI><strong className="text-white">Participant</strong> — An individual who joins a Session via an invite code. Participants do not create accounts.</LI>
          </UL>
        </Section>

        {/* 2. Grant of Use */}
        <Section i={7} title="2. Grant of Use">
          <P>
            Demandcluster grants you a free, non-exclusive, non-transferable right to access and use the Platform solely
            for the purpose described in section 3. No payment is required.
          </P>
        </Section>

        {/* 3. Acceptable Use */}
        <Section i={8} title="3. Acceptable Use">
          <P>
            The Platform is a free contribution to the cybersecurity community. You may use it to:
          </P>
          <UL>
            <LI>Run security awareness training and simulations for your Organisation or clients.</LI>
            <LI>Customise Team branding via the trainer dashboard — white-labelling is permitted and intended.</LI>
          </UL>
          <P>You may not:</P>
          <UL>
            <LI>Use the Platform to conduct actual phishing campaigns, social engineering attacks, or any activity intended to deceive individuals outside of a clearly disclosed training context.</LI>
            <LI>Resell or commercially redistribute access to the Platform.</LI>
            <LI>Use the Platform for any purpose other than security awareness education and training.</LI>
          </UL>
          <P>Violation of these restrictions may result in immediate account termination.</P>
        </Section>

        {/* 4. Participants */}
        <Section i={9} title="4. Participants">
          <P>
            Participants are not registered on the Platform. They join Sessions via an invite code you distribute.
            You are responsible for:
          </P>
          <UL>
            <LI>Ensuring Participants understand they are taking part in a simulation.</LI>
            <LI>Informing Participants they should use only a first name or pseudonym — not their full name or any other identifying information.</LI>
            <LI>Ensuring the Platform is appropriate for your specific audience.</LI>
          </UL>
        </Section>

        {/* 5. Data Processing */}
        <Section i={10} title="5. Data Processing">
          <P>
            <strong className="text-white">Participant data:</strong> No personal data is collected from Participants.
            Each Participant receives an anonymous UUID for the duration of their Session. Any display name entered is
            used only within the active Session and is not linked to any identity. No participant data persists after
            Session deletion.
          </P>
          <P>
            <strong className="text-white">Trainer account data:</strong> We store your username (which can be a generic
            handle — no email required) and a hashed password solely to authenticate your account. No payment data,
            no tracking, no profiling.
          </P>
          <P>
            <strong className="text-white">Team and Session data:</strong> All Session data is associated with your Team.
            You may delete any Team at any time from the trainer dashboard. Deletion is immediate and permanent — no
            backup copies are retained.
          </P>
          <P>
            <strong className="text-white">Infrastructure and sub-processors:</strong>
          </P>
          <div
            className="rounded-lg overflow-hidden text-sm font-mono"
            style={{ border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <table className="w-full">
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)" }}>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold tracking-wider">Sub-processor</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold tracking-wider">Role</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold tracking-wider">Location</th>
                </tr>
              </thead>
              <tbody style={{ color: "rgba(255,255,255,0.7)" }}>
                {[
                  ["Hetzner Online GmbH", "Bare-metal hosting", "Germany (EU)"],
                  ["OVH SAS", "Bare-metal hosting", "France (EU)"],
                  ["Cloudflare Inc.", "Ingress / Zero Trust proxy", "US (EU SCCs apply)"],
                ].map(([name, role, loc], idx) => (
                  <tr key={name} style={{ borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.06)" : undefined }}>
                    <td className="px-4 py-2.5">{name}</td>
                    <td className="px-4 py-2.5" style={{ color: "rgba(255,255,255,0.5)" }}>{role}</td>
                    <td className="px-4 py-2.5" style={{ color: "rgba(255,255,255,0.5)" }}>{loc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <P>
            The Platform runs on bare-metal infrastructure we operate directly, deployed in a fully redundant 2+1
            configuration across Hetzner and OVH. No other sub-processors handle your data.
          </P>
          <P>
            For security annex or data processing agreement requests, contact:{" "}
            <a
              href="mailto:enquiries@ghostarchitectgame.com"
              className="underline underline-offset-2 hover:text-white transition-colors"
              style={{ color: "var(--accent, #00e533)" }}
            >
              enquiries@ghostarchitectgame.com
            </a>
          </P>
        </Section>

        {/* 6. Intellectual Property */}
        <Section i={11} title="6. Intellectual Property">
          <P>
            The Platform, simulation content, and all associated materials remain the intellectual property of
            Demandcluster B.V. You may not extract, copy, or redistribute simulation content outside of normal
            Platform use. Branding assets you upload to customise your Team (logos, names) remain your property.
          </P>
        </Section>

        {/* 7. Availability */}
        <Section i={12} title="7. Availability">
          <P>
            The Platform is provided free of charge without a formal service level agreement. We operate a fully
            redundant 2+1 configuration across Hetzner (Germany) and OVH (France) bare-metal infrastructure and aim
            for high availability, but do not guarantee specific uptime. Planned maintenance will be communicated
            where possible.
          </P>
        </Section>

        {/* 8. Limitation of Liability */}
        <Section i={13} title="8. Limitation of Liability">
          <P>
            To the maximum extent permitted by Dutch law, Demandcluster B.V. and its contributors are not liable for
            any direct, indirect, incidental, or consequential damages arising from your use of, or inability to use,
            the Platform. The Platform is provided &ldquo;as is&rdquo; without warranty of any kind.
          </P>
        </Section>

        {/* 9. Termination */}
        <Section i={14} title="9. Termination">
          <P>
            Demandcluster may suspend or terminate your Trainer account at any time if these Terms are violated. You
            may delete your account and all associated data at any time from the trainer dashboard. Upon termination,
            all Team and Session data associated with your account is deleted immediately.
          </P>
        </Section>

        {/* 10. Governing Law */}
        <Section i={15} title="10. Governing Law &amp; Jurisdiction">
          <P>
            These Terms are governed by the laws of the Netherlands. Any disputes arising from or related to these
            Terms shall be submitted exclusively to the competent court in Amsterdam.
          </P>
        </Section>

        {/* 11. Changes */}
        <Section i={16} title="11. Changes to These Terms">
          <P>
            Demandcluster may update these Terms from time to time. When we do, the version date at the top of this
            page will be updated. Continued use of the Platform after changes are posted constitutes acceptance. We
            encourage you to review these Terms periodically.
          </P>
        </Section>

        {/* 12. Contact */}
        <Section i={17} title="12. Contact">
          <motion.div
            custom={17}
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="rounded-xl p-6 space-y-2"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <P>
              <strong className="text-white">Demandcluster B.V.</strong>
            </P>
            <P>Diemen, Netherlands</P>
            <P>
              <a
                href="mailto:enquiries@ghostarchitectgame.com"
                className="underline underline-offset-2 hover:text-white transition-colors"
                style={{ color: "var(--accent, #00e533)" }}
              >
                enquiries@ghostarchitectgame.com
              </a>
            </P>
          </motion.div>
        </Section>

        <Divider i={18} />

        {/* Footer */}
        <motion.div
          custom={19}
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="text-center font-mono text-[9px] tracking-widest uppercase pt-2"
          style={{ color: "rgba(255,255,255,0.15)" }}
        >
          &copy; 2026 Ghost Architect &middot; Demandcluster B.V. &middot; Diemen, Netherlands
        </motion.div>

      </div>
    </div>
  );
}
