import { GeminiAIService } from './src/services/ai/GeminiAIService';
import { prisma } from './src/lib/prisma';

async function main() {
  console.log('--- Starting Integration Test ---');
  
  const ai = new GeminiAIService();
  console.log('1. Generating curriculum via AIService (Demo Mode)...');
  const curriculum = await ai.generateCurriculum({
    userId: 'siva-123',
    baseSkills: ['React', 'Next.js'],
    projectContext: 'Building KeepSivaSmart',
    durationMinutes: 60
  });
  console.log('✅ Generated Title:', curriculum.title);
  
  console.log('2. Ensuring UserProfile exists in DB...');
  let user = await prisma.userProfile.findUnique({ where: { userId: 'siva-123' } });
  if (!user) {
    user = await prisma.userProfile.create({ 
      data: { userId: 'siva-123', baseSkills: 'React, Next.js', projectContext: 'Building KeepSivaSmart' } 
    });
    console.log('✅ Created UserProfile');
  } else {
    console.log('✅ UserProfile already exists');
  }

  console.log('3. Saving Module to SQLite Database...');
  const saved = await prisma.learningModule.create({
    data: {
      title: curriculum.title,
      type: 'primary',
      format: 'markdown',
      content: curriculum.markdownContent,
      generatedForDate: new Date(),
      userProfileId: user.id,
    }
  });
  console.log('✅ Saved successfully! Module ID:', saved.id);
  
  console.log('4. Cleaning up test data...');
  await prisma.learningModule.delete({ where: { id: saved.id } });
  console.log('✅ Cleaned up.');
  
  console.log('--- Test Completed Successfully ---');
}

main().catch(console.error);
