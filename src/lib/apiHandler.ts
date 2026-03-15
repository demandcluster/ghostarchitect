import { NextRequest, NextResponse } from 'next/server';
import { NoDatabaseError } from '@/lib/prisma';

/**
 * Wraps an API route handler to catch NoDatabaseError and return 503.
 */
export function withDatabase<T extends unknown[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse | Response>,
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse | Response> => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      if (error instanceof NoDatabaseError) {
        return NextResponse.json(
          { error: 'Database not available' },
          { status: 503 },
        );
      }
      throw error;
    }
  };
}
