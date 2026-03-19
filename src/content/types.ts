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
  complexity?: number; // 1-10 quality score from Auditor
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
  complexity?: number;
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
  complexity?: number;
}

export interface DMChoice {
  id: string;
  label: string;
  isCorrect: boolean;
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
  complexity?: number;
}

export interface WiFiNetwork {
  id: string;
  ssid: string;
  bssid: string;
  signalStrength: number;
  authType: "WPA2-PSK" | "802.1X" | "Open";
  isEvilTwin: boolean;
  indicators: string[];
  complexity?: number;
}

export interface FileListing {
  id: string;
  name: string;
  path: string;
  size: string;
  modified: string;
  isEvidence: boolean;
  description?: string;
}
