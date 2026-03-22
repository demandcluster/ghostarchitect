import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient | null };

function createPrismaClient(): PrismaClient | null {
  if (!process.env.DATABASE_URL) return null;
  return new PrismaClient();
}

export const prisma: PrismaClient | null =
  globalForPrisma.prisma !== undefined ? globalForPrisma.prisma : createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Require a live Prisma client or throw. Use in API routes to return 503.
 */
export function requirePrisma(): PrismaClient {
  if (!prisma) {
    throw new NoDatabaseError();
  }
  return prisma;
}

export class NoDatabaseError extends Error {
  constructor() {
    super('Database not configured (DATABASE_URL not set)');
    this.name = 'NoDatabaseError';
  }
}
