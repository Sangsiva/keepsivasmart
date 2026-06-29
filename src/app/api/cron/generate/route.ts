import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GeminiAIService } from '@/services/ai/GeminiAIService';
import { selectWeightedTopic } from '@/lib/topicSelector';

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

    // 2. Fetch all profiles
    const profiles = await prisma.userProfile.findMany();
    let generatedCount = 0;

    for (const profile of profiles) {
      try {
        // Parse the topic weights we synced from settings
        let topicWeights = [];
        try {
          topicWeights = JSON.parse(profile.baseSkills);
        } catch {
          topicWeights = [{ id: '1', topic: profile.baseSkills || 'AI & LLMs', weight: 100 }];
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
          durationMinutes: 15, // Cron default
          historicalContext,
          recentFeedbacks,
        });

        // Save to database
        await prisma.learningModule.create({
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
