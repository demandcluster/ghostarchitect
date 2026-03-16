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
 * Initialize admin user on application startup if it doesn't exist.
 * This ensures the first admin user is created automatically using
 * ADMIN_USERNAME and ADMIN_PASSWORD environment variables.
 */
export async function initAdminOnStartup() {
  try {
    const prisma = requirePrisma();

    // Check if Admin table exists first
    const adminTableExists = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'Admin'
      )
    `);

    if (!adminTableExists[0]?.exists) {
      log('Admin table does not exist, skipping admin user creation');
      return { success: false, error: 'Admin table does not exist in database' };
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
