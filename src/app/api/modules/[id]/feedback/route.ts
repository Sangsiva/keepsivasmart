import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { feedback } = await request.json();

    const module = await prisma.learningModule.findUnique({
      where: { id: params.id },
      include: { userProfile: true }
    });

    if (!module || module.userProfile.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 });
    }

    const updated = await prisma.learningModule.update({
      where: { id: params.id },
      data: { feedback }
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error: any) {
    console.error('Error in feedback API:', error);
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
  }
}
