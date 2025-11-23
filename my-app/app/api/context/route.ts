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

export const getReferenceSongContext = tool(
  async ({ filePath }: { filePath: string }) => {
    const absPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);

    const result = await analyzeFromPath(absPath);
    return result;
  },
  {
    name: "song_analysis",
    description:
      "Analyze a reference audio file and return combined results: genre prediction and audio analysis (bpm, key, energySegments). Input is the path to the audio file.",
    schema: z.object({
      filePath: z
        .string()
        .describe(
          "Absolute or project relative path to the reference audio file"
        ),
    }),
  }
);

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

    // 1. Load current spec (with references[])
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

    // 4. Construct system prompt
    const systemPrompt = `
You are an AI assistant that helps the user define a SongSpec for a new track.

You already have a current SongSpec (below). Use it as context.
The SongSpec may include:
- multiple reference analyses (under "references")
- an aggregate analysis (under "aggregate") with computed BPM, key, scale from references
- LLM-suggested instruments and chordProgression

IMPORTANT RULES:
1. Genre and Mood: User can explicitly set these. If user mentions genre or mood, include it in the JSON.
2. BPM and Key: 
   - If reference files exist: These are calculated from aggregate analysis (already in spec).
   - If NO reference files but genre/mood exist: The system will automatically generate BPM/key/instruments/chords from genre/mood.
   - If the user EXPLICITLY mentions BPM or key (for example "make it 120 BPM" or "change to C major"), include it in the JSON to override.
3. Instruments and Chord Progression: The system automatically generates these from references (if available) or from genre/mood (if no references).
   - You can mention what was generated in your response, but do not include them in JSON unless user explicitly changes them.

Your job in this message:
- Respond conversationally to the user's prompt.
- If the user changes any fields (genre, mood, bpm, key), state clearly what changed.
- If the user asks about instruments or harmony, refer to the current instruments and chord progression already in the SongSpec.
- If references exist, use the aggregate analysis to inform your suggestions for BPM, key, and scale.

CRITICAL: Always include at the end of your reply a JSON block labeled "SongSpec" with the updated SongSpec you think should be saved. 
- Include genre and mood if user mentions them.
- Include bpm and key ONLY if user explicitly mentions them (do not auto-set from aggregate unless user asks).
- Preserve existing fields (references, aggregate) from the current spec. Only update the fields that changed.

Current SongSpec:
${JSON.stringify(spec, null, 2)}
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

    // Important: do not use NextResponse.error here
    return NextResponse.json(
      {
        error: error?.message ?? "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
