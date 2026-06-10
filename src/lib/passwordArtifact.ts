/**
 * Privacy-safe password artifact.
 *
 * Players sometimes type a real password into the simulated login screen
 * despite the warning. We therefore never persist (or re-display) the raw
 * string. At submit time we derive everything the breach narrative needs:
 * a mask for the dramatic reveal, entropy for scoring/phase logic, and a
 * salted SHA-256 fingerprint so the "verify you still know it" step can
 * check equality without holding plaintext.
 */

export interface PasswordArtifact {
  /** First + last character with dots between, e.g. "S••••••3" */
  mask: string;
  length: number;
  /** Entropy estimate in bits (charset-size model) */
  entropy: number;
  /** Hex-encoded SHA-256 of salt + password */
  hash: string;
  /** Hex-encoded random salt */
  salt: string;
}

export function computeEntropy(password: string): number {
  let charsetSize = 0;
  if (/[a-z]/.test(password)) charsetSize += 26;
  if (/[A-Z]/.test(password)) charsetSize += 26;
  if (/[0-9]/.test(password)) charsetSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) charsetSize += 32;
  if (charsetSize === 0) return 0;
  return Math.round(password.length * Math.log2(charsetSize));
}

export function crackTime(entropy: number): string {
  // Assume 10 billion guesses/sec (modern GPU cluster)
  const seconds = Math.pow(2, entropy) / 1e10;
  if (seconds < 1) return "instant";
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
  if (seconds < 31536000) return `${Math.round(seconds / 86400)} days`;
  const years = seconds / 31536000;
  if (years < 1000) return `${Math.round(years)} years`;
  if (years < 1e6) return `${Math.round(years / 1000)}K years`;
  return `${Math.round(years / 1e6)}M+ years`;
}

export function maskPassword(password: string): string {
  if (password.length <= 2) return "•".repeat(password.length);
  return (
    password[0] +
    "•".repeat(password.length - 2) +
    password[password.length - 1]
  );
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(new Uint8Array(digest));
}

export async function createPasswordArtifact(
  password: string
): Promise<PasswordArtifact> {
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const salt = toHex(saltBytes);
  return {
    mask: maskPassword(password),
    length: password.length,
    entropy: computeEntropy(password),
    hash: await sha256Hex(salt + password),
    salt,
  };
}

export async function verifyPasswordArtifact(
  password: string,
  artifact: PasswordArtifact
): Promise<boolean> {
  return (await sha256Hex(artifact.salt + password)) === artifact.hash;
}

/** Parse a persisted artifact JSON string; null on absence or corruption. */
export function parsePasswordArtifact(
  json: string | undefined | null
): PasswordArtifact | null {
  if (!json) return null;
  try {
    const a = JSON.parse(json) as PasswordArtifact;
    if (typeof a?.hash !== "string" || typeof a?.entropy !== "number")
      return null;
    return a;
  } catch {
    return null;
  }
}
