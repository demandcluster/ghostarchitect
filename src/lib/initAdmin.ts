import { hash } from 'bcryptjs';
import { requirePrisma, NoDatabaseError } from '@/lib/prisma';

/**
 * Initialize admin user on application startup if it doesn't exist.
 * This ensures the first admin user is created automatically using
 * ADMIN_USERNAME and ADMIN_PASSWORD environment variables.
 */
export async function initAdminOnStartup() {
  try {
    const prisma = requirePrisma();

    // Check if admin user already exists
    const existingAdmin = await prisma.admin.findFirst();
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.username);
      return { success: true, admin: existingAdmin.username };
    }

    // Get admin credentials from environment
    const username = process.env.ADMIN_USERNAME;
    const password = process.env.ADMIN_PASSWORD;

    if (!username || !password) {
      console.warn('ADMIN_USERNAME or ADMIN_PASSWORD not set');
      return { success: false, error: 'Admin credentials not configured' };
    }

    // Create admin user
    const passwordHash = await hash(password, 12);
    const admin = await prisma.admin.create({
      data: { username, passwordHash },
    });

    console.log('Admin user created successfully:', admin.username);
    return { success: true, admin: admin.username };
  } catch (error) {
    if (error instanceof NoDatabaseError) {
      console.warn('Database not available, skipping admin initialization');
      return { success: false, error: 'Database not available' };
    }
    console.error('Failed to initialize admin user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
