// referenceManager.ts

import { analyzeFromPath } from "./analyzeSongProcess";
import {
  loadSongSpec,
  saveSongSpec,
  SongSpec,
  ReferenceAnalysis,
  AggregateAnalysis,
} from "./SongSpecStore";
import path from "path";

let refCounter = 0;

function makeRefId() {
  refCounter += 1;
  return `ref-${refCounter}`;
}

// naive genre/mood extraction from your genreIdentifier output
function extractGenresAndMoods(rawGenreResult: any): {
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

  // key+scale: majority vote
  const keyMap = new Map<string, number>();
  for (const r of references) {
    const combo = `${r.key}_${r.scale}`;
    keyMap.set(combo, (keyMap.get(combo) ?? 0) + r.strength);
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

  // merged genres and moods (dedup, down to ~5 each)
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

  // When references are added, update BPM and key from aggregate analysis
  // This calculates new values from all references and updates the spec
  const updated: SongSpec = {
    ...spec,
    references: newReferences,
    aggregate,
    // Update BPM and key from aggregate when references are added
    // If user later explicitly sets these, those values will override (handled in route.ts)
    bpm: aggregate ? aggregate.bpm : spec.bpm,
    key: aggregate ? aggregate.key : spec.key,
    scale: aggregate ? aggregate.scale : spec.scale,
    updatedAt: new Date().toISOString(),
  };

  await saveSongSpec(updated);
  console.log(
    `✅ Added reference, updated BPM: ${updated.bpm}, Key: ${updated.key} from aggregate analysis`
  );
  return updated;
}
