import { randomBytes } from 'node:crypto';
import { requirePrisma } from '@/lib/prisma';

const CHARSET = 'BCDFGHJKLMNPQRSTVWXYZ0123456789';
const CODE_LENGTH = 6;
const MAX_RETRIES = 3;

export function generateInviteCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CHARSET[bytes[i] % CHARSET.length];
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
