import type { ElevenLabsMusicResponse } from '@/types/elevenlabs';
import type {
  MusicProductionRequest,
  MusicProductionResponse,
  SongContext,
} from '@/types/music-production';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { NextRequest, NextResponse } from 'next/server';

// Initialize clients
const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-2.5-flash',
  apiKey: process.env.GOOGLE_API_KEY,
  temperature: 0.7,
});

const elevenLabsClient = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
  environment: 'https://api.elevenlabs.io',
});

// Helper function to calculate music length for 4 bars
function calculateFourBarLength(tempo: number, timeSignature: string): number {
  const [beatsPerBar] = timeSignature.split('/').map(Number);
  const totalBeats = beatsPerBar * 4; // 4 bars
  const secondsPerBeat = 60 / tempo;
  const totalSeconds = totalBeats * secondsPerBeat;
  return Math.round(totalSeconds * 1000); // Convert to milliseconds
}

// Helper function to create a detailed ElevenLabs prompt
function createInstrumentPrompt(
  songContext: SongContext,
  instrument: string,
  agentReasoning: string
): string {
  const { genre, mood, tempo, key, timeSignature } = songContext;

  return `A ${mood} ${instrument} ${genre} loop in ${key} at ${tempo} BPM, ${timeSignature} time signature. ${agentReasoning}. This is a 4-bar melodic loop designed for music production.`;
}

// Main agent logic
async function musicProductionAgent(
  songContext: SongContext,
  userRequest: string
): Promise<MusicProductionResponse> {
  try {
    // Step 1: Use LangChain to analyze the request and determine the instrument
    const systemPrompt = `You are an expert music production assistant helping create a ${
      songContext.genre
    } song in ${songContext.key} at ${songContext.tempo} BPM with a ${
      songContext.mood
    } mood.

Your task is to:
1. Understand what instrument the user wants for their next layer
2. Provide creative reasoning for how this instrument will fit in the song
3. Suggest specific musical characteristics for the 4-bar loop

Respond in JSON format with this structure:
{
  "instrument": "the instrument name",
  "reasoning": "explain why this instrument choice works and how it fits the song",
  "musicalCharacteristics": "specific details about melody, rhythm, articulation, dynamics for this loop"
}

Song Context:
- Genre: ${songContext.genre}
- Mood: ${songContext.mood}
- Tempo: ${songContext.tempo} BPM
- Key: ${songContext.key}
- Time Signature: ${songContext.timeSignature}
${songContext.description ? `- Description: ${songContext.description}` : ''}`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(userRequest),
    ];

    console.log('🎵 Agent analyzing request...');
    const agentResponse = await llm.invoke(messages);
    const agentContent = String(agentResponse.content);

    // Parse the agent's JSON response
    let agentDecision;
    try {
      // Try to extract JSON from the response
      const jsonMatch = agentContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        agentDecision = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch {
      console.error('Failed to parse agent response:', agentContent);
      return {
        success: false,
        reasoning: 'Failed to parse agent decision',
        instrument: '',
        prompt: '',
        error: 'Invalid agent response format',
      };
    }

    console.log('🎹 Agent Decision:', agentDecision);

    // Step 2: Generate the ElevenLabs prompt
    const elevenLabsPrompt = createInstrumentPrompt(
      songContext,
      agentDecision.instrument,
      agentDecision.musicalCharacteristics
    );

    console.log('🎼 ElevenLabs Prompt:', elevenLabsPrompt);

    // Step 3: Calculate the music length for 4 bars
    const musicLengthMs = calculateFourBarLength(
      songContext.tempo,
      songContext.timeSignature
    );

    console.log(`⏱️  Generating ${musicLengthMs}ms (4 bars) of audio...`);

    // Step 4: Generate music with ElevenLabs
    const musicResponse = (await elevenLabsClient.music.composeDetailed({
      prompt: elevenLabsPrompt,
      musicLengthMs,
    })) as unknown as ElevenLabsMusicResponse;

    // Step 5: Convert audio to base64
    const audioBase64 = musicResponse.audio.toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;

    console.log('✅ Music generated successfully!');

    // Step 6: Return the complete response
    return {
      success: true,
      reasoning: agentDecision.reasoning,
      instrument: agentDecision.instrument,
      prompt: elevenLabsPrompt,
      loop: {
        instrument: agentDecision.instrument,
        prompt: elevenLabsPrompt,
        audioUrl,
        metadata: {
          title: musicResponse.json.songMetadata.title,
          description: musicResponse.json.songMetadata.description,
        },
        bars: 4,
        order: 0,
      },
    };
  } catch (error) {
    console.error('❌ Music production agent error:', error);
    return {
      success: false,
      reasoning: 'An error occurred during music generation',
      instrument: '',
      prompt: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MusicProductionRequest;
    const { songContext, userRequest } = body;

    // Validate required fields
    if (!songContext || !userRequest) {
      return NextResponse.json(
        { error: 'Missing required fields: songContext or userRequest' },
        { status: 400 }
      );
    }

    // Run the agent
    const result = await musicProductionAgent(songContext, userRequest);

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Failed to process music production request' },
      { status: 500 }
    );
  }
}
