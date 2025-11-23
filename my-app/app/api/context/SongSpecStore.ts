// app/api/context/songSpecStore.ts
import fs from "fs/promises";
import path from "path";

export type EnergyBand = "low" | "medium" | "high";

export type ReferenceAnalysis = {
  id: string;
  sourcePath: string;
  bpm: number;
  key: string;
  scale: string;
  strength: number;
  energySegments: {
    startTime: number;
    endTime: number;
    band: EnergyBand;
  }[];
  genres?: string[];
  moods?: string[];
};

export type AggregateAnalysis = {
  bpm: number;
  key: string;
  scale: string;
  bpmRange: [number, number];
  keysConsidered: string[];
  genres: string[];
  moods: string[];
};

export type SongSpec = {
  id: string;
  genre?: string;
  mood?: string;
  bpm?: number;
  key?: string;
  scale?: string;
  aggregate?: AggregateAnalysis;
  references: ReferenceAnalysis[];
  instruments?: string[];
  chordProgression?: {
    global?: string[];
    bySection?: Record<string, string[]>;
  };
  createdAt: string;
  updatedAt: string;
};

const DATA_DIR = path.join(process.cwd(), "app", "api", "context", "data");

function getSongSpecPath(id: string): string {
  return path.join(DATA_DIR, `songSpec-${id}.json`);
}

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function loadSongSpec(id = "default"): Promise<SongSpec> {
  await ensureDataDir();
  const songSpecPath = getSongSpecPath(id);

  try {
    const json = await fs.readFile(songSpecPath, "utf8");
    const parsed = JSON.parse(json) as SongSpec;

    // Ensure the loaded spec matches the requested id
    if (parsed.id !== id) {
      return {
        id,
        references: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    return parsed;
  } catch (error) {
    // file does not exist or is invalid → start fresh
    console.log(`No existing spec found for songId "${id}", creating new one`);
    return {
      id,
      references: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

export async function saveSongSpec(spec: SongSpec): Promise<void> {
  await ensureDataDir();
  const songSpecPath = getSongSpecPath(spec.id);
  const updated: SongSpec = {
    ...spec,
    updatedAt: new Date().toISOString(),
  };
  
  try {
    await fs.writeFile(songSpecPath, JSON.stringify(updated, null, 2), "utf8");
    console.log(`Successfully saved song spec for songId "${spec.id}" to ${songSpecPath}`);
  } catch (error) {
    console.error(`Error saving song spec for songId "${spec.id}":`, error);
    throw error;
  }
}

export async function updateSongSpec(
  updates: Partial<SongSpec>,
  id = "default"
): Promise<SongSpec> {
  const current = await loadSongSpec(id);
  const merged: SongSpec = {
    ...current,
    ...updates,
    id,
    createdAt: current.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await saveSongSpec(merged);
  return merged;
}
