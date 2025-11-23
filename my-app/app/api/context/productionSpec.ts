// productionSpec.ts
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import type { SongSpec } from "./SongSpecStore";

// Common instruments available for music production
const INSTRUMENT_BANK = [
  "Acoustic Guitar", "Electric Guitar", "Bass Guitar", "Piano", "Electric Piano",
  "Synthesizer", "Strings", "Violin", "Cello", "Drums", "Drum Machine", "Percussion",
  "Trumpet", "Saxophone", "Flute", "Vocals", "Vocal Samples", "Organ", "Harp",
  "Ukulele", "Banjo", "Mandolin", "Harmonica", "Brass Section", "String Section"
];

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  apiKey: process.env.GOOGLE_API_KEY,
  temperature: 0.7,
});

export async function generateProductionSpec(spec: SongSpec): Promise<{
  instruments: string[];
  chordProgression: {
    global: string[];
    bySection?: Record<string, string[]>;
  };
  bpm?: number;
  key?: string;
  scale?: string;
}> {
  const hasReferences = spec.references.length > 0;
  const hasAggregate = spec.aggregate !== undefined;
  const hasGenreOrMood = spec.genre || spec.mood;

  let prompt = `
You are a music producer.

You receive a SongSpec with:`;

  if (hasReferences) {
    prompt += `
- an array of reference analyses (each has bpm, key, scale, energy bands, genres and moods)
- an aggregate analysis summarising all references: consensus bpm, key, scale, merged genres and moods`;
  } else {
    prompt += `
- genre: ${spec.genre || "not specified"}
- mood: ${spec.mood || "not specified"}
- NO reference tracks (you must infer everything from genre and mood)`;
  }

  prompt += `

You also receive an instrument bank.

Your tasks:`;

  if (hasReferences) {
    prompt += `
1. Look at ALL references together and the aggregate analysis.
   - Infer a coherent vibe that fits across the references.
   - Use the aggregate BPM, key, and scale as your starting point.`;
  } else {
    prompt += `
1. Infer appropriate musical characteristics from the genre and mood:
   - Suggest a suitable BPM (beats per minute) for this genre/mood combination
   - Suggest an appropriate key and scale (major or minor) that fits the mood
   - For Romance genre with dreamy/passionate mood, consider slower tempos (60-90 BPM) and warm keys (C major, D major, A major, or related minor keys)`;
  }

  prompt += `
2. Choose 4 to 6 instruments from the bank, suitable for the genre and mood.
   - Always include at least one drums choice and one bass choice.
   - Choose instruments that match the genre (e.g., Romance might use Piano, Strings, Acoustic Guitar)
   - You can use instrument names from the bank or suggest similar ones if needed.

3. Propose a chord progression in the suggested key (or a very closely related key).
   - Provide:
     - a "global" 4 or 8 chord loop that can work for the main sections
     - optional per-section variations (intro, verse, chorus, bridge) if useful.
   - For Romance/dreamy moods, consider extended chords (7ths, 9ths, sus chords) and smooth progressions.

Return ONLY JSON with this shape:

{
  "bpm": 75,
  "key": "C",
  "scale": "major",
  "instruments": [ "instrument name", "..." ],
  "chordProgression": {
    "global": [ "Cmaj7", "Am7", "Fmaj7", "G7" ],
    "bySection": {
      "intro": [ "..." ],
      "verse": [ "..." ],
      "chorus": [ "..." ]
    }
  }
}

SongSpec:
${JSON.stringify(spec, null, 2)}

InstrumentBank:
${JSON.stringify(INSTRUMENT_BANK, null, 2)}
`;

  const res = await model.invoke(prompt);
  const text =
    typeof res.content === "string"
      ? res.content
      : Array.isArray(res.content)
      ? res.content.map((c: any) => c.text ?? "").join("")
      : JSON.stringify(res.content);

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  const jsonString =
    firstBrace !== -1 && lastBrace !== -1
      ? text.slice(firstBrace, lastBrace + 1)
      : text;

  const parsed = JSON.parse(jsonString);

  return {
    bpm: parsed.bpm,
    key: parsed.key,
    scale: parsed.scale,
    instruments: parsed.instruments ?? [],
    chordProgression: parsed.chordProgression ?? { global: [] },
  };
}
