import { GoogleGenAI, Type } from '@google/genai';
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
      };

      // The Gemini API does not allow 'application/json' responseMimeType when tools are active.
      // We will rely purely on the system prompt instruction to output valid JSON string.
      if (!pipeline.useSearchGrounding) {
        config.responseMimeType = 'application/json';
        config.responseSchema = {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            markdownContent: { type: Type.STRING },
            suggestedTags: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["title", "markdownContent", "suggestedTags"]
        };
      } else {
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

      let cleanText = response.text.trim();
      
      if (!pipeline.useSearchGrounding) {
        if (cleanText.startsWith('```json')) cleanText = cleanText.substring(7);
        else if (cleanText.startsWith('```')) cleanText = cleanText.substring(3);
        if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);
        cleanText = cleanText.trim();
        
        try {
          const parsed: GeneratedCurriculum = JSON.parse(cleanText);
          return parsed;
        } catch (error) {
          console.error("Failed to parse AI JSON:", cleanText);
          throw new Error("Invalid JSON format from AI");
        }
      } else {
        // Search Grounding pipeline outputs raw markdown to prevent JSON escape character errors
        const titleMatch = cleanText.match(/^#\\s+(.*)$/m);
        const title = titleMatch ? titleMatch[1].trim() : 'Executive News Briefing';
        
        return {
          title,
          markdownContent: cleanText,
          suggestedTags: ['news', 'latest']
        };
      }
    } catch (error) {
      console.error('Failed to generate curriculum', error);
      throw new Error('Failed to generate curriculum');
    }
  }
}
