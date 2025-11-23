// app/api/context/route.ts
import { NextResponse } from "next/server";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import path from "path";
import * as z from "zod";

import { analyzeFromPath } from "./analyzeSongProcess";
import { loadSongSpec, updateSongSpec, SongSpec } from "./SongSpecStore";
import { generateProductionSpec } from "./productionSpec";
import { addReferenceFromPath } from "./referenceManager";
import { tool } from "langchain";

const conversationModel = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  apiKey: process.env.GOOGLE_API_KEY,
  temperature: 0.8,
});

// Optional tool, available to agents if you wire tools up later
export const getReferenceSongContext = tool(
  async ({ filePath }: { filePath: string }) => {
    const absPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);

    // Only returns audio analysis (bpm, key, energy segments)
    const result = await analyzeFromPath(absPath);
    return result;
  },
  {
    name: "song_analysis",
    description:
      "Analyze a reference audio file and return audio analysis (bpm, key, energySegments). Genre is left null and should be inferred by the assistant. Input is the path to the audio file.",
    schema: z.object({
      filePath: z
        .string()
        .describe(
          "Absolute or project relative path to the reference audio file"
        ),
    }),
  }
);

// Helper to give the model a readable summary of the current spec
function summarizeSpecForPrompt(spec: SongSpec): string {
  const refCount = spec.references?.length ?? 0;
  const bpm = spec.bpm ?? spec.aggregate?.bpm ?? "unknown";
  const key = spec.key ?? spec.aggregate?.key ?? "unknown";
  const scale = spec.scale ?? spec.aggregate?.scale ?? "unknown";

  const genre = spec.genre ?? "none yet";

  const mood = Array.isArray(spec.mood)
    ? spec.mood.join(", ")
    : spec.mood ?? "none yet";

  const instruments =
    Array.isArray(spec.instruments) && spec.instruments.length > 0
      ? spec.instruments.join(", ")
      : "none yet";

  const chords =
    spec.chordProgression && Array.isArray(spec.chordProgression.global)
      ? spec.chordProgression.global.join(" → ")
      : "none yet";

  return `
Current song summary:
- ID: ${spec.id}
- References: ${refCount}
- Current BPM: ${bpm}
- Current Key: ${key} ${scale}
- Current Genre: ${genre}
- Current Mood: ${mood}
- Current Instruments: ${instruments}
- Current Global Chord Progression: ${chords}
`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      prompt,
      songId = "default",
      referenceFilePath,
      referenceFilePaths,
    } = body as {
      prompt: string;
      songId?: string;
      referenceFilePath?: string;
      referenceFilePaths?: string[];
    };

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 }
      );
    }

    // 1. Load current spec
    let spec = await loadSongSpec(songId);

    // 2. If new reference file paths are provided, add them as references
    const filePathsToProcess: string[] = [];
    if (referenceFilePaths && Array.isArray(referenceFilePaths)) {
      filePathsToProcess.push(...referenceFilePaths);
    } else if (referenceFilePath) {
      filePathsToProcess.push(referenceFilePath);
    }

    for (const filePath of filePathsToProcess) {
      if (filePath) {
        spec = await addReferenceFromPath(songId, filePath);
      }
    }

    // 3. Generate production spec if needed
    const shouldGenerateProduction =
      (!spec.instruments || !spec.chordProgression) &&
      (spec.references.length > 0 || spec.genre || spec.mood);

    if (shouldGenerateProduction) {
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

      spec = await updateSongSpec(updates, songId);
      console.log("Generated production spec:", updates);
    }

    // 4. Construct system prompt with strong grounding rules
    const systemPrompt = `
You are an AI assistant that helps the user define a SongSpec for a new track.

You already have a current SongSpec. Use it as the single source of truth for current values.

${summarizeSpecForPrompt(spec)}

The SongSpec may include:
- multiple reference analyses (under "references")
- an aggregate analysis (under "aggregate") with computed BPM, key, scale from references
- LLM suggested instruments and chordProgression

IMPORTANT RULES (GROUNDING):

1. Ground truth from SongSpec:
   - Whenever you mention the current BPM, key, scale, instruments, chord progression,
     references, or aggregate values, you MUST read them from the Current SongSpec JSON below.
   - If a field is missing in the SongSpec, you must say that it is missing. Do not guess numeric values,
     instruments, or chords.

2. Genre and Mood:
   - You may infer genre and mood from the user's description and from the reference analyses.
   - If you infer or change genre or mood, include them in the JSON and clearly mention what you changed
     in your natural language reply.

3. BPM and Key:
   - The current BPM, key, and scale are whatever is stored in the SongSpec.
   - If the user asks questions such as "What is the BPM?" or "What key is this in?",
     you must answer by reading the existing values from the SongSpec. Do not design a new value.
   - You are allowed to change BPM or key only if the user explicitly asks you to set or change them,
     for example "set the BPM to 120", "change it to C major", or "make it faster at around 130 BPM".
   - If you change BPM or key because the user asked you to, include the new values in the JSON and clearly
     state the change.

4. Instruments and Chord Progression:
   - The current instruments and chord progression are whatever is stored in the SongSpec.
   - If the user asks "what instruments are we using?" or "what is the current chord progression?",
     you MUST answer by reading the values from the SongSpec. Do not invent new lists unless the user
     explicitly asks you to change them.
   - You are allowed to change instruments or chordProgression only if the user explicitly asks you to modify them,
     for example "add strings", "replace the piano with a synth", or "change the chords to ii–V–I".
   - If you change instruments or chordProgression because the user asked you to, include the updated values in the JSON
     and clearly state the change in your reply.

FORMATTING RULES (VERY IMPORTANT):

- Your natural language reply should be concise and should NOT dump the full SongSpec JSON.
- Do NOT include any \`references\` or \`aggregate\` fields in the JSON you output.
- At the very end of your reply, output a small JSON block labelled \`SongSpec\` with ONLY the fields that changed
  or that you are explicitly setting. Allowed keys in this JSON are:
  \`genre\`, \`mood\`, \`bpm\`, \`key\`, \`scale\`, \`instruments\`, \`chordProgression\`.
- The JSON block MUST be valid JSON and must not contain comments or trailing commas.


`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(prompt),
    ];

    const res = await conversationModel.invoke(messages);

    const replyText =
      typeof res.content === "string"
        ? res.content
        : Array.isArray(res.content)
        ? res.content.map((c: any) => c.text ?? "").join("")
        : String(res.content);

    // 5. Try to parse SongSpec JSON from reply
    try {
      const firstBrace = replyText.indexOf("{");
      const lastBrace = replyText.lastIndexOf("}");

      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonString = replyText.slice(firstBrace, lastBrace + 1);
        const parsedSpec = JSON.parse(jsonString) as Partial<SongSpec>;

        const updates: Partial<SongSpec> = {};

        // Genre and mood can be inferred or changed by the model
        if (
          parsedSpec.genre !== undefined &&
          parsedSpec.genre !== null &&
          parsedSpec.genre !== ""
        ) {
          updates.genre = parsedSpec.genre;
        }
        if (
          parsedSpec.mood !== undefined &&
          parsedSpec.mood !== null &&
          parsedSpec.mood !== ""
        ) {
          updates.mood = parsedSpec.mood;
        }

        // BPM and key: only updated when model explicitly sets them
        if (
          parsedSpec.bpm !== undefined &&
          parsedSpec.bpm !== null &&
          typeof parsedSpec.bpm === "number" &&
          parsedSpec.bpm > 0
        ) {
          updates.bpm = parsedSpec.bpm;
        }
        if (
          parsedSpec.key !== undefined &&
          parsedSpec.key !== null &&
          parsedSpec.key !== ""
        ) {
          updates.key = parsedSpec.key;
        }
        if (
          parsedSpec.scale !== undefined &&
          parsedSpec.scale !== null &&
          parsedSpec.scale !== ""
        ) {
          updates.scale = parsedSpec.scale;
        }

        // Instruments and chord progression: only when explicitly changed
        if (parsedSpec.instruments !== undefined) {
          updates.instruments = parsedSpec.instruments;
        }
        if (parsedSpec.chordProgression !== undefined) {
          updates.chordProgression = parsedSpec.chordProgression;
        }

        if (Object.keys(updates).length > 0) {
          spec = await updateSongSpec(updates, songId);
          console.log("Updated spec from LLM response:", updates);
        } else {
          console.log(
            "LLM response contained SongSpec JSON but no valid updates to save"
          );
        }
      } else {
        console.log(
          "No JSON block found in LLM response. This is fine if it is only conversational"
        );
      }
    } catch (parseError) {
      console.log(
        "Could not parse SongSpec from LLM response. This is fine.",
        parseError
      );
    }

    // 6. Normal successful response
    return NextResponse.json(
      {
        reply: replyText,
        songSpec: spec,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error in POST /api/context:", error);

    return NextResponse.json(
      {
        error: error?.message ?? "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
