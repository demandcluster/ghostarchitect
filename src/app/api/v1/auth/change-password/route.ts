import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { requirePrisma } from '@/lib/prisma';
import { requireTrainer } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const trainerAuth = await requireTrainer(request);
    if (trainerAuth instanceof NextResponse) return trainerAuth;

    const { password } = await request.json();

    if (!password || (password as string).length < 12) {
      return NextResponse.json(
        { error: 'Password must be at least 12 characters' },
        { status: 400 }
      );
    }

    // Validate password complexity (same as initAdmin)
    const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
    if (!PASSWORD_RE.test(password)) {
      return NextResponse.json(
        { error: 'Password must include uppercase, lowercase, numbers, and symbols' },
        { status: 400 }
      );
    }

    const prisma = requirePrisma();
    const passwordHash = await hash(password, 12);

    await prisma.trainer.update({
      where: { id: trainerAuth.sub },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
