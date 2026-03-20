"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { useGameStore } from "@/stores/gameStore";
import { useScoreStore } from "@/stores/scoreStore";
import { useNarrativeStore } from "@/stores/narrativeStore";
import type { Email } from "@/content/types";

type Verdict = "safe" | "suspicious" | "phishing";

interface EmailClientProps {
  emails: Email[];
  onComplete: (results: Record<string, Verdict>) => void;
}

function applyDomain(text: string, fakeDomain: string, teamName: string, playerHandle: string): string {
  if (!text || typeof text !== 'string') return text || '';
  const fakeBase = fakeDomain.split(".")[0];
  
  // Standard branding replacements
  let branded = text
    .replace(/nexuscorp\.com/gi, fakeDomain)
    .replace(/nexuscorp-servicedesk\.com/gi, `${fakeBase}-servicedesk.com`)
    .replace(/nexuscorp-security\.com/gi, `${fakeBase}-security.com`)
    .replace(/nexuscorp-it\.com/gi, `${fakeBase}-it.com`)
    .replace(/NexusCorp/g, teamName);

  // Placeholder replacements supporting both {{tag}} and [tag]
  const replacements = [
    { regex: /{{teamName}}|\[teamName\]|\bteamName\b/gi, value: teamName },
    { regex: /{{fakeDomain}}|\[fakeDomain\]|\bfakeDomain(?:\.com)?\b/gi, value: fakeDomain },
    { regex: /{{playerHandle}}|\[playerHandle\]|\bplayerHandle\b/gi, value: playerHandle },
  ];

  replacements.forEach(({ regex, value }) => {
    branded = branded.replace(regex, value);
  });

  return branded;
}

function brandEmail(email: Email, index: number, fakeDomain: string, teamName: string, playerHandle: string): Email {
  const sub = (s: string) => applyDomain(s, fakeDomain, teamName, playerHandle);
  const subOpt = (s?: string) => (s ? sub(s) : s);

  // Helper to catch malformed AI strings
  const clean = (val: any): string | undefined => {
    if (val === null || val === undefined) return undefined;
    const s = String(val).trim();
    if (s.toLowerCase() === 'undefined' || s.toLowerCase() === 'null' || s === '') return undefined;
    return s;
  };

  // Helper to get a valid email address from a string like "Name <email@domain.com>" or just "Name"
  const extractEmail = (fromStr: string): string => {
    const match = fromStr.match(/<(.+?)>/);
    if (match) return match[1];
    if (fromStr.includes('@')) return fromStr.trim();
    // If it's just a name, slugify it
    return fromStr.toLowerCase().replace(/\s+/g, '.') + '@' + fakeDomain;
  };

  // Heal missing fields locally as well
  const from = sub(clean(email.from) || clean((email as any).sender) || 'system@' + fakeDomain);
  const body = sub(clean(email.body) || clean((email as any).text) || clean((email as any).message) || '');
  const subject = sub(clean(email.subject) || clean((email as any).title) || 'No Subject');
  const to = sub(clean(email.to) || clean((email as any).recipient) || playerHandle + '@' + fakeDomain);
  
  // Ensure date is valid for splitting
  let date = clean(email.date) || clean((email as any).timestamp) || clean((email as any).time) || '';
  if (!date || !date.includes(' ')) {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].slice(0, 5);
    date = `${dateStr} ${timeStr}`;
  }

  // Heal missing headers logic
  const rawHeaders = email.headers || {} as any;
  const isPhish = email.isPhishing;

  // Use extractEmail to ensure returnPath is a valid email, not a display name
  const healedReturnPath = clean(rawHeaders.returnPath) || `<${extractEmail(from)}>`;
  const returnPath = healedReturnPath.startsWith('<') ? healedReturnPath : `<${healedReturnPath}>`;

  const headers = {
    returnPath: sub(returnPath),
    spf: sub(clean(rawHeaders.spf) || (isPhish ? 'fail' : 'pass')),
    dkim: sub(clean(rawHeaders.dkim) || (isPhish ? 'fail' : 'pass')),
    dmarc: sub(clean(rawHeaders.dmarc) || (isPhish ? 'fail' : 'pass')),
    xMailer: clean(rawHeaders.xMailer) ? subOpt(String(rawHeaders.xMailer)) : undefined,
    replyTo: clean(rawHeaders.replyTo) ? subOpt(String(rawHeaders.replyTo)) : undefined,
  };

  // Enforce realistic phishing headers: if it's phishing, ensure at least some headers fail
  // or the return path is mismatched.
  if (isPhish) {
    if (headers.spf.toLowerCase() === 'pass') headers.spf = 'fail (softfail)';
    if (headers.dkim.toLowerCase() === 'pass') headers.dkim = 'fail (bad signature)';
    if (headers.dmarc.toLowerCase() === 'pass') headers.dmarc = 'fail (p=none)';
  }

  if (index === 0) {
    console.log("[EmailClient] First email headers:", headers);
  }

  // Generate a strictly unique ID for this instance to avoid selection glitches
  const id = `${email.id || 'gen'}-${index}`;

  return {
    ...email,
    id,
    from,
    to,
    subject,
    body,
    date,
    headers,
    indicators: email.indicators?.filter((i) => i) || [],
  };
}

function parseBodySegments(body: string, fakeDomain: string, isPhish: boolean): Array<{ type: "text" | "url"; value: string }> {
  // Support both real URLs and the [phishing-link] placeholder (case-insensitive, optional brackets)
  const urlPattern = /https?:\/\/[^\s)>\]]+|\[?phishing-link\]?/gi;
  const segments: Array<{ type: "text" | "url"; value: string }> = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = urlPattern.exec(body)) !== null) {
    if (m.index > last) segments.push({ type: "text", value: body.slice(last, m.index) });
    
    let urlValue = m[0];
    const isPhishTag = urlValue.toLowerCase().includes("phishing-link");
    
    if (isPhishTag) {
      const fakeBase = fakeDomain.split(".")[0];
      urlValue = isPhish 
        ? `https://${fakeBase}-secure-auth.net/login/verify`
        : `https://kb.${fakeDomain}/security/verify-identity`;
    }
    
    segments.push({ type: "url", value: urlValue });
    last = m.index + m[0].length;
  }
  if (last < body.length) segments.push({ type: "text", value: body.slice(last) });
  return segments;
}

export function EmailClient({ emails, onComplete }: EmailClientProps) {
  const fakeDomain = useGameStore((s) => s.fakeDomain);
  const teamName = useGameStore((s) => s.teamName);
  const playerHandle = useGameStore((s) => s.playerHandle) || "User";
  const adjustTrust = useScoreStore((s) => s.adjustTrust);
  const addFlag = useNarrativeStore((s) => s.addFlag);
  const [linkAlert, setLinkAlert] = useState<{ url: string; isPhishing: boolean } | null>(null);
  
  const brandedEmails = useMemo(
    () => emails.map((e, idx) => brandEmail(e, idx, fakeDomain, teamName, playerHandle)),
    [emails, fakeDomain, teamName, playerHandle]
  );

  const [selectedId, setSelectedId] = useState("");

  // Sync selectedId when emails are first loaded
  useEffect(() => {
    if (brandedEmails.length > 0 && !selectedId) {
      console.log("[EmailClient] Initializing selectedId with first email:", brandedEmails[0].id);
      setSelectedId(brandedEmails[0].id);
    }
  }, [brandedEmails, selectedId]); // Depend on both to catch new lists or missing initial selection

  // If selectedId becomes invalid (e.g. after a phase change), reset it
  useEffect(() => {
    if (selectedId && brandedEmails.length > 0) {
      const exists = brandedEmails.some(e => e.id === selectedId);
      if (!exists) {
        console.log("[EmailClient] Selection invalid, resetting to first email");
        setSelectedId(brandedEmails[0].id);
      }
    }
  }, [brandedEmails, selectedId]);

  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});
  const [expandedHeaders, setExpandedHeaders] = useState<Set<string>>(new Set());
  const [showReview, setShowReview] = useState(false);

  const selectedEmail = useMemo(
    () => {
      const found = brandedEmails.find((e) => e.id === selectedId);
      if (brandedEmails.length > 0) {
        console.log("[EmailClient] Selection debug:", { selectedId, foundId: found?.id, hasBody: !!found?.body });
      }
      return found;
    },
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
    <div className="flex h-full min-h-[500px]">
      <div className="w-[30%] border-r overflow-auto" style={{ borderColor: "var(--border)" }}>
        <div className="p-2 border-b text-xs font-medium" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
          Inbox ({brandedEmails.length})
        </div>
        <LayoutGroup id="email-inbox-list">
          {brandedEmails.map((email, index) => (
            <motion.button
              key={email.id}
              onClick={() => {
                console.log("[EmailClient] Selected email ID:", email.id);
                setSelectedId(email.id);
              }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: verdicts[email.id] ? 0.7 : 1, x: 0 }}
              transition={{ delay: index * 0.03, duration: 0.2 }}
              whileHover={{ scale: 1.01, x: 2 }}
              whileTap={{ scale: 0.99 }}
              className="w-full text-left px-3 py-3.5 border-b text-xs transition-colors relative overflow-hidden"
              style={{
                borderColor: "var(--border)",
                background: selectedId === email.id ? "var(--accent-subtle)" : "rgba(0,0,0,0)",
                borderLeft: selectedId === email.id ? "2px solid var(--accent)" : "none"
              }}
            >
              <AnimatePresence mode="wait">
                {selectedId === email.id && (
                  <motion.div
                    className="absolute inset-0 -z-10"
                    style={{ background: "var(--accent-subtle)" }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    layoutId={`selected-bg-${email.id}`}
                  />
                )}
              </AnimatePresence>
              <div className="text-[13px] font-semibold truncate relative z-10" style={{ color: "var(--text-primary)" }}>
                {email.from}
              </div>
              <div className="truncate mt-0.5 relative z-10" style={{ color: "var(--text-secondary)" }}>
                {email.subject}
              </div>
              <div className="flex items-center justify-between mt-1 relative z-10">
                <span style={{ color: "var(--text-muted)" }}>{email.date?.split(" ")?.[1] ?? "--:--"}</span>
                <AnimatePresence mode="wait">
                  {verdicts[email.id] && (
                    <motion.span
                      key={`verdict-${email.id}`}
                      initial={{ scale: 0, rotate: -10 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        verdicts[email.id] === "phishing"
                          ? "bg-[var(--danger-subtle)] text-[var(--danger)] ring-1 ring-[var(--danger)]/30"
                          : verdicts[email.id] === "suspicious"
                            ? "bg-[var(--warning-subtle)] text-[var(--warning)] ring-1 ring-[var(--warning)]/30"
                            : "bg-[var(--success-subtle)] text-[var(--success)] ring-1 ring-[var(--success)]/30"
                      }`}
                    >
                      {verdicts[email.id]}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </motion.button>
          ))}
        </LayoutGroup>

        <AnimatePresence mode="wait">
          {allJudged && (
            <motion.div
              key="submit-review-btn"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3"
            >
              <motion.button
                onClick={() => setShowReview(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-2 bg-[var(--accent)] text-white rounded text-xs font-medium hover:bg-[var(--accent-hover)] transition-colors"
              >
                Submit & Review
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="w-[70%] overflow-auto">
        <AnimatePresence mode="wait">
          {selectedEmail ? (
            <motion.div
              key={selectedEmail.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="p-5"
            >
              <div className="mb-5">
                <h2 className="text-[17px] font-bold text-[var(--text-primary)] leading-snug">
                  {selectedEmail.subject}
                </h2>
                <div className="text-sm text-[var(--text-secondary)] mt-2">
                  <span className="font-medium">From:</span>{" "}
                  <span className="break-all">{selectedEmail.from}</span>
                </div>
                <div className="text-sm text-[var(--text-muted)]">
                  <span className="font-medium">To:</span> {selectedEmail.to}
                </div>
                <div className="text-sm text-[var(--text-muted)]">
                  <span className="font-medium">Date:</span>{" "}
                  {selectedEmail.date}
                </div>

                <button
                  onClick={() => toggleHeaders(selectedEmail.id)}
                  className="mt-3 text-xs text-[var(--accent)] hover:underline focus:outline-none focus:underline underline-offset-2"
                >
                  {expandedHeaders.has(selectedEmail.id) ? "Collapse Headers" : "Expand Headers"}
                </button>

                <AnimatePresence>
                  {expandedHeaders.has(selectedEmail.id) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 p-3 bg-[var(--bg-window-raised)] rounded border border-[var(--border)] font-mono text-[11px] leading-relaxed">
                        <div className="py-1">
                          <span className="text-[var(--text-muted)]">Return-Path:</span>{" "}
                          <span className={selectedEmail.headers.returnPath?.trim() !== `<${selectedEmail.from}>` ? "bg-[var(--danger-subtle)] text-[var(--danger)] ring-1 ring-[var(--danger)]/30 px-1 rounded" : "bg-[var(--success-subtle)] text-[var(--success)] px-1 rounded"}>
                            {selectedEmail.headers.returnPath}
                          </span>
                        </div>
                        <div className="py-1">
                          <span className="text-[var(--text-muted)]">SPF:</span>{" "}
                          <span className={selectedEmail.headers.spf?.includes?.("fail") ? "bg-[var(--danger-subtle)] text-[var(--danger)] ring-1 ring-[var(--danger)]/30 px-1 rounded" : "bg-[var(--success-subtle)] text-[var(--success)] px-1 rounded"}>
                            {selectedEmail.headers.spf}
                          </span>
                        </div>
                        <div className="py-1">
                          <span className="text-[var(--text-muted)]">DKIM:</span>{" "}
                          <span className={selectedEmail.headers.dkim?.includes?.("fail") ? "bg-[var(--danger-subtle)] text-[var(--danger)] ring-1 ring-[var(--danger)]/30 px-1 rounded" : "bg-[var(--success-subtle)] text-[var(--success)] px-1 rounded"}>
                            {selectedEmail.headers.dkim}
                          </span>
                        </div>
                        <div className="py-1">
                          <span className="text-[var(--text-muted)]">DMARC:</span>{" "}
                          <span className={selectedEmail.headers.dmarc?.includes?.("fail") ? "bg-[var(--danger-subtle)] text-[var(--danger)] ring-1 ring-[var(--danger)]/30 px-1 rounded" : "bg-[var(--success-subtle)] text-[var(--success)] px-1 rounded"}>
                            {selectedEmail.headers.dmarc}
                          </span>
                        </div>
                        {selectedEmail.headers.xMailer && (
                          <div className="py-1">
                            <span className="text-[var(--text-muted)]">X-Mailer:</span>{" "}
                            <span className={selectedEmail.headers.xMailer?.includes?.("PHP") ? "bg-[var(--warning-subtle)] text-[var(--warning)] ring-1 ring-[var(--warning)]/30 px-1 rounded" : "bg-[var(--success-subtle)] text-[var(--success)] px-1 rounded"}>
                              {selectedEmail.headers.xMailer}
                            </span>
                          </div>
                        )}
                        {selectedEmail.headers.replyTo && (
                          <div className="py-1">
                            <span className="text-[var(--text-muted)]">Reply-To:</span>{" "}
                            <span className="bg-[var(--warning-subtle)] text-[var(--warning)] ring-1 ring-[var(--warning)]/30 px-1 rounded">
                              {selectedEmail.headers.replyTo}
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="text-[15px] text-[var(--text-primary)] leading-relaxed border-t border-[var(--border)] pt-5 max-w-[65ch]">
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
                  fakeDomain={fakeDomain}
                />
              </div>

              <AnimatePresence>
                {linkAlert && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`mt-3 p-3 rounded border text-xs ${linkAlert.isPhishing ? "bg-[var(--danger-subtle)] border-[var(--danger)] border-l-4 border-l-[var(--danger)] text-[var(--danger)]" : "bg-[var(--bg-window-raised)] border-[var(--border-strong)] border-l-4 border-l-[var(--border-strong)] text-[var(--text-secondary)]"}`}
                  >
                    {linkAlert.isPhishing ? (
                      <>
                        <span className="font-bold">⚠ PHISHING LINK CLICKED!</span>
                        <span className="ml-2 font-mono opacity-70">{linkAlert.url}</span>
                        <p className="mt-1 text-[var(--text-secondary)]">You clicked a malicious link. Your credentials may have been harvested. −8 trust.</p>
                      </>
                    ) : (
                      <>
                        <span className="font-medium">External link blocked by simulation.</span>
                        <span className="ml-2 font-mono opacity-70">{linkAlert.url}</span>
                      </>
                    )}
                    <button onClick={() => setLinkAlert(null)} className="ml-3 underline opacity-60 hover:opacity-100">dismiss</button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-2 mt-6 pt-5 border-t border-[var(--border)]">
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
                    <motion.button
                      key={v}
                      onClick={() => handleVerdict(selectedEmail.id, v)}
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      className={`flex-1 py-2.5 px-3 rounded-sm text-xs font-semibold transition-all min-h-[2.5rem] relative overflow-hidden ${cls}`}
                    >
                      <AnimatePresence>
                        {isSelected && (
                          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px]">✓</motion.span>
                        )}
                      </AnimatePresence>
                      <span className={isSelected ? "ml-4" : ""}>{v.charAt(0).toUpperCase() + v.slice(1)}</span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div key="empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex items-center justify-center p-4 text-sm text-[var(--text-muted)]">
              Select an email to read.
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function EmailBody({ body, isPhishing, onLinkClick, fakeDomain }: { body: string; isPhishing: boolean; onLinkClick: (url: string, isPhishing: boolean) => void; fakeDomain: string; }) {
  const segments = useMemo(() => parseBodySegments(body, fakeDomain, isPhishing), [body, fakeDomain, isPhishing]);
  return (
    <span className="whitespace-pre-wrap">
      {segments.map((seg, i) => seg.type === "url" ? (
        <button key={i} onClick={() => onLinkClick(seg.value, isPhishing)} className="underline font-mono text-xs break-all text-[var(--accent)] hover:text-[var(--accent-hover)]">{seg.value}</button>
      ) : (
        <span key={i}>{seg.value}</span>
      ))}
    </span>
  );
}

function EmailReview({ emails, verdicts, onDone }: { emails: Email[]; verdicts: Record<string, Verdict>; onDone: () => void; }) {
  return (
    <div className="p-6 overflow-auto h-full">
      <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Email Triage Review</h2>
      <div className="space-y-4">
        {emails.map((email, index) => {
          const verdict = verdicts[email.id];
          const correct = email.isPhishing ? verdict === "phishing" : verdict === "safe";
          return (
            <div key={email.id || `review-${index}`} className={`p-4 rounded-xl border bg-[var(--bg-window-raised)] overflow-hidden ${correct ? "border-[var(--success)]/35" : "border-[var(--danger)]/35"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">{email.subject}</div>
                  <div className="text-xs text-[var(--text-muted)]">{email.from}</div>
                </div>
                <div className="flex gap-2 text-[10px]">
                  <span className={`px-2 py-0.5 rounded ${correct ? "bg-[var(--success-subtle)] text-[var(--success)] ring-1 ring-[var(--success)]/30" : "bg-[var(--danger-subtle)] text-[var(--danger)] ring-1 ring-[var(--danger)]/30"}`}>Your verdict: {verdict}</span>
                  {!correct && <span className="px-2 py-0.5 rounded bg-[var(--info-subtle)] text-[var(--info)] ring-1 ring-[var(--info)]/30">Actual: {email.isPhishing ? "phishing" : "safe"}</span>}
                </div>
              </div>
              {email.indicators.length > 0 && !correct && (
                <div className="mt-2 text-xs text-[var(--warning)]">
                  <span className="font-medium">Missed indicators:</span>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    {email.indicators.map((ind, i) => <li key={i}>{ind}</li>)}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button onClick={onDone} className="mt-6 px-6 py-2 bg-[var(--accent)] text-white rounded text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors">Continue</button>
    </div>
  );
}
