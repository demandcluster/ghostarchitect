import { NextRequest, NextResponse } from 'next/server';
import { requirePrisma, NoDatabaseError } from '@/lib/prisma';

export async function GET(_request: NextRequest) {
  try {
    const prisma = requirePrisma();

    // Check if tables exist
    const result = await prisma.$queryRawUnsafe(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    const tables = (result as any[]).map((row: any) => row.table_name);
    const adminExists = await prisma.admin.findFirst();

    return NextResponse.json({
      database: 'connected',
      tables: tables,
      adminTable: tables.includes('Admin'),
      adminUser: adminExists ? { id: adminExists.id, username: adminExists.username } : null,
    });
  } catch (error) {
    if (error instanceof NoDatabaseError) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }
    console.error('Database check error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
