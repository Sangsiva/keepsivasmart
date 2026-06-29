import { GoogleGenAI } from '@google/genai';
import { AIService, GenerateCurriculumParams, GeneratedCurriculum } from '../interfaces/AIService';
import { buildPromptPipeline } from './PromptPipelines';

export class GeminiAIService implements AIService {
  private ai: GoogleGenAI | null = null;

  constructor(private userApiKey?: string) {
    const key = this.userApiKey || process.env.GEMINI_API_KEY;
    if (key && key !== 'test-key') {
      this.ai = new GoogleGenAI({ apiKey: key });
    }
  }

  async generateCurriculum(params: GenerateCurriculumParams): Promise<GeneratedCurriculum> {
    const { selectedTopic, projectContext, durationMinutes, dailyOverrides } = params;

    const activeKey = this.userApiKey || process.env.GEMINI_API_KEY;
    if (!activeKey || activeKey === 'test-key') {
      console.log('No valid GEMINI_API_KEY found, returning demo content.');
      return {
        title: "Demo: Advanced RAG Architecture",
        markdownContent: `# Advanced RAG Architecture\n\nThis is a mock response because no \`GEMINI_API_KEY\` was provided in the \`.env\` file.\n\nIn a real scenario, this would be a highly technical ${durationMinutes}-minute deep dive based on your configured skills: **${selectedTopic}**.\n\n### Next Steps\nAdd your Gemini API key to the \`.env\` file to generate real curriculum!`,
        suggestedTags: ["Demo", "Architecture"]
      };
    }

    const pipeline = buildPromptPipeline(
      selectedTopic,
      projectContext || '',
      durationMinutes,
      params.historicalContext,
      dailyOverrides
    );

    try {
      if (!this.ai) {
        throw new Error('GoogleGenAI client not initialized.');
      }

      const config: any = {
        temperature: 0.7,
        responseMimeType: 'application/json',
      };

      if (pipeline.useSearchGrounding) {
        config.tools = [{ googleSearch: {} }];
      }

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [
          { role: 'user', parts: [{ text: pipeline.systemPrompt + '\n\n' + pipeline.userPrompt }] }
        ],
        config
      });

      if (!response.text) {
        throw new Error('No text returned from Gemini API');
      }

      const parsed: GeneratedCurriculum = JSON.parse(response.text);
      return parsed;
    } catch (error) {
      console.error('Failed to generate curriculum', error);
      throw new Error('Failed to generate curriculum');
    }
  }
}
