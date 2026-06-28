import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiAIService } from '../GeminiAIService';
import { GenerateCurriculumParams } from '../../interfaces/AIService';

// Mocking the future Google Gen AI SDK
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class {
      models = {
        generateContent: vi.fn().mockResolvedValue({
          text: '{"title":"Test Title","markdownContent":"# Test Content","suggestedTags":["Test"]}'
        })
      }
    }
  };
});

describe('GeminiAIService', () => {
  let aiService: GeminiAIService;

  beforeEach(() => {
    aiService = new GeminiAIService();
  });

  it('should generate a curriculum successfully by parsing the LLM JSON response', async () => {
    const params: GenerateCurriculumParams = {
      userId: 'user-123',
      baseSkills: ['AI', 'System Design'],
      projectContext: 'Building an educational agent',
      durationMinutes: 60,
    };

    // This test will fail currently because generateCurriculum throws "Not implemented"
    const result = await aiService.generateCurriculum(params);

    expect(result.title).toBe('Test Title');
    expect(result.markdownContent).toBe('# Test Content');
    expect(result.suggestedTags).toContain('Test');
  });
});
