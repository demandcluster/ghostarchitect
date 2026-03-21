"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

function buildDefaultAccessPoints(teamName: string): WiFiAP[] {
  return [
    {
      id: "wifi-legit-default",
      ssid: `${teamName}-Secure`,
      bssid: "AA:BB:CC:11:22:33",
      signal: -72,
      authType: "WPA2-Enterprise (802.1X)",
      isEvil: false,
    },
    {
      id: "wifi-evil-default",
      ssid: `${teamName}-Secure`,
      bssid: "DE:AD:BE:EF:CA:FE",
      signal: -38,
      authType: "WPA2-PSK",
      isEvil: true,
    },
  ];
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
    if (networks && networks.length > 0) {
      return networks.map(n => ({
        id: n.id,
        ssid: n.ssid,
        bssid: n.bssid,
        signal: n.signalStrength,
        authType: n.authType,
        isEvil: n.isEvilTwin,
        indicators: n.indicators
      }));
    }
    return buildDefaultAccessPoints(teamName);
  }, [networks, teamName]);

  useEffect(() => {
    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [connected, showPacketCapture]);

  const handleConnect = (ap: WiFiAP) => {
    setSelectedAP(ap);
    setDecision("wifi_choice", ap.isEvil ? "evil_twin" : "legitimate");

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
              <p className="text-sm font-medium text-accent">
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
      <h2 className="text-lg font-bold text-text-primary mb-2">
        Connect to Wi-Fi
      </h2>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        Your workstation needs a Wi-Fi connection. Two networks match the
        company SSID. Choose carefully.
      </p>

      <div className="space-y-3">
        {accessPoints.map((ap) => (
          <button
            key={ap.id || ap.bssid}
            onClick={() => handleConnect(ap)}
            className="w-full p-4 border border-border rounded-lg text-left hover:border-accent transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm text-text-primary">
                {ap.ssid}
              </span>
              <SignalBars strength={ap.signal} />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[var(--text-secondary)]">
              <div>
                <span className="text-text-muted">BSSID:</span>{" "}
                <span className="font-mono">{ap.bssid}</span>
              </div>
              <div>
                <span className="text-text-muted">Signal:</span>{" "}
                <span className="font-mono">{ap.signal} dBm</span>
              </div>
              <div>
                <span className="text-text-muted">Auth:</span> {ap.authType}
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
      <h3 className="text-base font-bold text-danger mb-3">
        Packet Capture — Credential Interception Detected
      </h3>

      <div className="bg-[var(--bg-window)] rounded-lg p-4 font-mono text-xs leading-relaxed overflow-auto max-h-64">
        <div className="text-[var(--danger)]">
          [sslstrip] Stripping SSL from connection to {mailHost}
        </div>
        <div className="text-[var(--warning)]">
          [HTTP] POST /auth/login HTTP/1.1
        </div>
        <div className="text-text-muted">
          Host: {mailHost}
        </div>
        <div className="text-text-muted">
          Content-Type: application/x-www-form-urlencoded
        </div>
        <div className="text-[var(--danger)] mt-2">
          username=your.name%40{fakeDomain}&password=********
        </div>
        <div className="text-[var(--danger)] mt-2">
          [ALERT] Credentials captured in plaintext via sslstrip
        </div>
        <div className="text-text-muted mt-2">
          [INFO] Captive portal certificate: CN={fakeDomain}
        </div>
        <div className="text-[var(--warning)]">
          [WARN] Certificate issuer: self-signed (NOT DigiCert)
        </div>
      </div>

      <p className="text-xs text-text-muted mt-3">
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
