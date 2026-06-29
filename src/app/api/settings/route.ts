import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectContext, baseSkills } = await request.json();

    const userProfile = await prisma.userProfile.upsert({
      where: { userId: session.user.id },
      update: { projectContext, baseSkills },
      create: {
        userId: session.user.id,
        projectContext: projectContext || 'Default',
        baseSkills: baseSkills || 'AI & LLMs',
      }
    });

    return NextResponse.json(userProfile, { status: 200 });
  } catch (error: any) {
    console.error('Error saving settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
