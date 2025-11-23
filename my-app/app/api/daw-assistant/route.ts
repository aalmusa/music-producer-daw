import type {
  DAWAction,
  DAWAssistantRequest,
  DAWAssistantResponse,
} from '@/types/music-production';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loadSongSpec, type SongSpec } from '../context/SongSpecStore';

// Initialize the LLM with function calling
// Lower temperature for more deterministic tool calling behavior
const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-2.5-flash',
  apiKey: process.env.GOOGLE_API_KEY,
  temperature: 0.3, // Lower temperature for more consistent tool usage
});

// Define tools for the DAW assistant
const createTrackWithInstrumentTool = new DynamicStructuredTool({
  name: 'create_track_with_instrument',
  description:
    'Create a new MIDI track and configure it with a specific instrument. Use this when the user wants a track with a specific instrument like piano, bass, hi-hat, etc.',
  schema: z.object({
    trackName: z
      .string()
      .describe('Name for the track (e.g., "Piano", "Bass", "Hi-hat")'),
    instrument: z
      .enum(['piano', 'bass', 'lead', 'pad', 'bells', 'pluck', 'hihat', 'clap'])
      .describe(
        'Instrument type: piano, bass, lead (guitar), pad, bells, pluck (strings), hihat, clap'
      ),
  }),
  func: async ({ trackName, instrument }) => {
    // This is a placeholder - the actual execution happens in the frontend
    // We return metadata that will be converted to actions
    return JSON.stringify({
      success: true,
      trackName,
      instrument,
      actions: generateActionsForInstrument(trackName, instrument),
    });
  },
});

const createEmptyTrackTool = new DynamicStructuredTool({
  name: 'create_empty_track',
  description:
    'Create a new MIDI track without configuring an instrument. Use this when you want to ask the user what instrument they want.',
  schema: z.object({
    trackName: z.string().describe('Name for the track'),
  }),
  func: async ({ trackName }) => {
    return JSON.stringify({
      success: true,
      trackName,
      actions: [
        {
          type: 'create_track',
          trackType: 'midi',
          trackName,
          reasoning: 'Creating empty MIDI track for user to configure',
        },
      ],
    });
  },
});

const createAudioTrackTool = new DynamicStructuredTool({
  name: 'create_audio_track',
  description:
    'Create a new audio track for audio files/loops. Use this when the user wants an audio track or when suggesting tracks that would benefit from audio samples (drums, vocals, recorded instruments, etc.).',
  schema: z.object({
    trackName: z
      .string()
      .describe(
        'Name for the audio track (e.g., "Drums", "Vocals", "Guitar Loop")'
      ),
  }),
  func: async ({ trackName }) => {
    return JSON.stringify({
      success: true,
      trackName,
      actions: [
        {
          type: 'create_track',
          trackType: 'audio',
          trackName,
          reasoning: `Creating audio track for ${trackName}`,
        },
      ],
    });
  },
});

const suggestComprehensiveTracksTool = new DynamicStructuredTool({
  name: 'suggest_comprehensive_tracks',
  description:
    'Generate a comprehensive list of 8-12 varied track suggestions for a music project. Use this when the user asks for track ideas, suggestions, or what tracks to create. This should include a good mix of MIDI tracks with different synth presets AND audio tracks.',
  schema: z.object({
    genre: z
      .string()
      .optional()
      .describe(
        'Music genre or style (e.g., "electronic", "hip-hop", "pop", "ambient")'
      ),
    includeAudio: z
      .boolean()
      .default(true)
      .describe('Whether to include audio track suggestions'),
    trackCount: z
      .number()
      .min(8)
      .max(15)
      .default(10)
      .describe('Number of tracks to suggest (8-15, default 10)'),
  }),
  func: async ({ genre, includeAudio = true, trackCount = 10 }) => {
    // Generate comprehensive track suggestions with variety
    // Always aim for 8-12 tracks with good mix of MIDI (different synths) and audio
    const suggestions: Array<{
      type: 'midi' | 'audio';
      name: string;
      instrument?: string;
      synthPreset?: string;
    }> = [];

    // Core rhythm section (always include)
    suggestions.push(
      { type: 'audio', name: 'Kick Drum' },
      { type: 'audio', name: 'Drums' },
      { type: 'midi', name: 'Bass', instrument: 'bass', synthPreset: 'bass' }
    );

    // Percussion variety
    suggestions.push(
      { type: 'midi', name: 'Hi-hat', instrument: 'hihat' },
      { type: 'midi', name: 'Clap', instrument: 'clap' }
    );

    // Melodic elements with DIFFERENT synth presets (variety is key!)
    suggestions.push(
      {
        type: 'midi',
        name: 'Lead Synth',
        instrument: 'lead',
        synthPreset: 'lead',
      },
      { type: 'midi', name: 'Pad', instrument: 'pad', synthPreset: 'pad' },
      {
        type: 'midi',
        name: 'Piano',
        instrument: 'piano',
        synthPreset: 'piano',
      },
      {
        type: 'midi',
        name: 'Strings',
        instrument: 'pluck',
        synthPreset: 'pluck',
      },
      { type: 'midi', name: 'Bells', instrument: 'bells', synthPreset: 'bells' }
    );

    // Additional audio tracks for variety
    if (includeAudio) {
      suggestions.push(
        { type: 'audio', name: 'Vocals' },
        { type: 'audio', name: 'FX' }
      );
    }

    // Genre-specific additions
    if (genre) {
      const lowerGenre = genre.toLowerCase();
      if (lowerGenre.includes('electronic') || lowerGenre.includes('edm')) {
        suggestions.push(
          {
            type: 'midi',
            name: 'Arp',
            instrument: 'pluck',
            synthPreset: 'pluck',
          },
          {
            type: 'midi',
            name: 'Pluck',
            instrument: 'pluck',
            synthPreset: 'pluck',
          },
          { type: 'audio', name: 'Riser' }
        );
      } else if (lowerGenre.includes('hip-hop') || lowerGenre.includes('rap')) {
        suggestions.push(
          { type: 'audio', name: 'Vocal Samples' },
          {
            type: 'midi',
            name: '808',
            instrument: 'bass',
            synthPreset: 'bass',
          },
          { type: 'audio', name: 'Snare' }
        );
      } else if (lowerGenre.includes('pop')) {
        suggestions.push(
          { type: 'audio', name: 'Acoustic Guitar' },
          {
            type: 'midi',
            name: 'Synth Chords',
            instrument: 'pad',
            synthPreset: 'pad',
          },
          { type: 'audio', name: 'Percussion' }
        );
      } else if (lowerGenre.includes('ambient')) {
        suggestions.push(
          {
            type: 'midi',
            name: 'Atmosphere',
            instrument: 'pad',
            synthPreset: 'pad',
          },
          { type: 'audio', name: 'Field Recording' },
          {
            type: 'midi',
            name: 'Texture',
            instrument: 'pluck',
            synthPreset: 'pluck',
          }
        );
      }
    }

    // Ensure we have at least trackCount suggestions, fill with more variety if needed
    while (suggestions.length < trackCount) {
      const additionalTracks = [
        {
          type: 'midi' as const,
          name: 'Synth 2',
          instrument: 'lead',
          synthPreset: 'lead',
        },
        {
          type: 'midi' as const,
          name: 'Pad 2',
          instrument: 'pad',
          synthPreset: 'pad',
        },
        { type: 'audio' as const, name: 'Sample' },
        {
          type: 'midi' as const,
          name: 'Pluck',
          instrument: 'pluck',
          synthPreset: 'pluck',
        },
        { type: 'audio' as const, name: 'Loop' },
      ];
      suggestions.push(
        ...additionalTracks.slice(0, trackCount - suggestions.length)
      );
    }

    // Trim to requested count (but ensure minimum variety)
    const finalSuggestions = suggestions.slice(0, Math.max(trackCount, 8));

    // Convert to actions
    const actions: DAWAction[] = [];
    for (const suggestion of finalSuggestions) {
      if (suggestion.type === 'audio') {
        actions.push({
          type: 'create_track',
          trackType: 'audio',
          trackName: suggestion.name,
          reasoning: `Suggested audio track: ${suggestion.name}`,
        });
      } else {
        // MIDI track with instrument
        const instrumentActions = generateActionsForInstrument(
          suggestion.name,
          suggestion.instrument || 'piano'
        );
        actions.push(...instrumentActions);
      }
    }

    return JSON.stringify({
      success: true,
      suggestions: finalSuggestions,
      actions,
      message: `Here's a comprehensive track setup with ${finalSuggestions.length} tracks including a mix of MIDI synths and audio tracks!`,
    });
  },
});

const adjustBpmTool = new DynamicStructuredTool({
  name: 'adjust_bpm',
  description: 'Change the project tempo/BPM',
  schema: z.object({
    bpm: z.number().min(40).max(240).describe('New BPM value (40-240)'),
  }),
  func: async ({ bpm }) => {
    return JSON.stringify({
      success: true,
      actions: [
        {
          type: 'adjust_bpm',
          bpm,
          reasoning: `Setting BPM to ${bpm}`,
        },
      ],
    });
  },
});

const adjustVolumeTool = new DynamicStructuredTool({
  name: 'adjust_volume',
  description: 'Adjust the volume of a specific track',
  schema: z.object({
    trackName: z.string().describe('Name of the track to adjust'),
    volume: z
      .number()
      .min(0)
      .max(1)
      .describe('Volume level from 0 to 1 (0% to 100%)'),
  }),
  func: async ({ trackName, volume }) => {
    return JSON.stringify({
      success: true,
      actions: [
        {
          type: 'adjust_volume',
          trackName,
          volume,
          reasoning: `Adjusting ${trackName} volume to ${Math.round(
            volume * 100
          )}%`,
        },
      ],
    });
  },
});

const deleteTrackTool = new DynamicStructuredTool({
  name: 'delete_track',
  description: 'Delete an existing track',
  schema: z.object({
    trackName: z.string().describe('Name of the track to delete'),
  }),
  func: async ({ trackName }) => {
    return JSON.stringify({
      success: true,
      actions: [
        {
          type: 'delete_track',
          trackName,
          reasoning: `Deleting track ${trackName}`,
        },
      ],
    });
  },
});

const muteTracksTool = new DynamicStructuredTool({
  name: 'mute_tracks',
  description: 'Mute one or more tracks by name or pattern',
  schema: z.object({
    pattern: z
      .string()
      .describe(
        'Track name or pattern to match (e.g., "drum" matches all drum tracks)'
      ),
  }),
  func: async ({ pattern }) => {
    return JSON.stringify({
      success: true,
      actions: [
        {
          type: 'mute_tracks',
          trackPattern: pattern,
          reasoning: `Muting tracks matching "${pattern}"`,
        },
      ],
    });
  },
});

const unmuteTracksTool = new DynamicStructuredTool({
  name: 'unmute_tracks',
  description: 'Unmute one or more tracks by name or pattern',
  schema: z.object({
    pattern: z.string().describe('Track name or pattern to match'),
  }),
  func: async ({ pattern }) => {
    return JSON.stringify({
      success: true,
      actions: [
        {
          type: 'unmute_tracks',
          trackPattern: pattern,
          reasoning: `Unmuting tracks matching "${pattern}"`,
        },
      ],
    });
  },
});

const toggleMetronomeTool = new DynamicStructuredTool({
  name: 'toggle_metronome',
  description: 'Turn the metronome on or off',
  schema: z.object({
    enabled: z.boolean().describe('True to turn on, false to turn off'),
  }),
  func: async ({ enabled }) => {
    return JSON.stringify({
      success: true,
      actions: [
        {
          type: 'toggle_metronome',
          metronomeEnabled: enabled,
          reasoning: `${enabled ? 'Enabling' : 'Disabling'} metronome`,
        },
      ],
    });
  },
});

// Helper function to generate actions for a specific instrument
function generateActionsForInstrument(
  trackName: string,
  instrument: string
): DAWAction[] {
  const actions: DAWAction[] = [];

  // Create track
  actions.push({
    type: 'create_track',
    trackType: 'midi',
    trackName,
    reasoning: `Creating MIDI track for ${instrument}`,
  });

  // Configure based on instrument type
  if (instrument === 'hihat' || instrument === 'clap') {
    // Sampler instruments
    actions.push({
      type: 'set_instrument_mode',
      trackName,
      instrumentMode: 'sampler',
      reasoning: `Setting ${trackName} to sampler mode`,
    });

    const audioPath =
      instrument === 'hihat' ? '/audio/hihat.wav' : '/audio/clap.wav';
    actions.push({
      type: 'select_instrument',
      trackName,
      instrumentPath: audioPath,
      reasoning: `Loading ${instrument} sample`,
    });
  } else {
    // Synth instruments
    actions.push({
      type: 'set_instrument_mode',
      trackName,
      instrumentMode: 'synth',
      reasoning: `Setting ${trackName} to synth mode`,
    });

    actions.push({
      type: 'set_synth_preset',
      trackName,
      synthPreset: instrument,
      reasoning: `Applying ${instrument} preset`,
    });
  }

  return actions;
}

const tools = [
  createTrackWithInstrumentTool,
  createEmptyTrackTool,
  createAudioTrackTool,
  suggestComprehensiveTracksTool,
  adjustBpmTool,
  adjustVolumeTool,
  deleteTrackTool,
  muteTracksTool,
  unmuteTracksTool,
  toggleMetronomeTool,
];

/**
 * Detect if user message is requesting an action (vs just asking a question)
 */
function isActionRequest(message: string): boolean {
  const lowerMessage = message.toLowerCase();

  // Exclude question/suggestion requests
  const questionKeywords = [
    'what',
    'suggest',
    'ideas',
    'recommend',
    'should i',
    'what should',
    'give me ideas',
    'what tracks',
    'list',
    'show me',
  ];

  // If it's clearly a question/suggestion request, don't treat as action
  if (questionKeywords.some((keyword) => lowerMessage.includes(keyword))) {
    return false;
  }

  const actionKeywords = [
    'create',
    'add',
    'make',
    'set',
    'adjust',
    'change',
    'delete',
    'remove',
    'mute',
    'unmute',
    'solo',
    'turn on',
    'turn off',
    'enable',
    'disable',
    'build',
    'generate',
    'put',
    'place',
  ];
  return actionKeywords.some((keyword) => lowerMessage.includes(keyword));
}

// Helper function to format song context for prompts
function formatSongContext(spec: SongSpec): string {
  const bpm = spec.bpm ?? spec.aggregate?.bpm ?? 'not set';
  const key = spec.key ?? spec.aggregate?.key ?? 'not set';
  const scale = spec.scale ?? spec.aggregate?.scale ?? '';
  const genre = spec.genre ?? 'not set';
  const mood = Array.isArray(spec.mood)
    ? spec.mood.join(', ')
    : spec.mood ?? 'not set';
  const instruments =
    Array.isArray(spec.instruments) && spec.instruments.length > 0
      ? spec.instruments.join(', ')
      : 'not set';
  const chords =
    spec.chordProgression && Array.isArray(spec.chordProgression.global)
      ? spec.chordProgression.global.join(' → ')
      : 'not set';

  return `
**Song Context (Overall Vision):**
- Genre: ${genre}
- Mood: ${mood}
- BPM: ${bpm}
- Key: ${key}${scale ? ` ${scale}` : ''}
- Instruments: ${instruments}
- Chord Progression: ${chords}
`;
}

/**
 * DAW Assistant Agent with Tool Calling
 *
 * This agent helps users with their DAW workflow by:
 * - Creating and deleting tracks (MIDI and audio)
 * - Adjusting track volumes
 * - Setting BPM
 * - Selecting instruments for MIDI tracks
 * - Providing creative suggestions for what to do next
 */
async function dawAssistantAgent(
  message: string,
  dawState: DAWAssistantRequest['dawState'],
  userContext?: string,
  songContext?: SongSpec,
  retryCount = 0
): Promise<DAWAssistantResponse> {
  try {
    // Build the system prompt with current DAW state
    const isAction = isActionRequest(message);
    const actionEmphasis = isAction
      ? `\n⚠️ CRITICAL: The user is requesting an ACTION. You MUST call the appropriate tool(s) to perform the action. DO NOT just describe what you will do - actually call the tool(s) now!\n`
      : '';

    const songContextText = songContext ? formatSongContext(songContext) : '';
    const systemPrompt = `You are an expert music production assistant integrated into a Digital Audio Workstation (DAW). 
Your primary job is to PERFORM ACTIONS when users request them, not just describe what you would do.

${songContextText}
${actionEmphasis}

**CRITICAL RULES:**
1. When a user requests an action (create, add, make, set, adjust, delete, mute, etc.), you MUST call the appropriate tool(s) immediately
2. DO NOT respond with text like "I'll create a track" - instead, CALL THE TOOL to actually create it
3. Only provide conversational responses when the user is asking questions or seeking advice
4. If you're unsure which tool to use, choose the most appropriate one based on the user's intent

**Current DAW State:**
- BPM: ${dawState.bpm}
- Metronome: ${dawState.metronomeEnabled ? 'ON' : 'OFF'}
- Number of tracks: ${dawState.tracks.length}
${
  dawState.tracks.length > 0
    ? `- Tracks:\n${dawState.tracks
        .map((t) => {
          let trackInfo = `  • ${t.name} (${t.type.toUpperCase()}) - Volume: ${(
            t.volume * 100
          ).toFixed(0)}%, ${t.muted ? 'MUTED' : 'ACTIVE'}${
            t.solo ? ', SOLO' : ''
          }`;
          if (t.type === 'midi') {
            if (t.instrumentMode === 'synth' && t.synthPreset) {
              trackInfo += ` - Synth: ${t.synthPreset}`;
            } else if (t.instrumentMode === 'sampler' && t.samplerAudioUrl) {
              trackInfo += ` - Sampler: ${t.samplerAudioUrl}`;
            } else if (t.instrumentMode === null) {
              trackInfo += ` - ⚠️ NO INSTRUMENT SET`;
            }
          }
          return trackInfo;
        })
        .join('\n')}`
    : '- No tracks yet'
}

${userContext ? `**User Context:** ${userContext}` : ''}

**Available Tools (USE THESE TO PERFORM ACTIONS):**
- create_track_with_instrument: Create a MIDI track with a specific instrument (piano, bass, lead, pad, bells, pluck, hihat, clap). USE THIS when user wants a track with a specific instrument.
- create_empty_track: Create an empty MIDI track (when you want to ask user what instrument they want)
- create_audio_track: Create an audio track for audio files/loops. USE THIS when user wants an audio track or for drums, vocals, recorded instruments.
- suggest_comprehensive_tracks: Generate a comprehensive list of 8-12 varied track suggestions. USE THIS when user asks for track ideas, suggestions, or "what tracks should I create". This creates a full, varied track setup with different synth presets AND audio tracks.
- adjust_bpm: Change the project tempo. USE THIS when user asks to change BPM or tempo.
- adjust_volume: Adjust volume of a specific track. USE THIS when user wants to change track volume.
- delete_track: Delete a track. USE THIS when user wants to remove a track.
- mute_tracks: Mute tracks by pattern. USE THIS when user wants to mute tracks.
- unmute_tracks: Unmute tracks by pattern. USE THIS when user wants to unmute tracks.
- toggle_metronome: Turn metronome on/off. USE THIS when user wants to enable/disable metronome.

**Instrument Mapping:**
- Piano, Keyboard → instrument: "piano"
- Bass, Sub Bass, Kick Drum → instrument: "bass"
- Guitar (lead), Lead → instrument: "lead"
- Pad, Atmosphere → instrument: "pad"
- Bells, Chimes → instrument: "bells"
- Strings, Pluck → instrument: "pluck"
- Hi-hat → instrument: "hihat"
- Clap → instrument: "clap"

**Examples of CORRECT behavior:**
- User: "Create a piano track" → You MUST call create_track_with_instrument with trackName="Piano", instrument="piano"
- User: "Add a bass track" → You MUST call create_track_with_instrument with trackName="Bass", instrument="bass"
- User: "Set BPM to 128" → You MUST call adjust_bpm with bpm=128
- User: "Make a drum track" → You MUST call create_track_with_instrument (use "bass" for kick, "hihat" for hi-hat, "clap" for clap)
- User: "What tracks should I create?" → You MUST call suggest_comprehensive_tracks (creates 8-12 varied tracks)
- User: "Give me track ideas" → You MUST call suggest_comprehensive_tracks (creates 8-12 varied tracks)
- User: "Suggest some tracks" → You MUST call suggest_comprehensive_tracks (creates 8-12 varied tracks)

**Examples of INCORRECT behavior (DO NOT DO THIS):**
- User: "Create a piano track" → ❌ WRONG: "I'll create a piano track for you" (without calling tool)
- User: "Add a bass track" → ❌ WRONG: "Sure, I can add a bass track" (without calling tool)

**Guidelines:**
- When user requests specific instruments, use create_track_with_instrument tool multiple times (once per track)
- When user asks for track ideas, suggestions, or "what tracks should I create", ALWAYS use suggest_comprehensive_tracks tool to generate 8-12 varied tracks
- The suggest_comprehensive_tracks tool should create a MIX of:
  * MIDI tracks with DIFFERENT synth presets (piano, bass, lead, pad, bells, pluck) - NOT all the same!
  * Audio tracks (drums, vocals, recorded instruments)
  * Variety is key - don't suggest 4 similar tracks, suggest 8-12 with different instruments and types
- For house beats, typically use: kick (bass), bass, hihat, clap, and set BPM to 120-128
- Be conversational in your text response AFTER calling tools, but ALWAYS call tools first for action requests
- If user doesn't specify instrument, use create_empty_track and ask them what they want
- When suggesting tracks, always aim for comprehensive variety: different synth types, audio tracks, percussion, melodic elements

**Track Suggestion Examples:**
- User: "What tracks should I create?" → Call suggest_comprehensive_tracks (creates 8-12 varied tracks)
- User: "Give me track ideas" → Call suggest_comprehensive_tracks (creates 8-12 varied tracks)
- User: "Suggest some tracks" → Call suggest_comprehensive_tracks (creates 8-12 varied tracks)
- User: "What should I add?" → Call suggest_comprehensive_tracks (creates 8-12 varied tracks)

Now help the user with their request. Remember: ACTIONS REQUIRE TOOL CALLS!`;

    // Bind tools to the LLM
    const llmWithTools = llm.bindTools(tools);

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(message),
    ];

    console.log('🎵 DAW Assistant with tools analyzing request...');
    const response = await llmWithTools.invoke(messages);

    // Extract tool calls and text response
    const toolCalls = response.tool_calls || [];

    // Handle content properly - it might be a string or array
    let textResponse = '';
    if (typeof response.content === 'string') {
      textResponse = response.content;
    } else if (Array.isArray(response.content)) {
      // If it's an array, join text parts
      textResponse = response.content
        .filter((item) => typeof item === 'string' || item.type === 'text')
        .map((item) => (typeof item === 'string' ? item : item.text || ''))
        .join(' ');
    } else {
      textResponse = String(response.content || '');
    }

    console.log('🎹 Tool calls:', toolCalls.length);
    console.log('💬 Response:', textResponse.substring(0, 200));

    let allActions: DAWAction[] = [];
    let finalMessage = textResponse;
    let suggestions: string[] = [];

    // If we got tool calls, process them (preferred path)
    if (toolCalls.length > 0) {
      console.log('✅ Processing tool calls...');
      for (const toolCall of toolCalls) {
        try {
          const tool = tools.find((t) => t.name === toolCall.name);
          if (tool) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = await tool.func(toolCall.args as any);
            const parsed = JSON.parse(result);
            if (parsed.actions) {
              allActions.push(...parsed.actions);
            }
          }
        } catch (error) {
          console.error('Error executing tool:', toolCall.name, error);
        }
      }

      suggestions = [
        'Create more tracks',
        'Adjust the BPM',
        'Get mixing suggestions',
      ];
    } else if (textResponse.includes('{') && textResponse.includes('actions')) {
      // Fallback: LLM generated JSON response instead of tool calls
      console.log('⚠️ No tool calls, trying to parse JSON fallback...');
      try {
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log('🎹 DAW Assistant Decision:', parsed);

          if (parsed.actions && Array.isArray(parsed.actions)) {
            allActions = parsed.actions;
            finalMessage = parsed.message || textResponse;
            suggestions = parsed.suggestions || [
              'Create more tracks',
              'Adjust the BPM',
              'Get mixing suggestions',
            ];
            console.log(
              '✅ Parsed fallback JSON with',
              allActions.length,
              'actions'
            );
          }
        }
      } catch (parseError) {
        console.error('Failed to parse fallback JSON:', parseError);
        finalMessage =
          "I understood your request but couldn't format the response properly. Please try again.";
      }
    } else {
      // No tool calls and no JSON fallback
      // Check if this was an action request - if so, retry with stronger prompt
      if (isActionRequest(message) && retryCount === 0) {
        console.log(
          '⚠️ Action requested but no tools called. Retrying with stronger prompt...'
        );
        // Retry with a more explicit prompt
        const retryPrompt = `${message}\n\nIMPORTANT: You must call the appropriate tool(s) to perform this action. Do not just describe what you will do - actually call the tool(s) now.`;
        return dawAssistantAgent(
          retryPrompt,
          dawState,
          userContext,
          songContext,
          1
        );
      }

      // Pure conversational response with no actions
      suggestions = [
        'Create more tracks',
        'Adjust the BPM',
        'Get mixing suggestions',
      ];
    }

    console.log('✅ Final action count:', allActions.length);

    return {
      success: true,
      message:
        finalMessage ||
        "I'm here to help with your DAW! You can ask me to create tracks, adjust settings, or get suggestions.",
      actions: allActions,
      suggestions,
    };
  } catch (error) {
    console.error('❌ DAW Assistant agent error:', error);
    return {
      success: false,
      message: 'Sorry, I encountered an error processing your request.',
      actions: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DAWAssistantRequest & {
      songId?: string;
    };
    const { message, dawState, userContext, songId = 'default' } = body;

    // Validate required fields
    if (!message || !dawState) {
      return NextResponse.json(
        { error: 'Missing required fields: message or dawState' },
        { status: 400 }
      );
    }

    // Fetch song context
    const songContext = await loadSongSpec(songId);

    // Run the agent
    const result = await dawAssistantAgent(
      message,
      dawState,
      userContext,
      songContext
    );

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Failed to process DAW assistant request' },
      { status: 500 }
    );
  }
}
