import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { GoogleGenAI } from '@google/genai';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { markdownContent, apiKey } = await request.json();
    if (!markdownContent) {
      return NextResponse.json({ error: 'Missing content' }, { status: 400 });
    }

    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key || key === 'test-key') {
      // Demo Quiz
      return NextResponse.json([
        {
          question: "What is the primary benefit of RAG?",
          options: ["Reduces hallucination", "Makes the model faster", "Uses less memory"],
          answerIndex: 0,
          explanation: "RAG grounds the model in factual data, reducing hallucination."
        }
      ], { status: 200 });
    }

    const ai = new GoogleGenAI({ apiKey: key });

    const systemPrompt = `You are an expert AI tutor. 
Generate a 3-question multiple-choice quiz based strictly on the provided markdown content.
Format your response exactly as a JSON array of objects matching this schema:
[
  {
    "question": "The question text",
    "options": ["Option A", "Option B", "Option C"],
    "answerIndex": 0,
    "explanation": "Brief explanation of why the answer is correct."
  }
]`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: [
        { role: 'user', parts: [{ text: systemPrompt + '\\n\\nContent:\\n' + markdownContent }] }
      ],
      config: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      }
    });

    if (!response.text) {
      throw new Error("No response from AI");
    }

    const parsed = JSON.parse(response.text);
    return NextResponse.json(parsed, { status: 200 });
  } catch (error: any) {
    console.error('Error generating quiz:', error);
    return NextResponse.json({ error: 'Failed to generate quiz' }, { status: 500 });
  }
}
