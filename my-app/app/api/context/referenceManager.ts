import path from "path";
import { analyzeFromPath } from "./analyzeSongProcess";
import {
  loadSongSpec,
  saveSongSpec,
  SongSpec,
  ReferenceAnalysis,
  AggregateAnalysis,
} from "./SongSpecStore";

let refCounter = 0;

function makeRefId() {
  refCounter += 1;
  return `ref-${refCounter}`;
}

// For now, we do not get structured genres or moods from the DSP layer.
// The agent will infer genre and mood from the references and conversation.
// Stub kept so you can plug in a classifier later if you want.
function extractGenresAndMoods(_rawGenreResult: any): {
  genres: string[];
  moods: string[];
} {
  return {
    genres: [],
    moods: [],
  };
}

function computeAggregate(
  references: ReferenceAnalysis[]
): AggregateAnalysis | undefined {
  if (references.length === 0) return undefined;

  // bpm
  const bpms = references.map((r) => r.bpm).filter((b) => b > 0);
  const bpmAvg =
    bpms.length > 0 ? bpms.reduce((a, b) => a + b, 0) / bpms.length : 0;
  const bpmMin = bpms.length ? Math.min(...bpms) : 0;
  const bpmMax = bpms.length ? Math.max(...bpms) : 0;

  // key + scale majority vote, weighted by strength
  const keyMap = new Map<string, number>();
  for (const r of references) {
    const combo = `${r.key}_${r.scale}`;
    keyMap.set(combo, (keyMap.get(combo) ?? 0) + (r.strength ?? 1));
  }

  let bestKeyCombo = "C_major";
  let bestScore = -Infinity;
  for (const [combo, score] of keyMap) {
    if (score > bestScore) {
      bestScore = score;
      bestKeyCombo = combo;
    }
  }
  const [bestKey, bestScale] = bestKeyCombo.split("_");

  // merged genres and moods (dedup)
  const allGenres = Array.from(
    new Set(references.flatMap((r) => r.genres ?? []))
  );
  const allMoods = Array.from(
    new Set(references.flatMap((r) => r.moods ?? []))
  );

  return {
    bpm: Math.round(bpmAvg),
    key: bestKey,
    scale: bestScale,
    bpmRange: [bpmMin, bpmMax],
    keysConsidered: Array.from(keyMap.keys()),
    genres: allGenres.slice(0, 6),
    moods: allMoods.slice(0, 6),
  };
}

export async function addReferenceFromPath(
  songId: string,
  filePath: string
): Promise<SongSpec> {
  const spec = await loadSongSpec(songId);

  const absPath = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);

  // analyzeFromPath now returns { genre: null, analysis }
  const { genre: rawGenreResult, analysis } = await analyzeFromPath(absPath);
  const { genres, moods } = extractGenresAndMoods(rawGenreResult);

  const ref: ReferenceAnalysis = {
    id: makeRefId(),
    sourcePath: absPath,
    bpm: analysis.bpm,
    key: analysis.key,
    scale: analysis.scale,
    strength: analysis.strength,
    energySegments: analysis.energySegments,
    genres,
    moods,
  };

  const newReferences = [...spec.references, ref];
  const aggregate = computeAggregate(newReferences);

  const updated: SongSpec = {
    ...spec,
    references: newReferences,
    aggregate,
    // Let aggregate drive bpm/key/scale when references exist.
    // If the user explicitly overrides these later in chat,
    // route.ts will write those values, and they will be used
    // until the next time a reference analysis is added.
    bpm: aggregate ? aggregate.bpm : spec.bpm,
    key: aggregate ? aggregate.key : spec.key,
    scale: aggregate ? aggregate.scale : spec.scale,
    updatedAt: new Date().toISOString(),
  };

  await saveSongSpec(updated);

  return updated;
}
