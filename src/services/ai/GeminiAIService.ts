import { GoogleGenAI } from '@google/genai';
import { AIService, GenerateCurriculumParams, GeneratedCurriculum } from '../interfaces/AIService';

export class GeminiAIService implements AIService {
  private ai: GoogleGenAI | null = null;

  constructor(private userApiKey?: string) {
    const key = this.userApiKey || process.env.GEMINI_API_KEY;
    if (key && key !== 'test-key') {
      this.ai = new GoogleGenAI({ apiKey: key });
    }
  }

  async generateCurriculum(params: GenerateCurriculumParams): Promise<GeneratedCurriculum> {
    const { baseSkills, projectContext, durationMinutes, dailyOverrides } = params;

    const activeKey = this.userApiKey || process.env.GEMINI_API_KEY;
    if (!activeKey || activeKey === 'test-key') {
      console.log('No valid GEMINI_API_KEY found, returning demo content.');
      return {
        title: "Demo: Advanced RAG Architecture",
        markdownContent: `# Advanced RAG Architecture\n\nThis is a mock response because no \`GEMINI_API_KEY\` was provided in the \`.env\` file.\n\nIn a real scenario, this would be a highly technical ${durationMinutes}-minute deep dive based on your configured skills: **${baseSkills.join(', ')}**.\n\n### Next Steps\nAdd your Gemini API key to the \`.env\` file to generate real curriculum!`,
        suggestedTags: ["Demo", "Architecture"]
      };
    }

    const systemPrompt = `You are an expert AI curriculum curator for an AI & LLM Technical Architect Manager. 
Your goal is to generate a highly technical, deep-dive learning module.
The module should take approximately ${durationMinutes} minutes to consume.
Output strictly in JSON format matching this schema:
{
  "title": "Module Title",
  "markdownContent": "# Title\\n\\nDetailed content...",
  "suggestedTags": ["tag1", "tag2"]
}`;

    const userPrompt = `
Base Skills: ${baseSkills.join(', ')}
Current Project Context: ${projectContext}
Daily Overrides (Topics to focus on today): ${dailyOverrides?.join(', ') || 'None'}
    `;

    try {
      if (!this.ai) {
        throw new Error('GoogleGenAI client not initialized.');
      }

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [
          { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }
        ],
        config: {
          temperature: 0.7,
          responseMimeType: 'application/json',
        }
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
