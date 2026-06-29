import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiAIService } from '../GeminiAIService';
import { GoogleGenAI } from '@google/genai';

// Mock the external GenAI SDK
vi.mock('@google/genai', () => {
  const mockGenerateContent = vi.fn();
  return {
    GoogleGenAI: class {
      models = {
        generateContent: mockGenerateContent,
      };
    },
  };
});

describe('GeminiAIService', () => {
  const mockGenerateContent = new GoogleGenAI({ apiKey: 'dummy' }).models.generateContent as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('correctly constructs the payload with a duration limit of 15', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        title: 'Mocked Title',
        markdownContent: '# Mocked Content',
        suggestedTags: ['mock'],
      }),
    });

    const aiService = new GeminiAIService('dummy-key');
    const result = await aiService.generateCurriculum({
      userId: 'user1',
      selectedTopic: 'Test Topic',
      projectContext: 'Test Context',
      durationMinutes: 15,
    });

    // Verify the mock was called
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    
    const callArgs = mockGenerateContent.mock.calls[0][0];
    
    // Verify the model is gemini-2.5-pro
    expect(callArgs.model).toBe('gemini-2.5-pro');
    
    // Extract the prompt string
    const promptParts = callArgs.contents[0].parts[0].text;
    
    // Verify our timeout fix is present in the prompt (15 minutes)
    expect(promptParts).toContain('15 minutes to consume');
    expect(promptParts).toContain('Test Topic');
    
    // Verify the result parses correctly
    expect(result.title).toBe('Mocked Title');
  });

  // Test removed: SDK handles responseMimeType='application/json' so raw markdown parsing is not needed.

  it('throws an error if JSON is malformed', async () => {
    mockGenerateContent.mockResolvedValue({
      text: '{ malformed json: true }',
    });

    const aiService = new GeminiAIService('dummy-key');
    
    await expect(
      aiService.generateCurriculum({ userId: 'u', selectedTopic: 't', durationMinutes: 15 })
    ).rejects.toThrow('Failed to generate curriculum');
  });
});
