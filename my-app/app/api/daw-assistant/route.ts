import type {
  DAWAssistantRequest,
  DAWAssistantResponse,
  DAWAction,
} from '@/types/music-production';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { NextRequest, NextResponse } from 'next/server';

// Initialize the LLM
const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-2.5-flash',
  apiKey: process.env.GOOGLE_API_KEY,
  temperature: 0.7,
});

/**
 * DAW Assistant Agent
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
  userContext?: string
): Promise<DAWAssistantResponse> {
  try {
    // Build the system prompt with current DAW state
    const systemPrompt = `You are an expert music production assistant integrated into a Digital Audio Workstation (DAW). Your role is to help users create and organize their music projects.

**Current DAW State:**
- BPM: ${dawState.bpm}
- Metronome: ${dawState.metronomeEnabled ? 'ON' : 'OFF'}
- Number of tracks: ${dawState.tracks.length}
${
  dawState.tracks.length > 0
    ? `- Tracks:\n${dawState.tracks
        .map(
          (t) =>
            `  • ${t.name} (${t.type.toUpperCase()}) - Volume: ${(t.volume * 100).toFixed(0)}%, ${t.muted ? 'MUTED' : 'ACTIVE'}${t.solo ? ', SOLO' : ''}${t.type === 'midi' && t.samplerAudioUrl ? ` - Instrument: ${t.samplerAudioUrl}` : ''}`
        )
        .join('\n')}`
    : '- No tracks yet'
}

${userContext ? `**User Context:** ${userContext}` : ''}

**Your Capabilities:**
1. **Create Tracks**: Add new MIDI or audio tracks
2. **Delete Tracks**: Remove existing tracks by name or ID
3. **Adjust Volume**: Set volume levels for specific tracks (0-1 range)
4. **Adjust BPM**: Change the project tempo
5. **Select Instruments**: For MIDI tracks, select sampler instruments (available: /audio/clap.wav, /audio/hihat.wav)
6. **Mute/Unmute Tracks**: Mute or unmute specific tracks or multiple tracks matching a pattern
7. **Solo/Unsolo Tracks**: Solo or unsolo specific tracks or multiple tracks matching a pattern
8. **Toggle Metronome**: Turn the metronome on or off
9. **Provide Guidance**: Suggest next steps and creative ideas

**Available Instruments for MIDI tracks:**
- /audio/clap.wav - Clap sound
- /audio/hihat.wav - Hi-hat sound
- (Or leave as synth by not specifying an instrument)

**Action Types:**
- create_track: Create a new track
- delete_track: Delete an existing track
- adjust_volume: Change track volume
- adjust_bpm: Change project BPM
- select_instrument: Set a sampler instrument for a MIDI track
- mute_tracks: Mute one or more tracks (can use trackPattern to match multiple, e.g., "drum" matches "Drums", "Hi-hat", "Kick")
- unmute_tracks: Unmute one or more tracks (can use trackPattern to match multiple)
- solo_tracks: Solo one or more tracks (can use trackPattern to match multiple)
- unsolo_tracks: Unsolo one or more tracks (can use trackPattern to match multiple)
- toggle_metronome: Turn metronome on or off
- none: Just provide guidance/conversation

**Important Guidelines:**
- Be conversational and helpful
- When creating tracks, suggest appropriate names based on the instrument or purpose
- When adjusting volumes, consider mixing best practices
- When muting/soloing, you can use trackPattern to match multiple tracks (e.g., "drum" matches "Drums", "Hi-hat", "Kick")
- For pattern matching: case-insensitive partial matches work (e.g., "bass" matches "Bass", "Sub Bass", "Bass Synth")
- Provide 2-3 creative suggestions for next steps
- If the user's request is unclear, ask for clarification
- You can perform multiple actions at once (e.g., mute drums AND unmute bass)

**Response Format (JSON):**
{
  "message": "Your conversational response to the user",
  "actions": [
    {
      "type": "action_type",
      "reasoning": "Why you're taking this action",
      // Include relevant fields based on action type:
      // For create_track: trackType, trackName
      // For delete_track: trackId or trackName
      // For adjust_volume: trackId or trackName, volume
      // For adjust_bpm: bpm
      // For select_instrument: trackId or trackName, instrumentPath
      // For mute_tracks: trackId or trackName or trackPattern (for multiple)
      // For unmute_tracks: trackId or trackName or trackPattern (for multiple)
      // For solo_tracks: trackId or trackName or trackPattern (for multiple)
      // For unsolo_tracks: trackId or trackName or trackPattern (for multiple)
      // For toggle_metronome: metronomeEnabled (true/false)
    }
  ],
  "suggestions": [
    "Suggestion 1 for what to do next",
    "Suggestion 2 for what to do next",
    "Suggestion 3 for what to do next"
  ]
}

**Examples:**

User: "Add a drum track"
Response:
{
  "message": "I'll create a MIDI drum track for you. I'm setting it up with a hi-hat sample to get you started.",
  "actions": [
    {
      "type": "create_track",
      "trackType": "midi",
      "trackName": "Drums",
      "reasoning": "Creating a MIDI track for drums as requested by the user"
    },
    {
      "type": "select_instrument",
      "trackName": "Drums",
      "instrumentPath": "/audio/hihat.wav",
      "reasoning": "Setting up hi-hat sample for the drum track"
    }
  ],
  "suggestions": [
    "Add a bass line to create a rhythm section",
    "Create a melody track with a synth",
    "Adjust the BPM to match your desired tempo"
  ]
}

User: "Make the bass louder"
Response:
{
  "message": "I've increased the bass track volume to 90%. That should give it more presence in the mix.",
  "actions": [
    {
      "type": "adjust_volume",
      "trackName": "Bass",
      "volume": 0.9,
      "reasoning": "Increasing bass volume as requested for better presence in the mix"
    }
  ],
  "suggestions": [
    "Consider adding compression to control the bass dynamics",
    "Try adding a sub-bass layer for more depth",
    "Adjust other track volumes to maintain a balanced mix"
  ]
}

User: "Mute all the drum tracks"
Response:
{
  "message": "I've muted all drum-related tracks. This includes Drums, Hi-hat, and Kick tracks.",
  "actions": [
    {
      "type": "mute_tracks",
      "trackPattern": "drum",
      "reasoning": "Muting all tracks that contain 'drum' in their name to isolate other elements"
    }
  ],
  "suggestions": [
    "Listen to how the bass and melody sound without drums",
    "Unmute drums when you're ready to add them back",
    "Try soloing just the bass to hear it clearly"
  ]
}

User: "Solo the bass"
Response:
{
  "message": "I've soloed the bass track so you can hear it in isolation.",
  "actions": [
    {
      "type": "solo_tracks",
      "trackName": "Bass",
      "reasoning": "Soloing bass track to allow focused listening and editing"
    }
  ],
  "suggestions": [
    "Check if the bass needs EQ adjustments",
    "Listen for any timing issues",
    "Unsolo when done to hear it in the mix"
  ]
}

User: "Turn on the metronome"
Response:
{
  "message": "I've enabled the metronome. You'll hear it clicking on each beat when you play.",
  "actions": [
    {
      "type": "toggle_metronome",
      "metronomeEnabled": true,
      "reasoning": "Enabling metronome to help with timing and tempo reference"
    }
  ],
  "suggestions": [
    "Use the metronome to stay in time while recording",
    "Turn it off once you're comfortable with the tempo",
    "Adjust BPM if the tempo doesn't feel right"
  ]
}

Now respond to the user's message below.`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(message),
    ];

    console.log('🎵 DAW Assistant analyzing request...');
    const agentResponse = await llm.invoke(messages);
    const agentContent = String(agentResponse.content);

    // Parse the agent's JSON response
    let agentDecision: {
      message: string;
      actions: DAWAction[];
      suggestions?: string[];
    };

    try {
      // Try to extract JSON from the response
      const jsonMatch = agentContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        agentDecision = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse agent response:', agentContent);
      console.error('Parse error:', parseError);
      
      // Fallback: provide a helpful message
      return {
        success: true,
        message: agentContent || "I'm here to help! You can ask me to create tracks, adjust volumes, set BPM, or get suggestions for your production.",
        actions: [
          {
            type: 'none',
            reasoning: 'Unable to parse structured response, providing conversational guidance',
          },
        ],
        suggestions: [
          'Try asking me to "create a new MIDI track"',
          'Ask me to "adjust the BPM to 128"',
          'Request "suggestions for what to add next"',
        ],
      };
    }

    console.log('🎹 DAW Assistant Decision:', agentDecision);

    // Validate actions
    const validActions = agentDecision.actions.filter((action) => {
      if (!action.type) return false;
      return true;
    });

    return {
      success: true,
      message: agentDecision.message,
      actions: validActions,
      suggestions: agentDecision.suggestions,
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
    const body = (await request.json()) as DAWAssistantRequest;
    const { message, dawState, userContext } = body;

    // Validate required fields
    if (!message || !dawState) {
      return NextResponse.json(
        { error: 'Missing required fields: message or dawState' },
        { status: 400 }
      );
    }

    // Run the agent
    const result = await dawAssistantAgent(message, dawState, userContext);

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Failed to process DAW assistant request' },
      { status: 500 }
    );
  }
}

