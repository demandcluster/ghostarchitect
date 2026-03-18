import { hash } from 'bcryptjs';
import { requirePrisma, NoDatabaseError } from '@/lib/prisma';
import { execSync } from 'child_process';

// Type definitions for return values
interface AdminUserExistsResult {
  success: boolean;
  admin?: string;
  username?: string;
  error?: string;
}

interface AdminUserResult {
  success: boolean;
  admin?: string;
  username?: string;
  error?: string;
}

// Suppress console.log in production to avoid browser console errors
const shouldLog = process.env.NODE_ENV !== 'production';

// Validation patterns
const USERNAME_RE = /^[a-zA-Z0-9_]{3,32}$/;
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;

function log(message: string, ...args: any[]) {
  if (shouldLog) {
    console.log(message, ...args);
  }
}

function logError(message: string, error: any) {
  if (shouldLog) {
    console.error(message, error);
  } else {
    // In production, errors are handled via API responses
    console.warn(message, error instanceof Error ? error.message : String(error));
  }
}

/**
 * Initialize database and admin user on application startup.
 * This ensures:
 * 1. Prisma tables are created and up to date
 * 2. First admin user is created automatically
 * 3. Content pool is hydrated if empty
 */
export async function initAdminOnStartup() {
  try {
    const prisma = requirePrisma();
    const CURRENT_DB_VERSION = '3';

    log('--- GHOST ARCHITECT INITIALIZATION STARTED ---');

    // 1. Check/Update Database Schema
    log('Checking database version...');
    let dbVersion = '0';
    try {
      // Use raw query because the client might not have SystemConfig model yet
      const versionResult = await prisma.$queryRawUnsafe<{ value: string }[]>(
        'SELECT value FROM "SystemConfig" WHERE key = \'db_version\''
      );
      dbVersion = versionResult[0]?.value || '0';
    } catch (e) {
      log('SystemConfig table not found or versioning not yet initialized');
    }

    if (dbVersion !== CURRENT_DB_VERSION) {
      log(`Database version mismatch (found ${dbVersion}, target ${CURRENT_DB_VERSION}). Updating...`);
      try {
        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) throw new Error('DATABASE_URL not set');
        
        execSync(`npx prisma db push --schema ./src/prisma/schema.prisma --accept-data-loss --url="${dbUrl}"`, {
          stdio: shouldLog ? 'inherit' : 'pipe',
          cwd: process.cwd(),
          env: process.env,
        });
        
        // Update version in DB using raw SQL to be safe against stale client
        await prisma.$executeRawUnsafe(
          'INSERT INTO "SystemConfig" (key, value) VALUES (\'db_version\', $1) ON CONFLICT (key) DO UPDATE SET value = $1',
          CURRENT_DB_VERSION
        );
        log('Database schema updated successfully');
      } catch (migrationError) {
        logError('Failed to update database schema:', migrationError);
        return { success: false, error: 'Failed to update database schema' };
      }
    }

    // 2. Check if admin user already exists
    let existingAdmin = await prisma.admin.findFirst().catch(() => null);
    let adminName = existingAdmin?.username || process.env.ADMIN_USERNAME || 'admin';

    if (!existingAdmin) {
      // Get admin credentials from environment
      const username = process.env.ADMIN_USERNAME;
      const password = process.env.ADMIN_PASSWORD;

      if (username && password) {
        if (USERNAME_RE.test(username) && PASSWORD_RE.test(password)) {
          const passwordHash = await hash(password, 12);
          await prisma.admin.create({ data: { username, passwordHash } });
          log('Admin user created successfully');
        }
      }
    }

    // 3. Hydrate Content Pool if empty
    try {
      // Use raw SQL to count because ContentPool model might be missing from stale client
      const poolCountResult = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
        'SELECT COUNT(*) as count FROM "ContentPool"'
      );
      const poolCount = Number(poolCountResult[0]?.count || 0);
      
      if (poolCount < 5) {
        log('Content pool is low, triggering initial hydration...');
        const { ContentPoolManager } = await import('@/lib/contentPool');
        // Trigger refill in background
        ContentPoolManager.getInstance().refillPool('all').catch(e => logError('Initial hydration failed:', e));
      }
    } catch (e) {
      log('Failed to check content pool status (might be normal on first run)');
    }

    log('--- GHOST ARCHITECT INITIALIZATION COMPLETED ---');
    return { success: true, username: adminName, admin: adminName };
  } catch (error) {
    if (error instanceof NoDatabaseError) {
      log('Database not available, skipping admin initialization');
      return { success: false, error: 'Database not available' };
    }
    logError('Failed to initialize application:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
