import { MidiClipData, MidiNote, noteNameToNumber } from '@/lib/midiTypes';
import { DAWState } from '@/types/music-production';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Initialize the LLM with function calling
const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-2.5-flash',
  apiKey: process.env.GOOGLE_API_KEY,
  temperature: 0.3,
});

// Validate API key is set
if (!process.env.GOOGLE_API_KEY) {
  console.error('❌ GOOGLE_API_KEY is not set in environment variables');
}

// MIDI Assistant Request/Response Types
interface MidiAssistantRequest {
  message: string;
  dawState: DAWState;
  clipData: MidiClipData;
  trackId: string;
  trackName: string;
  userContext?: string;
}

interface MidiAssistantResponse {
  success: boolean;
  message: string;
  clipData?: MidiClipData;
  error?: string;
}

// Tool: Add MIDI notes (for melodies, chord progressions, patterns)
// Note: Using string for pitch to avoid union type issues with Google's API
const addMidiNotesTool = new DynamicStructuredTool({
  name: 'add_midi_notes',
  description:
    'Add MIDI notes to the piano roll. Use this to create melodies, chord progressions, bass lines, patterns, or any musical content. You can add single notes or multiple notes at once. Notes are specified by pitch (MIDI note number 0-127 as a string, or note name like "C4"), start time in bars, duration in bars, and velocity (0-1).',
  schema: z.object({
    notes: z
      .array(
        z.object({
          pitch: z
            .string()
            .describe(
              'MIDI note as string: number (0-127) or note name (e.g., "C4", "F#3", "60" for C4)'
            ),
          start: z
            .number()
            .min(0)
            .describe('Start time in bars (0 = start of clip)'),
          duration: z
            .number()
            .min(0.0625)
            .describe(
              'Duration in bars (0.0625 = 16th note, 0.25 = quarter note)'
            ),
          velocity: z
            .number()
            .min(0)
            .max(1)
            .default(0.8)
            .describe('Velocity/volume (0-1, default 0.8)'),
        })
      )
      .describe('Array of MIDI notes to add'),
    clearExisting: z
      .boolean()
      .default(false)
      .describe(
        'If true, clear all existing notes before adding new ones. Use this when user wants to replace everything.'
      ),
  }),
  func: async ({ notes, clearExisting }) => {
    return JSON.stringify({
      success: true,
      notes,
      clearExisting,
      action: 'add_notes',
    });
  },
});

// Tool: Remove MIDI notes
const removeMidiNotesTool = new DynamicStructuredTool({
  name: 'remove_midi_notes',
  description:
    'Remove specific MIDI notes from the piano roll. You can remove notes by pitch, time range, or note IDs. Use this when the user wants to delete specific notes or clear a section.',
  schema: z.object({
    noteIds: z
      .array(z.string())
      .optional()
      .describe('Specific note IDs to remove (if you know them)'),
    pitch: z
      .string()
      .optional()
      .describe(
        'Remove all notes at this pitch (MIDI number as string or note name like "C4")'
      ),
    timeRange: z
      .object({
        start: z.number().min(0).describe('Start time in bars'),
        end: z.number().min(0).describe('End time in bars'),
      })
      .optional()
      .describe('Remove all notes within this time range'),
    clearAll: z
      .boolean()
      .default(false)
      .describe('If true, remove all notes from the clip'),
  }),
  func: async ({ noteIds, pitch, timeRange, clearAll }) => {
    return JSON.stringify({
      success: true,
      noteIds,
      pitch,
      timeRange,
      clearAll,
      action: 'remove_notes',
    });
  },
});

// Tool: Modify MIDI notes
const modifyMidiNotesTool = new DynamicStructuredTool({
  name: 'modify_midi_notes',
  description:
    'Modify existing MIDI notes (change pitch, start time, duration, or velocity). Use this to adjust notes that are already in the piano roll.',
  schema: z.object({
    noteIds: z
      .array(z.string())
      .optional()
      .describe('Specific note IDs to modify'),
    pitch: z
      .string()
      .optional()
      .describe(
        'Modify all notes at this pitch (MIDI number as string or note name)'
      ),
    changes: z.object({
      pitch: z
        .string()
        .optional()
        .describe(
          'New pitch as string (MIDI number as string or note name like "C4")'
        ),
      start: z.number().min(0).optional().describe('New start time in bars'),
      duration: z
        .number()
        .min(0.0625)
        .optional()
        .describe('New duration in bars'),
      velocity: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('New velocity (0-1)'),
    }),
  }),
  func: async ({ noteIds, pitch, changes }) => {
    return JSON.stringify({
      success: true,
      noteIds,
      pitch,
      changes,
      action: 'modify_notes',
    });
  },
});

// Helper function to convert note name or string number to MIDI number
function parsePitch(pitch: number | string): number {
  if (typeof pitch === 'number') {
    return pitch;
  }
  // Try to parse as number first (e.g., "60" -> 60)
  const numPitch = parseInt(pitch, 10);
  if (!isNaN(numPitch) && numPitch >= 0 && numPitch <= 127) {
    return numPitch;
  }
  // Otherwise, treat as note name (e.g., "C4")
  return noteNameToNumber(pitch);
}

// Helper function to generate chord notes (currently unused but kept for future use)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function generateChordNotes(
  rootNote: string | number,
  chordType: string,
  startBar: number,
  duration: number = 0.25,
  _octave: number = 4
): Array<{ pitch: number; start: number; duration: number; velocity: number }> {
  const root = parsePitch(rootNote);
  const rootOctave =
    typeof rootNote === 'string'
      ? parseInt(rootNote.match(/\d+/)?.[0] || '4')
      : Math.floor(root / 12) - 1;
  const rootNoteInOctave = typeof rootNote === 'string' ? root % 12 : root % 12;

  const intervals: { [key: string]: number[] } = {
    major: [0, 4, 7],
    minor: [0, 3, 7],
    diminished: [0, 3, 6],
    augmented: [0, 4, 8],
    sus2: [0, 2, 7],
    sus4: [0, 5, 7],
    major7: [0, 4, 7, 11],
    minor7: [0, 3, 7, 10],
    dominant7: [0, 4, 7, 10],
    add9: [0, 4, 7, 14],
  };

  const chordIntervals = intervals[chordType.toLowerCase()] || intervals.major;
  const baseNote = rootOctave * 12 + rootNoteInOctave + 12; // Convert to MIDI note

  return chordIntervals.map((interval) => ({
    pitch: baseNote + interval,
    start: startBar,
    duration,
    velocity: 0.8,
  }));
}

const tools = [addMidiNotesTool, removeMidiNotesTool, modifyMidiNotesTool];

/**
 * MIDI Assistant Agent - Specialized for MIDI editing in piano roll
 *
 * This agent helps users with MIDI editing by:
 * - Creating melodies, chord progressions, and patterns
 * - Adding, removing, and modifying MIDI notes
 * - Understanding musical context from the DAW state
 */
// Helper function to get note name from MIDI pitch
function getNoteName(pitch: number): string {
  const noteNames = [
    'C',
    'C#',
    'D',
    'D#',
    'E',
    'F',
    'F#',
    'G',
    'G#',
    'A',
    'A#',
    'B',
  ];
  const octave = Math.floor(pitch / 12) - 1;
  const noteName = noteNames[pitch % 12];
  return `${noteName}${octave}`;
}

async function midiAssistantAgent(
  message: string,
  dawState: DAWState,
  clipData: MidiClipData,
  trackId: string,
  trackName: string,
  userContext?: string,
  _retryCount = 0
): Promise<MidiAssistantResponse> {
  try {
    // Build the system prompt with current context
    const systemPrompt = `You are an expert MIDI editing assistant integrated into a Digital Audio Workstation (DAW) piano roll editor.
Your primary job is to help users create and edit MIDI notes for melodies, chord progressions, bass lines, and musical patterns.

**CRITICAL RULES:**
1. When a user requests to create music (melodies, chords, patterns), you MUST call add_midi_notes tool immediately
2. DO NOT just describe what you will do - actually call the tool(s) to perform the action
3. Only provide conversational responses when the user is asking questions or seeking advice
4. You can work with existing notes - you don't have to remove them unless the user explicitly asks
5. If the user wants to replace everything, use clearExisting: true in add_midi_notes

**Current DAW Context:**
- BPM: ${dawState.bpm}
- Metronome: ${dawState.metronomeEnabled ? 'ON' : 'OFF'}
- Number of tracks: ${dawState.tracks.length}
${
  dawState.tracks.length > 0
    ? `- Tracks:\n${dawState.tracks
        .map((t) => {
          let trackInfo = `  • ${t.name} (${t.type.toUpperCase()}) - Volume: ${(
            t.volume * 100
          ).toFixed(0)}%, ${t.muted ? 'MUTED' : 'ACTIVE'}`;
          if (t.type === 'midi') {
            if (t.instrumentMode === 'synth' && t.synthPreset) {
              trackInfo += ` - Synth: ${t.synthPreset}`;
            } else if (t.instrumentMode === 'sampler' && t.samplerAudioUrl) {
              trackInfo += ` - Sampler: ${t.samplerAudioUrl}`;
            }
          }
          return trackInfo;
        })
        .join('\n')}`
    : '- No tracks yet'
}

**Current MIDI Clip Context:**
- Track: "${trackName}" (ID: ${trackId})
- Clip Length: ${clipData.bars} bars
- Current Notes: ${clipData.notes.length} notes
${
  clipData.notes.length > 0
    ? `- Existing Notes:\n${clipData.notes
        .slice(0, 20)
        .map((n) => {
          const noteName = getNoteName(n.pitch);
          return `  • ${noteName} at bar ${n.start.toFixed(
            2
          )}, duration ${n.duration.toFixed(
            2
          )} bars, velocity ${n.velocity.toFixed(2)}`;
        })
        .join('\n')}${
        clipData.notes.length > 20
          ? `\n  ... and ${clipData.notes.length - 20} more notes`
          : ''
      }`
    : '- No notes yet - empty clip'
}

${userContext ? `**User Context:** ${userContext}` : ''}

**Available Tools (USE THESE TO PERFORM ACTIONS):**
- add_midi_notes: Add MIDI notes to create melodies, chord progressions, bass lines, patterns, etc. USE THIS when user wants to create music.
- remove_midi_notes: Remove specific notes or clear sections. USE THIS when user wants to delete notes.
- modify_midi_notes: Modify existing notes (change pitch, timing, velocity). USE THIS when user wants to adjust existing notes.

**Musical Knowledge:**
- MIDI note numbers: C4 = 60, C3 = 48, C5 = 72
- Common chord progressions:
  * I-IV-V-I (C-F-G-C in C major)
  * I-vi-IV-V (C-Am-F-G in C major)
  * ii-V-I (Dm-G-C in C major)
- Common scales:
  * Major: 0, 2, 4, 5, 7, 9, 11 (C, D, E, F, G, A, B)
  * Minor: 0, 2, 3, 5, 7, 8, 10 (C, D, Eb, F, G, Ab, Bb)
- Note durations (in bars at 4/4):
  * Whole note = 4 bars
  * Half note = 2 bars
  * Quarter note = 1 bar
  * Eighth note = 0.5 bars
  * Sixteenth note = 0.25 bars
  * Thirty-second note = 0.125 bars

**Grid Information:**
- Grid is divided into 16th notes (${clipData.bars * 16} divisions total for ${
      clipData.bars
    } bars)
- Smallest note duration: 0.0625 bars (1/16th note)
- Clip range: 0 to ${clipData.bars} bars

**Examples of CORRECT behavior:**
- User: "Create a C major chord" → Call add_midi_notes with notes: [{pitch: "C4", start: 0, duration: 0.25}, {pitch: "E4", start: 0, duration: 0.25}, {pitch: "G4", start: 0, duration: 0.25}]
- User: "Add a melody" → Call add_midi_notes with a sequence of notes forming a melody
- User: "Create a bass line" → Call add_midi_notes with lower-pitched notes (C2-C4 range)
- User: "Remove all notes" → Call remove_midi_notes with clearAll: true
- User: "Add a chord progression" → Call add_midi_notes with multiple chords at different start times

**Examples of INCORRECT behavior (DO NOT DO THIS):**
- User: "Create a C major chord" → ❌ WRONG: "I'll create a C major chord for you" (without calling tool)
- User: "Add a melody" → ❌ WRONG: "Sure, I can add a melody" (without calling tool)

**Guidelines:**
- When creating chord progressions, place chords at musically appropriate intervals (typically every 1-2 bars)
- When creating melodies, use notes that fit within the clip's bar range (0 to ${
      clipData.bars
    })
- Velocity typically ranges from 0.5-1.0, with 0.8 as a good default
- You can add notes that overlap with existing notes - they will play together
- If user says "replace" or "clear and add", use clearExisting: true
- For bass lines, use lower octaves (C2-C4, MIDI 36-60)
- For melodies, use middle to upper octaves (C4-C6, MIDI 60-84)
- For chords, use middle octaves (C3-C5, MIDI 48-72)

Now help the user with their MIDI editing request. Remember: ACTIONS REQUIRE TOOL CALLS!`;

    // Create messages first
    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(message),
    ];

    console.log('🎹 MIDI Assistant analyzing request...');
    console.log('📝 System prompt length:', systemPrompt.length);
    console.log('📝 User message:', message.substring(0, 100));
    console.log('🔧 Tools available:', tools.length);
    console.log(
      '🔧 Tool names:',
      tools.map((t) => t.name)
    );

    // Validate tools are properly initialized
    if (!tools || tools.length === 0) {
      throw new Error('Tools array is empty or not initialized');
    }

    // Validate messages
    if (!messages || messages.length === 0) {
      throw new Error('Messages array is empty');
    }

    // Use direct JSON generation approach instead of tool binding
    // This works around the LangChain/Google API compatibility issue with tool binding
    console.log('📝 Using direct JSON generation approach');

    let response;
    try {
      // Invoke without tools and ask for JSON response
      const jsonPrompt = `${systemPrompt}

IMPORTANT: You must respond with ONLY a valid JSON object in this exact format:
{
  "notes": [
    {
      "pitch": "C4" or "60" (string),
      "start": 0.0 (number in bars),
      "duration": 0.25 (number in bars),
      "velocity": 0.8 (number 0-1)
    }
  ],
  "message": "Your response message here"
}

NOTE: All existing notes will be automatically cleared before adding new notes. You don't need to specify clearExisting.

Do NOT include any text before or after the JSON. Only return the JSON object.`;

      const jsonMessages = [
        new SystemMessage(jsonPrompt),
        new HumanMessage(message),
      ];

      response = await llm.invoke(jsonMessages);
      console.log('✅ LLM response received');
    } catch (error) {
      console.error('❌ Error invoking LLM:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
      });

      // If it's a specific error about 'parts', try a simpler approach
      if (error instanceof Error && error.message.includes('parts')) {
        console.error(
          '⚠️ This appears to be a message format issue with Google Generative AI'
        );
        console.error('⚠️ Attempting simpler fallback...');

        try {
          // Try without tools - the LLM might still generate useful JSON
          const fallbackResponse = await llm.invoke(messages);
          console.log('✅ Fallback response received');

          // Extract text response
          let fallbackText = '';
          if (typeof fallbackResponse.content === 'string') {
            fallbackText = fallbackResponse.content;
          } else if (Array.isArray(fallbackResponse.content)) {
            fallbackText = fallbackResponse.content
              .filter(
                (item) => typeof item === 'string' || item.type === 'text'
              )
              .map((item) =>
                typeof item === 'string' ? item : item.text || ''
              )
              .join(' ');
          } else {
            fallbackText = String(fallbackResponse.content || '');
          }

          // Try to parse JSON from the response
          const jsonMatch = fallbackText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed.notes && Array.isArray(parsed.notes)) {
                // We got notes from the fallback, process them
                const notesToAdd: MidiNote[] = parsed.notes.map(
                  (note: {
                    pitch: number | string;
                    start: number;
                    duration: number;
                    velocity?: number;
                  }) => ({
                    id: crypto.randomUUID(),
                    pitch: parsePitch(note.pitch),
                    start: note.start,
                    duration: note.duration,
                    velocity: note.velocity || 0.8,
                  })
                );

                return {
                  success: true,
                  message:
                    fallbackText || "I've created the MIDI notes for you.",
                  clipData: {
                    ...clipData,
                    notes: parsed.clearExisting
                      ? notesToAdd
                      : [...clipData.notes, ...notesToAdd],
                  },
                };
              }
            } catch (parseError) {
              console.error('❌ Failed to parse fallback JSON:', parseError);
            }
          }

          // If we can't parse JSON, return the text response
          return {
            success: true,
            message:
              fallbackText ||
              "I processed your request, but couldn't generate MIDI notes automatically. Please try rephrasing your request.",
          };
        } catch (fallbackError) {
          console.error('❌ Fallback also failed:', fallbackError);
          throw error; // Throw original error
        }
      }

      throw error;
    }

    // Extract text response from LLM
    let textResponse = '';
    if (typeof response.content === 'string') {
      textResponse = response.content;
    } else if (Array.isArray(response.content)) {
      textResponse = response.content
        .filter((item) => typeof item === 'string' || item.type === 'text')
        .map((item) => (typeof item === 'string' ? item : item.text || ''))
        .join(' ');
    } else {
      textResponse = String(response.content || '');
    }

    console.log('💬 Response received:', textResponse.substring(0, 200));

    let updatedClipData: MidiClipData | undefined = undefined;

    // Try to parse JSON from the response
    console.log('🔍 Attempting to parse JSON from response...');
    let responseMessage = textResponse;

    try {
      // Try to find JSON in the response (might have markdown code blocks)
      let jsonText = textResponse.trim();

      // Remove markdown code blocks if present (handle various formats)
      jsonText = jsonText
        .replace(/```json\s*\n?/gi, '') // Remove ```json with optional whitespace
        .replace(/```\s*\n?/g, '') // Remove closing ```
        .trim();

      // Try to find JSON object
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('✅ Successfully parsed JSON:', Object.keys(parsed));

        // Use the message from parsed JSON if available, otherwise use the full response
        if (parsed.message) {
          responseMessage = parsed.message;
        }

        if (parsed.notes && Array.isArray(parsed.notes)) {
          console.log(`📝 Found ${parsed.notes.length} notes to add`);

          // Process notes
          const notesToAdd: MidiNote[] = parsed.notes.map(
            (note: {
              pitch: number | string;
              start: number;
              duration: number;
              velocity?: number;
            }) => ({
              id: crypto.randomUUID(),
              pitch: parsePitch(note.pitch),
              start: note.start,
              duration: note.duration,
              velocity: note.velocity || 0.8,
            })
          );

          // Always clear existing notes before adding new ones
          updatedClipData = {
            ...clipData,
            notes: notesToAdd,
          };

          console.log(
            `✅ Cleared existing notes and added ${notesToAdd.length} new notes`
          );

          console.log(
            '✅ Created updated clip data with',
            updatedClipData.notes.length,
            'notes'
          );
        } else {
          console.log('⚠️ JSON parsed but no notes array found');
        }
      } else {
        console.log('⚠️ No JSON object found in response');
      }
    } catch (parseError) {
      console.error('❌ Failed to parse JSON:', parseError);
      console.error('Raw response:', textResponse.substring(0, 500));
      // Return the text response even if we can't parse JSON
    }

    return {
      success: true,
      message: responseMessage || "I've processed your MIDI editing request.",
      clipData: updatedClipData,
    };
  } catch (error) {
    console.error('❌ MIDI Assistant agent error:', error);
    return {
      success: false,
      message: 'Sorry, I encountered an error processing your request.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MidiAssistantRequest;
    const { message, dawState, clipData, trackId, trackName, userContext } =
      body;

    // Validate required fields
    if (!message || !dawState || !clipData || !trackId || !trackName) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: message, dawState, clipData, trackId, or trackName',
        },
        { status: 400 }
      );
    }

    // Run the agent
    const result = await midiAssistantAgent(
      message,
      dawState,
      clipData,
      trackId,
      trackName,
      userContext
    );

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Failed to process MIDI assistant request' },
      { status: 500 }
    );
  }
}
