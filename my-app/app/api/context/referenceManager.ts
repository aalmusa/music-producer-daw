// referenceManager.ts

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

/**
 * Try to pull structured genres and moods out of whatever
 * the DSP / classifier returns as `rawGenreResult`.
 *
 * Supported shapes (best effort):
 * - { genres: string[], moods: string[] }
 * - { genre: string | string[], mood: string | string[] }
 * - string[] (treated as genres)
 * - [{ label: string, score?: number }, ...] (take top labels as genres)
 */
function extractGenresAndMoods(rawGenreResult: any): {
  genres: string[];
  moods: string[];
} {
  if (!rawGenreResult) {
    return { genres: [], moods: [] };
  }

  let genres: string[] = [];
  let moods: string[] = [];

  // 1) If it's already an object with genres/moods fields
  if (typeof rawGenreResult === "object" && !Array.isArray(rawGenreResult)) {
    const obj = rawGenreResult as any;

    // Explicit arrays
    if (Array.isArray(obj.genres)) {
      genres = obj.genres.filter((g: any) => typeof g === "string");
    }
    if (Array.isArray(obj.moods)) {
      moods = obj.moods.filter((m: any) => typeof m === "string");
    }

    // Single or array genre/mood fields
    if (obj.genre) {
      if (Array.isArray(obj.genre)) {
        genres = genres.concat(
          obj.genre.filter((g: any) => typeof g === "string")
        );
      } else if (typeof obj.genre === "string") {
        genres.push(obj.genre);
      }
    }

    if (obj.mood) {
      if (Array.isArray(obj.mood)) {
        moods = moods.concat(
          obj.mood.filter((m: any) => typeof m === "string")
        );
      } else if (typeof obj.mood === "string") {
        moods.push(obj.mood);
      }
    }
  }

  // 2) If it's an array, decide what to do
  if (Array.isArray(rawGenreResult)) {
    // Array of strings → treat as genres
    if (rawGenreResult.every((x) => typeof x === "string")) {
      genres = genres.concat(rawGenreResult as string[]);
    }

    // Array of label objects → take top labels as genres
    if (
      rawGenreResult.every(
        (x) => x && typeof x === "object" && typeof x.label === "string"
      )
    ) {
      const labelObjs = rawGenreResult as Array<{
        label: string;
        score?: number;
      }>;
      const sorted = [...labelObjs].sort(
        (a, b) => (b.score ?? 0) - (a.score ?? 0)
      );
      const topLabels = sorted.map((x) => x.label);
      genres = genres.concat(topLabels);
    }
  }

  // Dedup and trim length so things do not explode
  const uniqueGenres = Array.from(new Set(genres)).slice(0, 6);
  const uniqueMoods = Array.from(new Set(moods)).slice(0, 6);

  return {
    genres: uniqueGenres,
    moods: uniqueMoods,
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

  // analyzeFromPath should now return { genre: rawGenreResult, analysis }
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
    bpm: aggregate ? aggregate.bpm : spec.bpm,
    key: aggregate ? aggregate.key : spec.key,
    scale: aggregate ? aggregate.scale : spec.scale,
    updatedAt: new Date().toISOString(),
  };

  await saveSongSpec(updated);

  return updated;
}
