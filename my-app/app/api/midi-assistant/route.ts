import {
  generateArpeggio,
  generateBassLine,
  generateMelody,
  generateRhythmPattern,
  midiPatternToBase64,
  parseChordProgression,
} from '@/lib/midi-generator';
import type {
  MidiGenerationContext,
  MidiGenerationRequest,
  MidiGenerationResponse,
  MidiPattern,
} from '@/types/midi';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { NextRequest, NextResponse } from 'next/server';

// Initialize LLM
const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-2.5-flash',
  apiKey: process.env.GOOGLE_API_KEY,
  temperature: 0.7,
});

interface AgentDecision {
  needsMoreInfo: boolean;
  assistantMessage: string;
  suggestedQuestions?: string[];
  actionType?:
    | 'parse_chords'
    | 'generate_pattern'
    | 'refine_pattern'
    | 'explain';
  chordProgression?: string;
  patternType?: 'melody' | 'bass' | 'arpeggio' | 'rhythm';
  arpeggioStyle?: 'up' | 'down' | 'updown';
  complexity?: 'simple' | 'moderate' | 'complex';
}

/**
 * Interactive AI agent for MIDI generation
 */
async function midiConversationAgent(
  userMessage: string,
  context: MidiGenerationContext,
  songContext?: {
    genre: string;
    mood: string;
    tempo: number;
    key: string;
    timeSignature: string;
  }
): Promise<MidiGenerationResponse> {
  try {
    // Build conversation history
    const conversationHistory = context.conversationHistory
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n');

    const systemPrompt = `You are an expert music theory and MIDI programming assistant. Your goal is to help users create MIDI patterns based on chord progressions through interactive conversation.

Current Context:
${songContext ? `- Genre: ${songContext.genre}` : ''}
${songContext ? `- Mood: ${songContext.mood}` : ''}
${songContext ? `- Tempo: ${songContext.tempo} BPM` : ''}
${songContext ? `- Key: ${songContext.key}` : ''}
${songContext ? `- Time Signature: ${songContext.timeSignature}` : ''}
${
  context.chordProgression
    ? `- Chord Progression: ${context.chordProgression.chords
        .map((c) => c.name)
        .join(' ')}`
    : ''
}
${context.patternType ? `- Pattern Type: ${context.patternType}` : ''}
${context.complexity ? `- Complexity: ${context.complexity}` : ''}

Your tasks:
1. Understand what the user wants to create (melody, bass, arpeggio, rhythm pattern)
2. Extract or help them define a chord progression
3. Ask clarifying questions if needed
4. Generate appropriate MIDI patterns once you have enough information

Respond in JSON format:
{
  "needsMoreInfo": boolean,
  "assistantMessage": "your conversational response to the user",
  "suggestedQuestions": ["optional", "follow-up", "questions"],
  "actionType": "parse_chords | generate_pattern | refine_pattern | explain",
  "chordProgression": "optional chord progression string like 'Cmaj7 Am7 Dm7 G7'",
  "patternType": "melody | bass | arpeggio | rhythm",
  "arpeggioStyle": "up | down | updown (only if arpeggio)",
  "complexity": "simple | moderate | complex"
}

Previous conversation:
${conversationHistory}

Guidelines:
- Be conversational and helpful
- Suggest common chord progressions if user is unsure (I-V-vi-IV, ii-V-I, etc.)
- Explain music theory concepts when relevant
- Once you have chord progression and pattern type, set needsMoreInfo to false
- If user provides chords like "C Am F G" or "Cmaj7-Am7-Dm7-G7", extract them
- Default to the song's key and tempo if provided`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(userMessage),
    ];

    console.log('🎹 MIDI Agent analyzing request...');
    const agentResponse = await llm.invoke(messages);
    const agentContent = String(agentResponse.content);

    // Parse agent's decision
    let decision: AgentDecision;
    try {
      const jsonMatch = agentContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        decision = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch {
      console.error('Failed to parse agent response:', agentContent);
      decision = {
        needsMoreInfo: true,
        assistantMessage:
          "I'm here to help you create MIDI patterns! Could you tell me what chord progression you'd like to use?",
        suggestedQuestions: [
          'What type of pattern? (melody, bass, arpeggio, rhythm)',
          'What chord progression should I use?',
        ],
      };
    }

    console.log('🎼 Agent Decision:', decision);

    // Update context
    const updatedContext: MidiGenerationContext = {
      ...context,
      conversationHistory: [
        ...context.conversationHistory,
        {
          role: 'user',
          content: userMessage,
          timestamp: Date.now(),
        },
        {
          role: 'assistant',
          content: decision.assistantMessage,
          timestamp: Date.now(),
        },
      ],
    };

    // If agent provided chord progression, parse it
    let chordProgression = context.chordProgression;
    if (decision.chordProgression && songContext) {
      chordProgression = parseChordProgression(
        decision.chordProgression,
        songContext.key,
        songContext.tempo,
        songContext.timeSignature
      );
      updatedContext.chordProgression = chordProgression;
    }

    // Update pattern type if provided
    if (decision.patternType) {
      updatedContext.patternType = decision.patternType;
    }

    // Update complexity if provided
    if (decision.complexity) {
      updatedContext.complexity = decision.complexity;
    }

    // If we have all the info needed, generate the pattern
    if (
      !decision.needsMoreInfo &&
      chordProgression &&
      updatedContext.patternType
    ) {
      console.log('✨ Generating MIDI pattern...');

      let midiPattern: MidiPattern;

      switch (updatedContext.patternType) {
        case 'bass':
          midiPattern = generateBassLine(chordProgression);
          break;
        case 'arpeggio':
          midiPattern = generateArpeggio(
            chordProgression,
            decision.arpeggioStyle || 'up'
          );
          break;
        case 'melody':
          midiPattern = generateMelody(chordProgression);
          break;
        case 'rhythm':
          midiPattern = generateRhythmPattern(chordProgression);
          break;
        default:
          midiPattern = generateMelody(chordProgression);
      }

      // Convert to MIDI file
      const midiFileData = midiPatternToBase64(midiPattern);

      console.log('✅ MIDI pattern generated!');

      return {
        success: true,
        assistantMessage: decision.assistantMessage,
        needsMoreInfo: false,
        midiPattern,
        chordProgression,
        midiFileData,
        updatedContext,
      };
    }

    // Need more information
    return {
      success: true,
      assistantMessage: decision.assistantMessage,
      needsMoreInfo: true,
      suggestedQuestions: decision.suggestedQuestions,
      chordProgression: chordProgression,
      updatedContext,
    };
  } catch (error) {
    console.error('❌ MIDI conversation agent error:', error);
    return {
      success: false,
      assistantMessage:
        'Sorry, I encountered an error. Could you rephrase your request?',
      needsMoreInfo: true,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MidiGenerationRequest;
    const { userMessage, context, songContext } = body;

    // Validate required fields
    if (!userMessage) {
      return NextResponse.json(
        { error: 'Missing required field: userMessage' },
        { status: 400 }
      );
    }

    // Initialize context if not provided
    const initializedContext: MidiGenerationContext = context || {
      conversationHistory: [],
    };

    // Run the conversational agent
    const result = await midiConversationAgent(
      userMessage,
      initializedContext,
      songContext
    );

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Failed to process MIDI generation request' },
      { status: 500 }
    );
  }
}
