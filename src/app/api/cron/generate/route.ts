import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GeminiAIService } from '@/services/ai/GeminiAIService';
import { selectWeightedTopic } from '@/lib/topicSelector';
import { Resend } from 'resend';

export const maxDuration = 300; // Allow up to 5 minutes for generation

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// This endpoint is hit by Vercel Cron
export async function GET(request: Request) {
  try {
    // 1. Verify Cron Secret to prevent unauthorized generation
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use default API key for automated generation
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing GEMINI_API_KEY env' }, { status: 500 });
    }

    // 2. Fetch all profiles with User included to get emails
    const profiles = await prisma.userProfile.findMany({
      include: { user: true }
    });
    let generatedCount = 0;

    for (const profile of profiles) {
      try {
        let topicWeights = [];
        try {
          topicWeights = JSON.parse(profile.baseSkills);
        } catch {
          topicWeights = [{ id: '1', topic: profile.baseSkills || 'AI & LLMs', weight: 100 }];
        }

        // Backlog Policy: Check if user has unread modules generated in the last 48 hours
        const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
        const unreadModulesCount = await prisma.learningModule.count({
          where: {
            userProfileId: profile.id,
            status: 'unread',
            generatedForDate: { gte: fortyEightHoursAgo }
          }
        });

        if (unreadModulesCount >= 2) {
          console.log(`[BACKLOG POLICY] Skipping generation for ${profile.user?.email} as they have ${unreadModulesCount} recent unread modules.`);
          continue; // Skip this user
        }

        const selectedTopic = selectWeightedTopic(topicWeights);

        // Fetch historical context and feedback
        const recentModules = await prisma.learningModule.findMany({
          where: { userProfileId: profile.userId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { title: true, feedback: true }
        });
        
        const historicalContext = recentModules.map(m => m.title);
        const recentFeedbacks = recentModules.map(m => m.feedback).filter(Boolean) as string[];

        // Generate curriculum
        const aiService = new GeminiAIService(apiKey);
        const curriculum = await aiService.generateCurriculum({
          userId: profile.userId,
          selectedTopic,
          projectContext: profile.projectContext || '',
          durationMinutes: 30, // Cron default
          historicalContext,
          recentFeedbacks,
        });

        // Save to database
        const savedModule = await prisma.learningModule.create({
          data: {
            title: curriculum.title,
            content: curriculum.markdownContent,
            type: 'secondary', // 15 min module
            format: 'markdown',
            status: 'unread',
            generatedForDate: new Date(),
            userProfileId: profile.id
          }
        });
        
        // 3. Send Notification Email
        if (profile.user?.email) {
          if (resend) {
            await resend.emails.send({
              from: 'KeepSivaSmart <notifications@keepsivasmart.com>', // Use a verified domain in production
              to: profile.user.email,
              subject: `Your Daily Briefing: ${curriculum.title}`,
              html: `
                <div style="font-family: sans-serif; padding: 20px;">
                  <h2>Hi ${profile.user.name || 'there'},</h2>
                  <p>Your daily learning module is ready:</p>
                  <h3>${curriculum.title}</h3>
                  <p>Open KeepSivaSmart to read the module or listen to the podcast!</p>
                  <a href="${process.env.APP_URL || 'http://localhost:3000'}/learning-hub" style="display: inline-block; padding: 10px 20px; background: #4caf50; color: white; text-decoration: none; border-radius: 5px;">Go to Learning Hub</a>
                </div>
              `
            });
          } else {
            console.log(`[RESEND MOCK] Sent email to ${profile.user.email} for module ${savedModule.id}`);
          }
        }

        generatedCount++;
      } catch (e) {
        console.error(`Cron generation failed for user ${profile.userId}:`, e);
      }
    }

    return NextResponse.json({ success: true, count: generatedCount }, { status: 200 });
  } catch (error: any) {
    console.error('Error in cron generate API:', error);
    return NextResponse.json({ error: 'Cron generation failed' }, { status: 500 });
  }
}
