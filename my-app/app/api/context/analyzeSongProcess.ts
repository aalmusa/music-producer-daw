import fs from "fs/promises";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import wav from "node-wav";

import { EssentiaWASM } from "essentia.js/dist/essentia-wasm.es";
import EssentiaExtractor from "essentia.js/dist/essentia.js-extractor.es";

// Save uploaded file and convert it to wav, return final path
export const writeToDrive = async (file: File): Promise<string> => {
  const name = file.name;
  const arrayBuf = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);

  const audioDir = path.join(process.cwd(), "audio");
  await fs.mkdir(audioDir, { recursive: true });

  const rawPath = path.join(audioDir, `${Date.now()}-${name}`);
  await fs.writeFile(rawPath, buffer);

  // ensure a .wav output for downstream analysis
  const outPath = rawPath.endsWith(".wav") ? rawPath : rawPath + ".wav";

  await new Promise<void>((resolve, reject) => {
    ffmpeg(rawPath)
      .toFormat("wav")
      .on("error", (err) => {
        console.error("FFmpeg error:", err.message);
        reject(err);
      })
      .on("end", () => {
        console.log("Conversion finished:", outPath);
        resolve();
      })
      .save(outPath);
  });

  return outPath;
};

/*
Tempo: BeatTrackerDegara → bpm
Key,Scale: KeyExtractor → key + scale
Energy: BeatsLoudness → energy segments
Genre / mood: handled by the LLM for now (no MusiCNN in Node)
*/

type EnergyBand = "low" | "medium" | "high";

type EnergySegment = {
  startTime: number;
  endTime: number;
  band: EnergyBand;
};

const analyzeSong = async (filePath: string) => {
  // Use the wasm module or its default export
  const wasmInitializer: any =
    EssentiaWASM && (EssentiaWASM as any).default
      ? (EssentiaWASM as any).default
      : EssentiaWASM;

  // EssentiaExtractor takes the WASM module
  const essentia = new EssentiaExtractor(wasmInitializer);

  const wavBuffer = await fs.readFile(filePath);
  const decoded = wav.decode(wavBuffer);
  const channelData = decoded.channelData;
  const sampleRate = decoded.sampleRate;

  // Mix to mono
  const monoAudioData =
    channelData.length === 1
      ? channelData[0]
      : Float32Array.from(
          { length: channelData[0].length },
          (_, i) =>
            channelData.reduce((sum, channel) => sum + channel[i], 0) /
            channelData.length
        );

  // Essentia vector
  const signalVec = essentia.arrayToVector(monoAudioData);

  // ---- 1. Beats / BPM ----
  let beats: { ticks: number[] };

  try {
    const beatResult: any = essentia.BeatTrackerDegara(signalVec);
    console.log("BeatTrackerDegara result type:", typeof beatResult);
    console.log(
      "BeatTrackerDegara result keys:",
      beatResult ? Object.keys(beatResult) : "null/undefined"
    );

    if (!beatResult || typeof beatResult !== "object") {
      throw new Error("BeatTrackerDegara returned invalid result");
    }

    if (Array.isArray(beatResult.ticks)) {
      beats = { ticks: beatResult.ticks as number[] };
    } else if (
      beatResult.ticks &&
      typeof beatResult.ticks === "object" &&
      "size" in beatResult.ticks
    ) {
      const ticksArr = essentia.vectorToArray(beatResult.ticks);
      beats = { ticks: Array.from(ticksArr as Float32Array) };
    } else {
      throw new Error(
        `BeatTrackerDegara returned unexpected format: ${JSON.stringify(
          Object.keys(beatResult)
        )}`
      );
    }
  } catch (error: any) {
    console.error("BeatTrackerDegara error:", error);
    console.error("signalVec constructor:", signalVec?.constructor?.name);
    throw new Error(`Failed to analyze beats: ${String(error)}`);
  }

  const tickCount = beats.ticks.length;

  let bpm = 0;
  if (tickCount > 1) {
    const beatSpan = beats.ticks[tickCount - 1] - beats.ticks[0];
    const numIntervals = tickCount - 1;
    bpm = (numIntervals * 60) / beatSpan;
  }

  // ---- 2. Key + scale ----
  let keyAndScale: {
    key: string;
    scale: "major" | "minor" | string;
    strength: number;
  };

  try {
    keyAndScale = essentia.KeyExtractor(signalVec) as {
      key: string;
      scale: "major" | "minor" | string;
      strength: number;
    };
  } catch (err: any) {
    console.error("KeyExtractor error:", err);
    // Fallback so we do not crash the whole request
    keyAndScale = { key: "C", scale: "major", strength: 0 };
  }

  // ---- 3. Loudness → energy segments ----
  let energySegments: EnergySegment[] = [];

  try {
    const beatsLoudness: {
      loudness: Float32Array | number[];
      loudnessBandRatio: Array<number[]>;
    } = essentia.BeatsLoudness(
      signalVec,
      undefined,
      undefined,
      beats.ticks,
      undefined,
      sampleRate
    );

    const loudnessArray = Array.isArray(beatsLoudness.loudness)
      ? (beatsLoudness.loudness as number[])
      : Array.from(beatsLoudness.loudness as Float32Array);

    const minL = Math.min(...loudnessArray);
    const maxL = Math.max(...loudnessArray);
    const range = maxL - minL || 1;

    const norm = loudnessArray.map((v) => (v - minL) / range);

    const bandFor = (x: number): EnergyBand =>
      x < 0.33 ? "low" : x < 0.66 ? "medium" : "high";

    const bands: EnergyBand[] = norm.map(bandFor);

    const groupedRange: EnergySegment[] = [];

    bands.forEach((val, index) => {
      const t = beats.ticks[index];

      if (index === 0) {
        groupedRange.push({
          startTime: t,
          endTime: t,
          band: val,
        });
        return;
      }

      const last = groupedRange[groupedRange.length - 1];

      if (val === last.band) {
        groupedRange[groupedRange.length - 1] = {
          ...last,
          endTime: t,
        };
      } else {
        groupedRange.push({
          startTime: t,
          endTime: t,
          band: val,
        });
      }
    });

    energySegments = groupedRange;
  } catch (err: any) {
    console.error("BeatsLoudness error:", err);
    // Leave energySegments as empty array
    energySegments = [];
  }

  return {
    bpm,
    key: keyAndScale.key,
    scale: keyAndScale.scale,
    strength: keyAndScale.strength,
    energySegments,
  };
};

// High-level MusiCNN genre model is disabled for now.
// We only return low-level analysis and let the LLM infer genre / mood.
export const analyzeFromPath = async (filePath: string) => {
  const analysisResult = await analyzeSong(filePath);

  return {
    genre: null, // placeholder, not used while MusiCNN is off
    analysis: analysisResult,
  };
};

export const doAllFromFile = async (file: File) => {
  const savedPath = await writeToDrive(file);
  return analyzeFromPath(savedPath);
};

export default doAllFromFile;
