import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { progressSeconds } = await request.json();

    if (typeof progressSeconds !== 'number') {
      return NextResponse.json({ error: 'Invalid progressSeconds' }, { status: 400 });
    }

    // Verify the user owns this module before updating
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const existingModule = await prisma.learningModule.findFirst({
      where: { 
        id: params.id,
        userProfileId: userProfile.id 
      }
    });

    if (!existingModule) {
      return NextResponse.json({ error: 'Module not found or unauthorized' }, { status: 404 });
    }

    await prisma.learningModule.update({
      where: { id: params.id },
      data: {
        progressSeconds: Math.floor(progressSeconds)
      }
    });

    return NextResponse.json({ success: true, progressSeconds: Math.floor(progressSeconds) });
  } catch (error: any) {
    console.error('Error updating module progress:', error);
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
  }
}
