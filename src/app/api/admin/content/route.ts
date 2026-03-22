import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { requirePrisma } from '@/lib/prisma';
import { ContentPoolManager } from '@/lib/contentPool';

/**
 * GET /api/admin/content
 * Returns counts of items in the content pool grouped by type.
 */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  try {
    const prisma = requirePrisma();
    
    // Group by type and count
    const counts = await prisma.contentPool.groupBy({
      by: ['type'],
      _count: {
        id: true
      }
    });

    // Also get audited vs unaudited counts
    const auditedCount = await prisma.contentPool.count({ where: { audited: true } });
    const totalCount = await prisma.contentPool.count();

    return NextResponse.json({
      counts: counts.map((c: { type: string; _count: { id: number } }) => ({
        type: c.type,
        count: c._count.id
      })),
      summary: {
        total: totalCount,
        audited: auditedCount,
        pending: totalCount - auditedCount
      }
    });
  } catch (error) {
    console.error('[Admin Content API] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/content
 * Triggers a pool refill for a specific section.
 */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  try {
    const body = await request.json();
    const section = body.section || 'all';

    const poolManager = ContentPoolManager.getInstance();
    
    // Trigger refill in background
    poolManager.refillPool(section).catch(err => {
      console.error('[Admin Content API] Refill error:', err);
    });

    return NextResponse.json({ 
      status: 'triggered', 
      message: `Refill for section '${section}' started in background.` 
    });
  } catch (error) {
    console.error('[Admin Content API] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/content
 * Clears the entire content pool.
 */
export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  try {
    const prisma = requirePrisma();
    
    // Clear the pool
    await prisma.contentPool.deleteMany({});

    return NextResponse.json({ 
      status: 'success', 
      message: 'Content pool cleared successfully.' 
    });
  } catch (error) {
    console.error('[Admin Content API] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
