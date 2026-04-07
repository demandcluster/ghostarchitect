import { randomBytes } from 'node:crypto';
import { requirePrisma } from '@/lib/prisma';

const CHARSET = 'BCDFGHJKLMNPQRSTVWXYZ0123456789';
const CODE_LENGTH = 6;
const MAX_RETRIES = 3;

export function generateInviteCode(): string {
  // Rejection sampling to avoid modulo bias.
  // Only accept bytes in [0, floor(256/CHARSET.length) * CHARSET.length).
  const max = Math.floor(256 / CHARSET.length) * CHARSET.length;
  let code = '';
  while (code.length < CODE_LENGTH) {
    const bytes = randomBytes(CODE_LENGTH);
    for (const byte of bytes) {
      if (code.length < CODE_LENGTH && byte < max) {
        code += CHARSET[byte % CHARSET.length];
      }
    }
  }
  return code;
}

const CODE_PATTERN = new RegExp(`^[${CHARSET}]{${CODE_LENGTH}}$`);

export function isValidInviteCodeFormat(code: string): boolean {
  return typeof code === 'string' && CODE_PATTERN.test(code.toUpperCase());
}

export async function createUniqueInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const code = generateInviteCode();
    const db = requirePrisma();
    const exists = await db.team.findUnique({ where: { inviteCode: code } });
    if (!exists) return code;
  }
  throw new Error('Failed to generate unique invite code after max retries');
}
