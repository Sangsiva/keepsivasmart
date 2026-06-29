import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const moduleId = params.id;

    // Verify user owns this module
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId }
    });

    if (!userProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const module = await prisma.learningModule.findFirst({
      where: { id: moduleId, userProfileId: userProfile.id }
    });

    if (!module) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    if (module.status === 'completed') {
      return NextResponse.json({ message: 'Already completed' }, { status: 200 });
    }

    // 1. Mark module as completed
    await prisma.learningModule.update({
      where: { id: moduleId },
      data: { status: 'completed' }
    });

    // 2. Handle ActivityLog & Streak Tracking
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0); // Normalize to midnight UTC

    let activityLog = await prisma.activityLog.findUnique({
      where: {
        userProfileId_date: {
          userProfileId: userProfile.id,
          date: today
        }
      }
    });

    if (activityLog) {
      // Increment today's stats
      await prisma.activityLog.update({
        where: { id: activityLog.id },
        data: {
          modulesCompleted: { increment: 1 },
          timeSpentMinutes: { increment: module.type === 'primary' ? 60 : 15 }
        }
      });
    } else {
      // Create new daily log and calculate streak
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const yesterdayLog = await prisma.activityLog.findUnique({
        where: {
          userProfileId_date: {
            userProfileId: userProfile.id,
            date: yesterday
          }
        }
      });

      const streakDays = yesterdayLog && yesterdayLog.modulesCompleted > 0 
        ? yesterdayLog.streakDays + 1 
        : 1;

      await prisma.activityLog.create({
        data: {
          date: today,
          userProfileId: userProfile.id,
          modulesCompleted: 1,
          timeSpentMinutes: module.type === 'primary' ? 60 : 15,
          streakDays
        }
      });
    }

    return NextResponse.json({ success: true, message: 'Module marked as complete' }, { status: 200 });
  } catch (error: any) {
    console.error('Error completing module:', error);
    return NextResponse.json({ error: 'Failed to mark as complete' }, { status: 500 });
  }
}
