import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { auth } from '@/auth';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // If no OpenAI key, return 404 so frontend knows to use fallback
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 404 });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Clean up markdown before sending to TTS
    const cleanText = text
      .replace(/#/g, '')
      .replace(/\*/g, '')
      .replace(/`/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove markdown links but keep text
      .trim();

    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: cleanText,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Error generating TTS:', error);
    return NextResponse.json({ error: 'Failed to generate audio' }, { status: 500 });
  }
}
