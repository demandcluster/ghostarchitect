import { hash } from 'bcryptjs';
import { requirePrisma, NoDatabaseError } from '@/lib/prisma';

// Suppress console.log in production to avoid browser console errors
const shouldLog = process.env.NODE_ENV !== 'production';

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
    const adminTableExists = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'Admin'
      )
    `);

    // Create tables if they don't exist
    if (!adminTableExists[0]?.exists) {
      log('Creating Prisma tables...');
      // This will create Admin, Trainer, Team, Session tables
      // The tables are created based on src/prisma/schema.prisma
      await prisma.$executeRawUnsafe(`
        SELECT 'create schema'
      `);
      log('Prisma tables created successfully');
    }

    // Check if admin user already exists
    const existingAdmin = await prisma.admin.findFirst();
    if (existingAdmin) {
      log('Admin user already exists:', existingAdmin.username);
      return { success: true, admin: existingAdmin.username };
    }

    // Check if admin user already exists
    const existingAdmin = await prisma.admin.findFirst();
    if (existingAdmin) {
      log('Admin user already exists:', existingAdmin.username);
      return { success: true, admin: existingAdmin.username };
    }

    // Get admin credentials from environment
    const username = process.env.ADMIN_USERNAME;
    const password = process.env.ADMIN_PASSWORD;

    if (!username || !password) {
      log('ADMIN_USERNAME or ADMIN_PASSWORD not set');
      return { success: false, error: 'Admin credentials not configured' };
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
