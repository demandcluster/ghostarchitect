export interface EmailHeader {
  returnPath: string;
  spf: string;
  dkim: string;
  dmarc: string;
  xMailer?: string;
  replyTo?: string;
}

export interface Email {
  id: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  body: string;
  headers: EmailHeader;
  isPhishing: boolean;
  indicators: string[];
  difficulty: "easy" | "medium" | "hard";
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR" | "CRITICAL";
  source: string;
  message: string;
  isMalicious: boolean;
  attackTechnique?: string;
  mitreId?: string;
}

export interface DMMessage {
  id: string;
  sender: string;
  senderRole: string;
  avatar: string;
  text: string;
  timestamp: number;
  choices?: DMChoice[];
  isBadAdvice?: boolean;
}

export interface DMChoice {
  id: string;
  label: string;
  isCorrect: boolean;
  trustDelta: number;
  scoreEffect?: {
    category: "phishingIQ" | "passwordHygiene" | "networkSecurity" | "forensicSkill";
    points: number;
    maxPoints: number;
  };
  nextMessageId?: string;
  flag?: string;
}

export interface LOLBin {
  id: string;
  processName: string;
  pid: number;
  commandLine: string;
  isMalicious: boolean;
  description: string;
  mitreId?: string;
}

export interface WiFiNetwork {
  ssid: string;
  bssid: string;
  signalStrength: number;
  authType: "WPA2-PSK" | "802.1X" | "Open";
  isEvilTwin: boolean;
  indicators: string[];
}

export interface FileListing {
  name: string;
  path: string;
  size: string;
  modified: string;
  isEvidence: boolean;
  description?: string;
}
