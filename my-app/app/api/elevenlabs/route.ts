import type {
  ElevenLabsMusicResponse,
  MusicGenerationRequest,
} from '@/types/elevenlabs';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { NextRequest, NextResponse } from 'next/server';

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
  environment: 'https://api.elevenlabs.io',
});

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MusicGenerationRequest;
    const { prompt, musicLengthMs = 10000 } = body;

    // Validate required fields
    if (!prompt) {
      return NextResponse.json(
        { error: 'Missing required field: prompt' },
        { status: 400 }
      );
    }

    // Generate music using ElevenLabs
    const musicResponse = (await client.music.composeDetailed({
      prompt,
      musicLengthMs,
    })) as unknown as ElevenLabsMusicResponse;

    // Convert the audio buffer to base64 for JSON transport
    const audioBase64 = musicResponse.audio.toString('base64');

    // Return the music generation response with audio as base64
    return NextResponse.json(
      {
        success: true,
        audioUrl: `data:audio/mpeg;base64,${audioBase64}`,
        metadata: musicResponse.json.songMetadata,
        compositionPlan: {
          positiveGlobalStyles:
            musicResponse.json.compositionPlan.positiveGlobalStyles,
          negativeGlobalStyles:
            musicResponse.json.compositionPlan.negativeGlobalStyles,
        },
        filename: musicResponse.filename,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('ElevenLabs Music API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate music' },
      { status: 500 }
    );
  }
}
