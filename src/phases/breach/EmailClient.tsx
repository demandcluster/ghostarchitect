"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/stores/gameStore";
import { useScoreStore } from "@/stores/scoreStore";
import { useNarrativeStore } from "@/stores/narrativeStore";
import type { Email } from "@/content/types";

type Verdict = "safe" | "suspicious" | "phishing";

interface EmailClientProps {
  emails: Email[];
  onComplete: (results: Record<string, Verdict>) => void;
}

function applyDomain(text: string, fakeDomain: string, teamName: string): string {
  // Derive the base name from the fake domain (e.g. "acme.com" → "acme")
  const fakeBase = fakeDomain.split(".")[0];
  return text
    .replace(/nexuscorp\.com/gi, fakeDomain)
    .replace(/nexuscorp-servicedesk\.com/gi, `${fakeBase}-servicedesk.com`)
    .replace(/nexuscorp-security\.com/gi, `${fakeBase}-security.com`)
    .replace(/nexuscorp-it\.com/gi, `${fakeBase}-it.com`)
    .replace(/NexusCorp/g, teamName);
}

function brandEmail(email: Email, fakeDomain: string, teamName: string): Email {
  const sub = (s: string) => applyDomain(s, fakeDomain, teamName);
  const subOpt = (s?: string) => (s ? sub(s) : s);
  return {
    ...email,
    from: sub(email.from),
    to: sub(email.to),
    subject: sub(email.subject),
    body: sub(email.body),
    headers: {
      returnPath: sub(email.headers.returnPath),
      spf: sub(email.headers.spf),
      dkim: sub(email.headers.dkim),
      dmarc: sub(email.headers.dmarc),
      xMailer: subOpt(email.headers.xMailer),
      replyTo: subOpt(email.headers.replyTo),
    },
    indicators: email.indicators?.map(sub),
  };
}

// Split body text into plain text and URL segments
function parseBodySegments(body: string): Array<{ type: "text" | "url"; value: string }> {
  const urlPattern = /https?:\/\/[^\s)>\]]+/g;
  const segments: Array<{ type: "text" | "url"; value: string }> = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = urlPattern.exec(body)) !== null) {
    if (m.index > last) segments.push({ type: "text", value: body.slice(last, m.index) });
    segments.push({ type: "url", value: m[0] });
    last = m.index + m[0].length;
  }
  if (last < body.length) segments.push({ type: "text", value: body.slice(last) });
  return segments;
}

export function EmailClient({ emails, onComplete }: EmailClientProps) {
  const fakeDomain = useGameStore((s) => s.fakeDomain);
  const teamName = useGameStore((s) => s.teamName);
  const adjustTrust = useScoreStore((s) => s.adjustTrust);
  const addFlag = useNarrativeStore((s) => s.addFlag);
  const [linkAlert, setLinkAlert] = useState<{ url: string; isPhishing: boolean } | null>(null);
  const brandedEmails = useMemo(
    () => emails.map((e) => brandEmail(e, fakeDomain, teamName)),
    [emails, fakeDomain, teamName]
  );
  const [selectedId, setSelectedId] = useState(emails[0]?.id ?? "");
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});
  const [expandedHeaders, setExpandedHeaders] = useState<Set<string>>(
    new Set()
  );
  const [showReview, setShowReview] = useState(false);

  const selectedEmail = useMemo(
    () => brandedEmails.find((e) => e.id === selectedId),
    [brandedEmails, selectedId]
  );

  const allJudged = brandedEmails.every((e) => verdicts[e.id]);

  const handleVerdict = (emailId: string, verdict: Verdict) => {
    setVerdicts((v) => ({ ...v, [emailId]: verdict }));
  };

  const toggleHeaders = (emailId: string) => {
    setExpandedHeaders((prev) => {
      const next = new Set(prev);
      if (next.has(emailId)) next.delete(emailId);
      else next.add(emailId);
      return next;
    });
  };

  if (showReview) {
    return (
      <EmailReview
        emails={brandedEmails}
        verdicts={verdicts}
        onDone={() => {
          setShowReview(false);
          onComplete(verdicts);
        }}
      />
    );
  }

  return (
    <div className="flex h-full">
      {/* Inbox list — 30% */}
      <div className="w-[30%] border-r border-[var(--border)] overflow-auto">
        <div className="p-2 border-b border-[var(--border)] text-xs font-medium text-[var(--text-secondary)]">
          Inbox ({brandedEmails.length})
        </div>
        {brandedEmails.map((email) => (
          <button
            key={email.id}
            onClick={() => setSelectedId(email.id)}
            className={`
              w-full text-left px-3 py-3.5 border-b border-[var(--border)] text-xs transition-colors
              ${selectedId === email.id
                ? "bg-[var(--accent-subtle)] border-l-2 border-l-[var(--accent)]"
                : "hover:bg-[var(--bg-window-raised)]"
              }
              ${verdicts[email.id] ? "opacity-70" : ""}
            `}
          >
            <div className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
              {email.from}
            </div>
            <div className="text-[var(--text-secondary)] truncate mt-0.5">
              {email.subject}
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[var(--text-muted)]">{email.date.split(" ")[1]}</span>
              {verdicts[email.id] && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    verdicts[email.id] === "phishing"
                      ? "bg-[var(--danger-subtle)] text-[var(--danger)] ring-1 ring-[var(--danger)]/30"
                      : verdicts[email.id] === "suspicious"
                        ? "bg-[var(--warning-subtle)] text-[var(--warning)] ring-1 ring-[var(--warning)]/30"
                        : "bg-[var(--success-subtle)] text-[var(--success)] ring-1 ring-[var(--success)]/30"
                  }`}
                >
                  {verdicts[email.id]}
                </span>
              )}
            </div>
          </button>
        ))}

        {allJudged && (
          <div className="p-3">
            <button
              onClick={() => setShowReview(true)}
              className="w-full py-2 bg-[var(--accent)] text-white rounded text-xs font-medium hover:bg-[var(--accent-hover)] transition-colors"
            >
              Submit &amp; Review
            </button>
          </div>
        )}
      </div>

      {/* Reading pane — 70% */}
      <div className="w-[70%] overflow-auto">
        {selectedEmail ? (
          <div className="p-4">
            {/* Email header */}
            <div className="mb-4">
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                {selectedEmail.subject}
              </h2>
              <div className="text-xs text-[var(--text-secondary)] mt-1">
                <span className="font-medium">From:</span>{" "}
                {selectedEmail.from}
              </div>
              <div className="text-xs text-[var(--text-muted)]">
                <span className="font-medium">To:</span> {selectedEmail.to}
              </div>
              <div className="text-xs text-[var(--text-muted)]">
                <span className="font-medium">Date:</span>{" "}
                {selectedEmail.date}
              </div>

              {/* Expand headers button */}
              <button
                onClick={() => toggleHeaders(selectedEmail.id)}
                className="mt-2 text-[10px] text-[var(--accent)] hover:underline"
              >
                {expandedHeaders.has(selectedEmail.id)
                  ? "Collapse Headers"
                  : "Expand Headers"}
              </button>

              {/* Expanded headers */}
              <AnimatePresence>
                {expandedHeaders.has(selectedEmail.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 p-3 bg-[var(--bg-window-raised)] rounded border border-[var(--border)] font-mono text-[11px] leading-relaxed">
                      <div>
                        <span className="text-[var(--text-muted)]">Return-Path:</span>{" "}
                        <span
                          className={
                            selectedEmail.headers.returnPath !==
                            `<${selectedEmail.from}>`
                              ? "bg-[var(--warning-subtle)] ring-1 ring-[var(--warning)] px-1 rounded"
                              : ""
                          }
                        >
                          {selectedEmail.headers.returnPath}
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)]">SPF:</span>{" "}
                        <span
                          className={
                            selectedEmail.headers.spf.includes("fail")
                              ? "bg-[var(--warning-subtle)] ring-1 ring-[var(--warning)] px-1 rounded"
                              : ""
                          }
                        >
                          {selectedEmail.headers.spf}
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)]">DKIM:</span>{" "}
                        <span
                          className={
                            selectedEmail.headers.dkim.includes("fail")
                              ? "bg-[var(--warning-subtle)] ring-1 ring-[var(--warning)] px-1 rounded"
                              : ""
                          }
                        >
                          {selectedEmail.headers.dkim}
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)]">DMARC:</span>{" "}
                        <span
                          className={
                            selectedEmail.headers.dmarc.includes("fail")
                              ? "bg-[var(--warning-subtle)] ring-1 ring-[var(--warning)] px-1 rounded"
                              : ""
                          }
                        >
                          {selectedEmail.headers.dmarc}
                        </span>
                      </div>
                      {selectedEmail.headers.xMailer && (
                        <div>
                          <span className="text-[var(--text-muted)]">X-Mailer:</span>{" "}
                          <span
                            className={
                              selectedEmail.headers.xMailer.includes("PHP")
                                ? "bg-[var(--warning-subtle)] ring-1 ring-[var(--warning)] px-1 rounded"
                                : ""
                            }
                          >
                            {selectedEmail.headers.xMailer}
                          </span>
                        </div>
                      )}
                      {selectedEmail.headers.replyTo && (
                        <div>
                          <span className="text-[var(--text-muted)]">Reply-To:</span>{" "}
                          <span className="bg-[var(--warning-subtle)] ring-1 ring-[var(--warning)] px-1 rounded">
                            {selectedEmail.headers.replyTo}
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Email body */}
            <div className="text-sm text-[var(--text-primary)] leading-relaxed border-t border-[var(--border)] pt-4">
              <EmailBody
                body={selectedEmail.body}
                isPhishing={emails.find((e) => e.id === selectedEmail.id)?.isPhishing ?? false}
                onLinkClick={(url, isPhish) => {
                  if (isPhish) {
                    adjustTrust(-8);
                    addFlag("clicked_phishing_link");
                  }
                  setLinkAlert({ url, isPhishing: isPhish });
                }}
              />
            </div>

            {/* Link click alert */}
            <AnimatePresence>
              {linkAlert && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`mt-3 p-3 rounded border text-xs ${
                    linkAlert.isPhishing
                      ? "bg-[var(--danger-subtle)] border-[var(--danger)] border-l-4 border-l-[var(--danger)] text-[var(--danger)]"
                      : "bg-[var(--bg-window-raised)] border-[var(--border-strong)] border-l-4 border-l-[var(--border-strong)] text-[var(--text-secondary)]"
                  }`}
                >
                  {linkAlert.isPhishing ? (
                    <>
                      <span className="font-bold">⚠ PHISHING LINK CLICKED!</span>
                      <span className="ml-2 font-mono opacity-70">{linkAlert.url}</span>
                      <p className="mt-1 text-[var(--text-secondary)]">
                        You clicked a malicious link. Your credentials may have been harvested. −8 trust.
                      </p>
                    </>
                  ) : (
                    <>
                      <span className="font-medium">External link blocked by simulation.</span>
                      <span className="ml-2 font-mono opacity-70">{linkAlert.url}</span>
                    </>
                  )}
                  <button
                    onClick={() => setLinkAlert(null)}
                    className="ml-3 underline opacity-60 hover:opacity-100"
                  >
                    dismiss
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Verdict buttons */}
            <div className="flex gap-2 mt-6 pt-4 border-t border-[var(--border)]">
              {(["safe", "suspicious", "phishing"] as Verdict[]).map((v) => {
                const isSelected = verdicts[selectedEmail.id] === v;
                let cls = "";
                if (isSelected) {
                  if (v === "safe") cls = "bg-[var(--success)] text-white";
                  else if (v === "suspicious") cls = "bg-[var(--warning)] text-white";
                  else cls = "bg-[var(--danger)] text-white";
                } else {
                  if (v === "safe") cls = "bg-[var(--bg-window-sunken)] text-[var(--text-muted)] border border-[var(--border)] hover:border-[var(--success)] hover:text-[var(--success)]";
                  else if (v === "suspicious") cls = "bg-[var(--bg-window-sunken)] text-[var(--text-muted)] border border-[var(--border)] hover:border-[var(--warning)] hover:text-[var(--warning)]";
                  else cls = "bg-[var(--bg-window-sunken)] text-[var(--text-muted)] border border-[var(--border)] hover:border-[var(--danger)] hover:text-[var(--danger)]";
                }
                return (
                  <button
                    key={v}
                    onClick={() => handleVerdict(selectedEmail.id, v)}
                    className={`flex-1 py-2 rounded text-xs font-medium transition-colors active:scale-[0.97] ${cls}`}
                  >
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-4 text-sm text-[var(--text-muted)]">
            Select an email to read.
          </div>
        )}
      </div>
    </div>
  );
}

/* Renders email body with clickable URL detection */
function EmailBody({
  body,
  isPhishing,
  onLinkClick,
}: {
  body: string;
  isPhishing: boolean;
  onLinkClick: (url: string, isPhishing: boolean) => void;
}) {
  const segments = useMemo(() => parseBodySegments(body), [body]);
  return (
    <span className="whitespace-pre-wrap">
      {segments.map((seg, i) =>
        seg.type === "url" ? (
          <button
            key={i}
            onClick={() => onLinkClick(seg.value, isPhishing)}
            className="underline font-mono text-xs break-all text-[var(--accent)] hover:text-[var(--accent-hover)]"
          >
            {seg.value}
          </button>
        ) : (
          <span key={i}>{seg.value}</span>
        )
      )}
    </span>
  );
}

/* Post-triage review overlay */
function EmailReview({
  emails,
  verdicts,
  onDone,
}: {
  emails: Email[];
  verdicts: Record<string, Verdict>;
  onDone: () => void;
}) {
  return (
    <div className="p-6 overflow-auto h-full">
      <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">
        Email Triage Review
      </h2>

      <div className="space-y-4">
        {emails.map((email) => {
          const verdict = verdicts[email.id];
          const correct = email.isPhishing
            ? verdict === "phishing"
            : verdict === "safe";

          return (
            <div
              key={email.id}
              className={`p-4 rounded-xl border bg-[var(--bg-window-raised)] overflow-hidden ${
                correct
                  ? "border-[var(--success)]/35"
                  : "border-[var(--danger)]/35"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">
                    {email.subject}
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">{email.from}</div>
                </div>
                <div className="flex gap-2 text-[10px]">
                  <span
                    className={`px-2 py-0.5 rounded ${
                      correct
                        ? "bg-[var(--success-subtle)] text-[var(--success)] ring-1 ring-[var(--success)]/30"
                        : "bg-[var(--danger-subtle)] text-[var(--danger)] ring-1 ring-[var(--danger)]/30"
                    }`}
                  >
                    Your verdict: {verdict}
                  </span>
                  {!correct && (
                    <span className="px-2 py-0.5 rounded bg-[var(--info-subtle)] text-[var(--info)] ring-1 ring-[var(--info)]/30">
                      Actual: {email.isPhishing ? "phishing" : "safe"}
                    </span>
                  )}
                </div>
              </div>

              {/* Show missed indicators */}
              {email.indicators.length > 0 && !correct && (
                <div className="mt-2 text-xs text-[var(--warning)]">
                  <span className="font-medium">Missed indicators:</span>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    {email.indicators.map((ind, i) => (
                      <li key={i}>{ind}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={onDone}
        className="mt-6 px-6 py-2 bg-[var(--accent)] text-white rounded text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors"
      >
        Continue
      </button>
    </div>
  );
}
