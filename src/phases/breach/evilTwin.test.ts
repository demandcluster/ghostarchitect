import { describe, it, expect, beforeEach } from "vitest";
import { useScoreStore } from "@/stores/scoreStore";
import { useNarrativeStore } from "@/stores/narrativeStore";

interface WiFiAP {
  ssid: string;
  bssid: string;
  signal: number;
  authType: string;
  isEvil: boolean;
}

const ACCESS_POINTS: WiFiAP[] = [
  {
    ssid: "NexusCorp-Secure",
    bssid: "AA:BB:CC:11:22:33",
    signal: -72,
    authType: "WPA2-Enterprise (802.1X)",
    isEvil: false,
  },
  {
    ssid: "NexusCorp-Secure",
    bssid: "DE:AD:BE:EF:CA:FE",
    signal: -38,
    authType: "WPA2-PSK",
    isEvil: true,
  },
];

/** Simulates handleConnect logic from EvilTwinWiFi component */
function simulateConnect(ap: WiFiAP) {
  const store = useScoreStore.getState();
  const narrative = useNarrativeStore.getState();

  narrative.setDecision("wifi_choice", ap.isEvil ? "evil_twin" : "legitimate");

  if (ap.isEvil) {
    store.addAction({
      id: "wifi-evil",
      category: "networkSecurity",
      points: 0,
      maxPoints: 5,
      label: "Connected to Evil Twin AP",
    });
    store.adjustTrust(-10);
  } else {
    store.addAction({
      id: "wifi-legit",
      category: "networkSecurity",
      points: 5,
      maxPoints: 5,
      label: "Connected to legitimate AP (802.1X)",
    });
    store.adjustTrust(5);
    narrative.addFlag("avoided_evil_twin");
  }
}

describe("evilTwin WiFi", () => {
  beforeEach(() => {
    useScoreStore.getState().reset();
    useNarrativeStore.getState().reset();
  });

  describe("access point data", () => {
    it("both APs share the same SSID", () => {
      expect(ACCESS_POINTS[0].ssid).toBe(ACCESS_POINTS[1].ssid);
    });

    it("APs have different BSSIDs", () => {
      expect(ACCESS_POINTS[0].bssid).not.toBe(ACCESS_POINTS[1].bssid);
    });

    it("Evil Twin has stronger signal (-38 dBm vs -72 dBm)", () => {
      const evil = ACCESS_POINTS.find((ap) => ap.isEvil)!;
      const legit = ACCESS_POINTS.find((ap) => !ap.isEvil)!;
      expect(evil.signal).toBeGreaterThan(legit.signal); // -38 > -72
    });

    it("Evil Twin uses WPA2-PSK (not enterprise auth)", () => {
      const evil = ACCESS_POINTS.find((ap) => ap.isEvil)!;
      expect(evil.authType).toContain("WPA2-PSK");
      expect(evil.authType).not.toContain("802.1X");
    });

    it("legitimate AP uses WPA2-Enterprise (802.1X)", () => {
      const legit = ACCESS_POINTS.find((ap) => !ap.isEvil)!;
      expect(legit.authType).toContain("802.1X");
    });
  });

  describe("selecting Evil Twin", () => {
    it("scores 0 points in networkSecurity", () => {
      const evil = ACCESS_POINTS.find((ap) => ap.isEvil)!;
      simulateConnect(evil);

      expect(useScoreStore.getState().categoryScores.networkSecurity).toBe(0);
    });

    it("penalises trust score by 10", () => {
      const initialTrust = useScoreStore.getState().trustScore;
      const evil = ACCESS_POINTS.find((ap) => ap.isEvil)!;
      simulateConnect(evil);

      expect(useScoreStore.getState().trustScore).toBe(initialTrust - 10);
    });

    it("does not set avoided_evil_twin flag", () => {
      const evil = ACCESS_POINTS.find((ap) => ap.isEvil)!;
      simulateConnect(evil);

      expect(useNarrativeStore.getState().hasFlag("avoided_evil_twin")).toBe(false);
    });

    it("records wifi_choice as evil_twin", () => {
      const evil = ACCESS_POINTS.find((ap) => ap.isEvil)!;
      simulateConnect(evil);

      expect(useNarrativeStore.getState().decisions.wifi_choice).toBe("evil_twin");
    });
  });

  describe("selecting legitimate AP", () => {
    it("scores full points (5) in networkSecurity", () => {
      const legit = ACCESS_POINTS.find((ap) => !ap.isEvil)!;
      simulateConnect(legit);

      expect(useScoreStore.getState().categoryScores.networkSecurity).toBe(5);
    });

    it("adds 5 trust points", () => {
      const initialTrust = useScoreStore.getState().trustScore;
      const legit = ACCESS_POINTS.find((ap) => !ap.isEvil)!;
      simulateConnect(legit);

      expect(useScoreStore.getState().trustScore).toBe(initialTrust + 5);
    });

    it("sets avoided_evil_twin flag", () => {
      const legit = ACCESS_POINTS.find((ap) => !ap.isEvil)!;
      simulateConnect(legit);

      expect(useNarrativeStore.getState().hasFlag("avoided_evil_twin")).toBe(true);
    });

    it("records wifi_choice as legitimate", () => {
      const legit = ACCESS_POINTS.find((ap) => !ap.isEvil)!;
      simulateConnect(legit);

      expect(useNarrativeStore.getState().decisions.wifi_choice).toBe("legitimate");
    });
  });
});
