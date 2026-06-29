import { NextResponse } from 'next/server';
import { GeminiAIService } from '@/services/ai/GeminiAIService';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { selectWeightedTopic } from '@/lib/topicSelector';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();
    const { topicWeights, projectContext, apiKey, durationMinutes, dailyOverrides } = body;

    // Upsert the user profile for demo auth
    let user = await prisma.userProfile.findUnique({ where: { userId } });
    if (!user) {
      user = await prisma.userProfile.create({
        data: {
          userId,
          baseSkills: 'AI & LLMs', // Legacy fallback
          projectContext: projectContext || 'Default',
        }
      });
    }

    // Weighted selection logic
    const selectedTopic = selectWeightedTopic(topicWeights);

    const aiService = new GeminiAIService(apiKey);
    
    // Generate the curriculum via Gemini
    const curriculum = await aiService.generateCurriculum({
      userId,
      selectedTopic,
      projectContext: projectContext || '',
      dailyOverrides,
      durationMinutes: durationMinutes || 60,
    });

    // Save the generated module to the database
    const savedModule = await prisma.learningModule.create({
      data: {
        title: curriculum.title,
        type: durationMinutes === 60 ? 'primary' : 'secondary',
        format: 'markdown',
        content: curriculum.markdownContent,
        generatedForDate: new Date(),
        userProfileId: user.id,
      }
    });

    return NextResponse.json(savedModule, { status: 201 });
  } catch (error: any) {
    console.error('Error in /api/generate API:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate curriculum' }, { status: 500 });
  }
}
