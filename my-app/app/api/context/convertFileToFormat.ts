import fs from "fs/promises";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import wav from "node-wav";
import Essentia from "essentia.js/dist/essentia.js-core.es";
import EssentiaWASM from "essentia.js/dist/essentia-wasm.es";
import { EssentiaExtractor } from "essentia.js/dist/essentia.js-extractor.es";
import * as tf from "@tensorflow/tfjs";
import {
  TensorflowMusiCNN,
  EssentiaTFInputExtractor,
} from "essentia.js/dist/essentia.js-model.es";

const writeToDrive = async (file: File) => {
  const name = file.name;

  const turnToBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(turnToBuffer);

  const saveDir = path.join(process.cwd(), "audio", `${Date.now()}-${name}`);

  await fs.writeFile(saveDir, buffer);

  convertToFormat(saveDir);
};

const convertToFormat = (saveDir: string) => {
  ffmpeg(saveDir)
    .on("error", (err) => {
      console.error("An error occurred: " + err.message);
    })
    .on("end", () => {
      console.log("Conversion finished!");
    })
    .save(saveDir);
};

/*
Tempo: BeatTrackerDegara ok so now I have bpm;
Key,Scale: KeyExtractor ok so now I have key and scale;;
Energy: beatsLoudness ok so now I have energy ish;
mood,genre: model done ;
Instrument & Chord Progression: LLM

*/

const analyzeSong = async (path: string) => {
  const essentia = new Essentia(EssentiaWASM);
  const extractor = new EssentiaExtractor(essentia);

  const wavBuffer = await fs.readFile(path);
  const result = wav.decode(wavBuffer);
  const channelData = result.channelData;

  const monoAudioData =
    channelData.length === 1
      ? channelData[0]
      : Float32Array.from(
          { length: channelData[0].length },
          (_, i) =>
            channelData.reduce((sum, channel) => sum + channel[i], 0) /
            channelData.length
        );

  const signalVec = extractor.arrayToVector(monoAudioData);

  // beats
  const beats: { ticks: number[] } = essentia.BeatTrackerDegara(signalVec);
  const tickCount = beats.ticks.length;

  let bpm = 0;
  if (tickCount > 1) {
    const beatSpan = beats.ticks[tickCount - 1] - beats.ticks[0];
    const numIntervals = tickCount - 1;
    bpm = (numIntervals * 60) / beatSpan;
  }

  // key and scale
  const keyAndScale: {
    key: string;
    scale: "major" | "minor" | string;
    strength: number;
  } = essentia.KeyExtractor(signalVec);

  // loudness and energy flow
  const beatsVec = extractor.arrayToVector(beats.ticks);

  const beatsLoudness: {
    loudness: number[];
    loudnessBandRatio: Array<number[]>;
  } = essentia.BeatsLoudness(beatsVec, signalVec);

  const minL = Math.min(...beatsLoudness.loudness);
  const maxL = Math.max(...beatsLoudness.loudness);
  const range = maxL - minL || 1;

  const norm = beatsLoudness.loudness.map((v) => (v - minL) / range);

  type EnergyBand = "low" | "medium" | "high";

  const bandFor = (x: number): EnergyBand =>
    x < 0.33 ? "low" : x < 0.66 ? "medium" : "high";

  const bands: EnergyBand[] = norm.map(bandFor);

  type EnergySegment = {
    startTime: number;
    endTime: number;
    band: EnergyBand;
  };

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

  return {
    bpm,
    key: keyAndScale.key,
    scale: keyAndScale.scale,
    strength: keyAndScale.strength,
    energySegments: groupedRange,
  };
};

const genreIdentifier = async (definedPath: string) => {
  const wavBuffer = await fs.readFile(definedPath);
  const result = wav.decode(wavBuffer);
  const channelData = result.channelData;

  const monoAudioData =
    channelData.length === 1
      ? channelData[0]
      : Float32Array.from(
          { length: channelData[0].length },
          (_, i) =>
            channelData.reduce((sum, channel) => sum + channel[i], 0) /
            channelData.length
        );

  const extractor = new EssentiaTFInputExtractor(EssentiaWASM, "musicnn");
  const signalVec = extractor.arrayToVector(monoAudioData);
  const features = extractor.computeFrameWise(signalVec);

  const modelPath = path.join(
    process.cwd(),
    "model",
    "msd-musicnn-1",
    "model.json"
  );
  const modelCNN = new TensorflowMusiCNN(tf, modelPath);

  await modelCNN.initialize();

  return await modelCNN.predict(features as any, true);
};

const doAll = async (filePath: string) => {
  try {
    const [genreResult, analysisResult] = await Promise.all([
      genreIdentifier(filePath),
      analyzeSong(filePath),
    ]);

    return {
      genre: genreResult,
      analysis: analysisResult,
    };
  } catch (err) {
    console.error("doAll error:", err);
    throw err;
  }
};
