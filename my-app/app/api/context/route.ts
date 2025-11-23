// app/api/context/route.ts
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  trimMessages,
} from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { MemorySaver } from '@langchain/langgraph';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { NextResponse } from 'next/server';
import path from 'path';
import * as z from 'zod';

// --- INTERNAL IMPORTS ---
import { analyzeFromPath } from './analyzeSongProcess';
import { generateProductionSpec } from './productionSpec';
import { addReferenceFromPath } from './referenceManager';
import { loadSongSpec, SongSpec, updateSongSpec } from './SongSpecStore';

// Initialize Memory for conversation history
const checkpointer = new MemorySaver();

// --- TOOL DEFINITIONS ---

// Tool 1: Update the SongSpec
const createUpdateSpecTool = (songId: string) =>
  tool(
    async (input) => {
      const updates: Partial<SongSpec> = {};

      if (input.genre) updates.genre = input.genre;

      if (input.mood) {
        updates.mood = Array.isArray(input.mood)
          ? input.mood.join(', ')
          : input.mood;
      }

      if (input.bpm) updates.bpm = input.bpm;
      if (input.key) updates.key = input.key;
      if (input.scale) updates.scale = input.scale;
      if (input.instruments) updates.instruments = input.instruments;
      if (input.chordProgression)
        updates.chordProgression = input.chordProgression;

      await updateSongSpec(updates, songId);
      return `Successfully updated SongSpec for ID ${songId}. New values saved to database.`;
    },
    {
      name: 'update_song_spec',
      description:
        "Call this tool to update the song's genre, mood, bpm, key, scale, instruments, or chords in the database. ONLY call this if the user explicitly asks to change something or if you have inferred a definite genre/mood from context.",
      schema: z.object({
        genre: z.string().optional(),
        mood: z.union([z.string(), z.array(z.string())]).optional(),
        bpm: z.number().optional(),
        key: z.string().optional(),
        scale: z.string().optional(),
        instruments: z.array(z.string()).optional(),
        chordProgression: z
          .object({
            global: z.array(z.string()),
          })
          .optional(),
      }),
    }
  );

// Tool 2: Analyze Audio
const analyzeAudioTool = tool(
  async ({ filePath }) => {
    const absPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);
    try {
      const result = await analyzeFromPath(absPath);
      return JSON.stringify(result);
    } catch (e) {
      return 'Error analyzing audio file. File might not exist.';
    }
  },
  {
    name: 'analyze_audio_reference',
    description: 'Analyze a specific audio file to get BPM, Key, and Energy.',
    schema: z.object({
      filePath: z.string(),
    }),
  }
);

// Tool 3: Confirm Completion (The "Greenlight" Tool)
const createCompleteSpecTool = () =>
  tool(
    async () => {
      return 'SongSpec marked as complete. The UI will now display the proceed button.';
    },
    {
      name: 'confirm_spec_completion',
      description:
        "Call this tool IMMEDIATELY when the SongSpec is fully defined (Genre, Mood, BPM, Key, Instruments). This triggers the 'Next Step' button in the user interface.",
      schema: z.object({}),
    }
  );

// --- HELPER: SYSTEM PROMPT GENERATOR ---
function generateSystemPrompt(spec: SongSpec): string {
  const refCount = spec.references?.length ?? 0;

  // Generate a readable list of existing files so the AI knows they exist
  const referenceList =
    spec.references && spec.references.length > 0
      ? spec.references
          .map((r, index) => {
            const name = r.sourcePath
              ? path.basename(r.sourcePath)
              : 'Unknown File';
            return `  ${index + 1}. "${name}" (Detected: ${r.bpm} BPM, ${
              r.key
            } ${r.scale})`;
          })
          .join('\n')
      : '  - None';

  const bpm = spec.bpm ?? spec.aggregate?.bpm ?? 'unknown';
  const key = spec.key ?? spec.aggregate?.key ?? 'unknown';
  const scale = spec.scale ?? spec.aggregate?.scale ?? 'unknown';

  const genre = spec.genre ?? 'unknown';
  const mood = Array.isArray(spec.mood)
    ? spec.mood.join(', ')
    : spec.mood ?? 'unknown';

  const instruments =
    Array.isArray(spec.instruments) && spec.instruments.length > 0
      ? spec.instruments.join(', ')
      : 'unknown';

  const chords =
    spec.chordProgression && Array.isArray(spec.chordProgression.global)
      ? spec.chordProgression.global.join(' → ')
      : 'unknown';

  const missingFields = [];
  if (genre === 'unknown') missingFields.push('Genre');
  if (mood === 'unknown') missingFields.push('Mood');
  if (bpm === 'unknown') missingFields.push('BPM');
  if (key === 'unknown') missingFields.push('Key');
  if (instruments === 'unknown') missingFields.push('Instruments');

  return `
You are an expert AI Executive Music Producer. Your goal is to guide the user through creating a complete 'SongSpec' so we can start development.

=== CURRENT PROJECT STATE (Source of Truth) ===
- ID: ${spec.id}
- Reference Tracks (${refCount}):
${referenceList}

- Genre: ${genre}
- Mood: ${mood}
- BPM: ${bpm}
- Key: ${key} ${scale}
- Instruments: ${instruments}
- Chords: ${chords}
===============================================

### YOUR CORE DIRECTIVES:

**1. MEMORY & CONTEXT**
   - You have memory of this entire conversation. Refer back to things the user said earlier.
   - If the user provides a reference track, analyze what that implies for the missing fields.

**2. THE "FILL-THE-BLANKS" STRATEGY**
   - Look at the "CURRENT PROJECT STATE" above.
   - If values are "unknown", you MUST proactively guide the user to define them.
   - Pick the most important missing field (Genre/Mood -> BPM/Key -> Instruments) and ask about it.
   - **CRITICAL:** If a Reference Track is listed above (e.g., "beat.wav"), **DO NOT ask the user to upload it again.** It is already in the system. Instead, ask: "I see you uploaded [filename]. Is this the vibe you want for the final track?"

**3. TOOL USAGE & UPDATES**
   - **User Intent:** If the user explicitly answers a question (e.g., "Let's do 140 BPM"), call \`update_song_spec\`.
   - **Inference:** If the user gives a vague instruction, infer the values and call \`update_song_spec\`.
   - **analyzeAudioTool:** If this tool is called, adjust message to tell the user the action has been completed and their file has been read

**4. THE "GREENLIGHT" CONDITION (PROACTIVE)**
   - **Check the status:** Are Genre, Mood, BPM, Key, and Instruments all defined?
   - **If NO:** Continue guiding the user.
   - **If YES (Complete):**
     1. You **MUST** call the \`confirm_spec_completion\` tool IMMEDIATELY. Do not wait for the user to ask.
     2. Then, tell the user: "The SongSpec looks complete! I've enabled the next step button for you."

### TONE & STYLE
- Be professional but creative.
- Act like a collaborative partner.
`;
}

// --- GET ROUTE ---
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const songId = searchParams.get('songId') || 'default';

    const spec = await loadSongSpec(songId);
    return NextResponse.json({ songSpec: spec });
  } catch (error) {
    console.error('Error loading song spec:', error);
    return NextResponse.json(
      { error: 'Failed to load song spec' },
      { status: 500 }
    );
  }
}

// --- MAIN ROUTE ---

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      prompt,
      songId = 'default',
      referenceFilePath,
      referenceFilePaths,
    } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'prompt is required' },
        { status: 400 }
      );
    }

    // 1. PRE-PROCESSING: Load spec & Handle uploads
    let spec = await loadSongSpec(songId);

    const filesToProcess: string[] = [];
    if (referenceFilePaths && Array.isArray(referenceFilePaths)) {
      filesToProcess.push(...referenceFilePaths);
    } else if (referenceFilePath) {
      filesToProcess.push(referenceFilePath);
    }

    if (filesToProcess.length > 0) {
      for (const fp of filesToProcess) {
        if (fp) {
          // Update the local 'spec' variable directly with the result of the addition
          spec = await addReferenceFromPath(songId, fp);
        }
      }

      if (!spec.instruments || !spec.chordProgression) {
        try {
          const production = await generateProductionSpec(spec);
          const updates: Partial<SongSpec> = {
            instruments: production.instruments,
            chordProgression: production.chordProgression,
          };
          if (spec.references.length === 0) {
            if (production.bpm) updates.bpm = production.bpm;
            if (production.key) updates.key = production.key;
            if (production.scale) updates.scale = production.scale;
          }
          await updateSongSpec(updates, songId);
          // Reload local spec to ensure it has the production updates
          spec = await loadSongSpec(songId);
        } catch (err) {
          console.error('Auto-production generation failed:', err);
        }
      }
    }

    // 2. SETUP AGENT
    const model = new ChatGoogleGenerativeAI({
      model: 'gemini-2.5-flash',
      apiKey: process.env.GOOGLE_API_KEY,
      temperature: 0.7,
    });

    const tools = [
      createUpdateSpecTool(songId),
      analyzeAudioTool,
      createCompleteSpecTool(),
    ];

    // --- DYNAMIC STATE MODIFIER (Defined INSIDE handler to capture fresh 'spec') ---
    // This ensures the system prompt uses the 'spec' we just updated in memory,
    // avoiding any database read latency issues.
    const stateModifier = async (state: any) => {
      const systemPrompt = generateSystemPrompt(spec);

      const trimmed = await trimMessages(state.messages, {
        strategy: 'last',
        maxTokens: 384,
        startOn: 'human',
        endOn: ['human', 'tool'],
        tokenCounter: (msgs) => msgs.length,
        includeSystem: false,
      });

      return [new SystemMessage(systemPrompt), ...trimmed];
    };

    // Create the graph with the dynamic modifier
    const agent = createReactAgent({
      llm: model,
      tools,
      checkpointSaver: checkpointer,
      stateModifier: stateModifier,
    });

    // 3. RUN AGENT
    const result = await agent.invoke(
      { messages: [new HumanMessage(prompt)] },
      { configurable: { thread_id: songId } }
    );

    // 4. CHECK FOR COMPLETION SIGNAL
    const messages = result.messages;
    let canProceed = false;

    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (
        msg instanceof AIMessage &&
        msg.tool_calls &&
        msg.tool_calls.length > 0
      ) {
        const hasCompletionCall = msg.tool_calls.some(
          (tc) => tc.name === 'confirm_spec_completion'
        );
        if (hasCompletionCall) {
          canProceed = true;
          break;
        }
      }
    }

    const lastMessage = messages[messages.length - 1];

    // Reload spec one last time to return the absolute latest DB state to frontend
    const finalSpec = await loadSongSpec(songId);

    return NextResponse.json(
      {
        reply: lastMessage.content,
        songSpec: finalSpec,
        canProceed,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error in POST /api/context:', error);
    return NextResponse.json(
      { error: error?.message ?? 'Internal Server Error' },
      { status: 500 }
    );
  }
}
