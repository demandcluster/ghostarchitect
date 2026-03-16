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
 * 1. Prisma tables (Admin, Trainer, Team, Session) are created
 * 2. First admin user is created automatically
 *
 * Uses ADMIN_USERNAME and ADMIN_PASSWORD environment variables.
 */
export async function initAdminOnStartup() {
  try {
    const prisma = requirePrisma();

    // Check if tables exist
    const result = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'Admin'
      )
    `);
    const adminTableExists = (result as any[])[0]?.exists || false;

    // Create tables if they don't exist
    if (!adminTableExists) {
      log('Creating Prisma tables...');
      // Run Prisma migrations to create Admin, Trainer, Team, Session tables
      try {
        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) {
          logError('DATABASE_URL not set', new Error('DATABASE_URL environment variable is not set'));
          return { success: false, error: 'DATABASE_URL not configured' };
        }
        execSync(`npx prisma db push --url="${dbUrl}"`, {
          stdio: shouldLog ? 'inherit' : 'pipe',
          cwd: process.cwd(),
          env: process.env,
        });
        log('Prisma tables created successfully');
      } catch (migrationError) {
        logError('Failed to run Prisma migrations:', migrationError);
        return { success: false, error: 'Failed to create database tables' };
      }
    }

    // Check if admin user already exists
    let existingAdmin = null;
    try {
      existingAdmin = await prisma.admin.findFirst();
    } catch (error: any) {
      // Table might still not exist due to Prisma client cache
      if (error.code === 'P2021') {
        log('Admin table not found, trying raw query check...');
        const rawResult = await prisma.$queryRawUnsafe(`
          SELECT COUNT(*) as count FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'Admin'
        `);
        const count = (rawResult as any[])[0]?.count || 0;
        if (count > 0) {
          log('Admin table exists but Prisma client cache is stale. Regenerating client...');
          // Generate new Prisma client to pick up schema changes
          execSync('npx prisma generate', { stdio: 'pipe', cwd: process.cwd() });
          // Try again with new client
          existingAdmin = await prisma.admin.findFirst();
        }
      } else {
        throw error;
      }
    }
    if (existingAdmin) {
      log('Admin user already exists:', existingAdmin.username);
      return { success: true, username: existingAdmin.username };
    }

    // Get admin credentials from environment
    const username = process.env.ADMIN_USERNAME;
    const password = process.env.ADMIN_PASSWORD;

    if (!username || !password) {
      log('ADMIN_USERNAME or ADMIN_PASSWORD not set');
      return { success: false, error: 'Admin credentials not configured' };
    }

    // Validate admin username format
    if (!USERNAME_RE.test(username)) {
      log('ADMIN_USERNAME format invalid');
      return { success: false, error: 'ADMIN_USERNAME must be 3-32 characters: letters, digits, or underscore' };
    }

    // Validate admin password complexity (12+ chars, mixed case, numbers, symbols)
    if (!PASSWORD_RE.test(password)) {
      log('ADMIN_PASSWORD complexity requirements not met');
      return { success: false, error: 'ADMIN_PASSWORD must be 12+ characters with uppercase, lowercase, numbers, and symbols' };
    }

    // Create admin user
    const passwordHash = await hash(password, 12);
    const admin = await prisma.admin.create({
      data: { username, passwordHash },
    });

    log('Admin user created successfully:', admin.username);
    return { success: true, admin: admin.username };
  } catch (error) {
    if (error instanceof NoDatabaseError) {
      log('Database not available, skipping admin initialization');
      return { success: false, error: 'Database not available' };
    }
    logError('Failed to initialize admin user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
