"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useScoreStore } from "@/stores/scoreStore";
import { useNarrativeStore } from "@/stores/narrativeStore";
import { useGameStore } from "@/stores/gameStore";

import type { WiFiNetwork } from "@/content/types";

interface EvilTwinWiFiProps {
  onComplete: () => void;
  networks?: WiFiNetwork[];
}

interface WiFiAP {
  id: string;
  ssid: string;
  bssid: string;
  signal: number;
  authType: string;
  isEvil: boolean;
  indicators?: string[];
}

export function EvilTwinWiFi({ onComplete, networks }: EvilTwinWiFiProps) {
  const [selectedAP, setSelectedAP] = useState<WiFiAP | null>(null);
  const [connected, setConnected] = useState(false);
  const [showPacketCapture, setShowPacketCapture] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const addAction = useScoreStore((s) => s.addAction);
  const adjustTrust = useScoreStore((s) => s.adjustTrust);
  const addFlag = useNarrativeStore((s) => s.addFlag);
  const setDecision = useNarrativeStore((s) => s.setDecision);
  const fakeDomain = useGameStore((s) => s.fakeDomain);
  const teamName = useGameStore((s) => s.teamName);

  const accessPoints = useMemo<WiFiAP[]>(() => {
    // The challenge always shows exactly 2 APs with the same corporate SSID:
    // one legitimate (WPA2-Enterprise, normal signal) and one evil twin (WPA2-PSK, strong signal).
    // AI-generated network data provides indicators/hints but the core pair is always built from the team name.
    const randomMAC = () => Array.from({length: 6}, () => Math.floor(Math.random()*256).toString(16).padStart(2,'0').toUpperCase()).join(':');

    // Extract any AI-provided indicators for the evil twin
    let evilIndicators: string[] = [];
    if (networks && networks.length > 0) {
      for (const n of networks) {
        const raw = n as unknown as Record<string, unknown>;
        const typeStr = String(raw.type || raw.category || '').toLowerCase();
        const isEvil = n.isEvilTwin === true || /evil|suspicious|rogue|fake|malicious/i.test(typeStr);
        if (isEvil) {
          const ind = n.indicators || (Array.isArray(raw.indicators) ? raw.indicators as string[] : Array.isArray(raw.hints) ? raw.hints as string[] : []);
          if (ind.length > 0) { evilIndicators = ind as string[]; break; }
        }
      }
    }

    const corpSSID = `${teamName}-Secure`;
    const legitMAC = randomMAC();
    const evilMAC = randomMAC();

    const pair: WiFiAP[] = [
      {
        id: "wifi-legit",
        ssid: corpSSID,
        bssid: legitMAC,
        signal: -(Math.floor(Math.random() * 20) + 60), // -60 to -80 dBm (normal)
        authType: "WPA2-Enterprise (802.1X)",
        isEvil: false,
      },
      {
        id: "wifi-evil",
        ssid: corpSSID,
        bssid: evilMAC,
        signal: -(Math.floor(Math.random() * 10) + 30), // -30 to -40 dBm (suspiciously strong)
        authType: "WPA2-PSK",
        isEvil: true,
        indicators: evilIndicators.length > 0 ? evilIndicators : [
          `Signal strength is unusually strong for this location`,
          `WPA2-PSK instead of expected 802.1X enterprise auth`,
          `Unknown BSSID (${evilMAC}) not in corporate AP inventory`,
        ],
      },
    ];

    // Add AI-generated background networks (non-evil ones as environmental noise)
    const extras: WiFiAP[] = [];
    if (networks && networks.length > 0) {
      for (const n of networks) {
        const raw = n as unknown as Record<string, unknown>;
        const typeStr = String(raw.type || raw.category || '').toLowerCase();
        const isEvil = n.isEvilTwin === true || /evil|suspicious|rogue|fake|malicious/i.test(typeStr);
        if (isEvil) continue; // skip — we already have our evil twin
        const name = String(n.ssid || raw.ssid || raw.name || raw.networkName || '');
        if (!name || name.toLowerCase().includes(teamName.toLowerCase())) continue; // skip duplicates of corp SSID
        extras.push({
          id: String(n.id || raw.id || `wifi-bg-${extras.length}`),
          ssid: name,
          bssid: String(n.bssid || raw.bssid || '') || randomMAC(),
          signal: Number(n.signalStrength ?? raw.signalStrength ?? raw.signal ?? -(Math.floor(Math.random() * 30) + 50)),
          authType: String(n.authType || raw.authType || raw.auth || raw.security || 'Open'),
          isEvil: false,
        });
      }
    }

    // If no AI extras, add hardcoded background noise
    if (extras.length === 0) {
      const defaultExtras: WiFiAP[] = [
        { id: "wifi-bg-guest", ssid: "Airport_FreeWiFi", bssid: randomMAC(), signal: -(Math.floor(Math.random() * 15) + 55), authType: "Open", isEvil: false },
        { id: "wifi-bg-neighbor", ssid: "NETGEAR-5G-Home", bssid: randomMAC(), signal: -(Math.floor(Math.random() * 10) + 70), authType: "WPA2-PSK", isEvil: false },
        { id: "wifi-bg-iot", ssid: "HP-Print-A3-LaserJet", bssid: randomMAC(), signal: -(Math.floor(Math.random() * 10) + 75), authType: "WPA2-PSK", isEvil: false },
      ];
      extras.push(...defaultExtras);
    }

    // Combine: evil twin pair + up to 3 background networks, then shuffle
    const all = [...pair, ...extras.slice(0, 3)];
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all;
  }, [networks, teamName]);

  useEffect(() => {
    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [connected, showPacketCapture]);

  const handleConnect = (ap: WiFiAP) => {
    setSelectedAP(ap);
    setDecision("wifi_choice", ap.isEvil ? "evil_twin" : "legitimate");
    setDecision("wifi_ssid", ap.ssid);
    setDecision("wifi_signal", String(ap.signal));
    setDecision("wifi_auth", ap.authType);

    if (ap.isEvil) {
      addAction({
        id: "wifi-evil",
        category: "networkSecurity",
        points: 0,
        maxPoints: 75,
        label: `Connected to Evil Twin AP (${ap.ssid})`,
      });
      adjustTrust(-25);
      setShowPacketCapture(true);
    } else {
      addAction({
        id: "wifi-legit",
        category: "networkSecurity",
        points: 75,
        maxPoints: 75,
        label: `Connected to legitimate AP (${ap.ssid})`,
      });
      adjustTrust(20);
      addFlag("avoided_evil_twin");
      setConnected(true);
    }
  };

  if (showPacketCapture) {
    return (
      <div ref={containerRef} className="overflow-auto h-full">
        <PacketCaptureView
          fakeDomain={fakeDomain}
          onContinue={() => {
            setShowPacketCapture(false);
            setConnected(true);
          }}
        />
      </div>
    );
  }

  if (connected) {
    return (
      <div ref={containerRef} className="overflow-auto h-full">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-6 max-w-lg mx-auto"
      >
        <div
          className={`p-4 rounded-lg border ${
            selectedAP?.isEvil
              ? "bg-[var(--danger-subtle)] border-[var(--danger)]/40"
              : "bg-[var(--success-subtle)] border-[var(--success)]/35"
          }`}
        >
          {selectedAP?.isEvil ? (
            <>
              <p className="text-sm font-medium text-[var(--danger)]">
                You connected to an Evil Twin!
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-2">
                The packet capture showed your credentials being intercepted via
                sslstrip. Key indicators you missed:
              </p>
              <ul className="text-xs text-[var(--text-secondary)] mt-1 list-disc list-inside space-y-0.5">
                {selectedAP?.indicators && selectedAP.indicators.length > 0 ? (
                  selectedAP.indicators.map((ind, i) => <li key={i}>{ind}</li>)
                ) : (
                  <>
                    <li>Signal strength {selectedAP?.signal} dBm is unusually strong</li>
                    <li>{selectedAP?.authType} instead of 802.1X enterprise auth</li>
                    <li>Different BSSID than the known corporate APs</li>
                  </>
                )}
              </ul>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-[var(--accent)]">
                Correct! You identified the legitimate access point.
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-2">
                Key indicators: {selectedAP?.authType} authentication,
                expected BSSID, and normal signal strength ({selectedAP?.signal} dBm).
              </p>
            </>
          )}
        </div>

        <button
          onClick={onComplete}
          className="mt-4 w-full py-2 bg-[var(--accent)] text-white rounded text-sm font-medium hover:bg-[var(--accent)]-hover transition-colors"
        >
          Continue
        </button>
      </motion.div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="overflow-auto h-full">
    <div className="p-6 max-w-lg mx-auto">
      <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">
        Connect to Wi-Fi
      </h2>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        Your workstation needs a Wi-Fi connection. Two networks match the
        company SSID. Choose carefully.
      </p>

      <div className="space-y-3">
        {accessPoints.map((ap, idx) => (
          <button
            key={ap.id || ap.bssid || `wifi-${idx}`}
            onClick={() => handleConnect(ap)}
            className="w-full p-4 border border-[var(--border)] rounded-lg text-left hover:border-[var(--accent)] transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm text-[var(--text-primary)]">
                {ap.ssid}
              </span>
              <SignalBars strength={ap.signal} />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[var(--text-secondary)]">
              <div>
                <span className="text-[var(--text-muted)]">BSSID:</span>{" "}
                <span className="font-mono text-[var(--text-secondary)]">{ap.bssid}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">Signal:</span>{" "}
                <span className="font-mono text-[var(--text-secondary)]">{ap.signal} dBm</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">Auth:</span>{" "}
                <span className="text-[var(--text-secondary)]">{ap.authType}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
    </div>
  );
}

function SignalBars({ strength }: { strength: number }) {
  // -30 = max, -90 = min
  const bars = strength > -45 ? 4 : strength > -60 ? 3 : strength > -75 ? 2 : 1;
  return (
    <div className="flex items-end gap-0.5 h-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`w-1 rounded-sm ${
            i <= bars ? "bg-[var(--accent)]" : "bg-gray-300"
          }`}
          style={{ height: `${i * 25}%` }}
        />
      ))}
    </div>
  );
}

function PacketCaptureView({
  fakeDomain,
  onContinue,
}: {
  fakeDomain: string;
  onContinue: () => void;
}) {
  const mailHost = `mail.${fakeDomain}`;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 max-w-2xl mx-auto"
    >
      <h3 className="text-base font-bold text-[var(--danger)] mb-3">
        Packet Capture — Credential Interception Detected
      </h3>

      <div className="bg-[var(--bg-window)] rounded-lg p-4 font-mono text-xs leading-relaxed overflow-auto max-h-64">
        <div className="text-[var(--danger)]">
          [sslstrip] Stripping SSL from connection to {mailHost}
        </div>
        <div className="text-[var(--warning)]">
          [HTTP] POST /auth/login HTTP/1.1
        </div>
        <div className="text-[var(--text-muted)]">
          Host: {mailHost}
        </div>
        <div className="text-[var(--text-muted)]">
          Content-Type: application/x-www-form-urlencoded
        </div>
        <div className="text-[var(--danger)] mt-2">
          username=your.name%40{fakeDomain}&password=********
        </div>
        <div className="text-[var(--danger)] mt-2">
          [ALERT] Credentials captured in plaintext via sslstrip
        </div>
        <div className="text-[var(--text-muted)] mt-2">
          [INFO] Captive portal certificate: CN={fakeDomain}
        </div>
        <div className="text-[var(--warning)]">
          [WARN] Certificate issuer: self-signed (NOT DigiCert)
        </div>
      </div>

      <p className="text-xs text-[var(--text-muted)] mt-3">
        The Evil Twin AP intercepted your connection using sslstrip, downgrading
        HTTPS to HTTP and capturing credentials in plaintext.
      </p>

      <button
        onClick={onContinue}
        className="mt-4 w-full py-2 bg-[var(--accent)] text-white rounded text-sm font-medium hover:bg-[var(--accent)]-hover transition-colors"
      >
        Continue
      </button>
    </motion.div>
  );
}
