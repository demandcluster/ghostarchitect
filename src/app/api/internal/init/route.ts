import { NextRequest, NextResponse } from 'next/server';
import { initAdminOnStartup } from '@/lib/initAdmin';

export async function GET(_request: NextRequest) {
  try {
    const result = await initAdminOnStartup();

    if (result.success) {
      return NextResponse.json({
        status: 'success',
        message: result.admin
          ? `Admin user '${result.admin}' already exists`
          : `Admin user '${result.admin}' created successfully`,
      });
    } else {
      return NextResponse.json({
        status: 'failed',
        error: result.error,
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Startup initialization error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
