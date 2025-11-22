// lib/audioEngine.ts
import * as Tone from "tone";

// Shared musical settings
export const LOOP_BARS = 16; // same as the number of measures in Timeline

// Tone.js v15+ style transport
const transport = Tone.getTransport();

let isInitialized = false;
let metronomeLoop: Tone.Loop | null = null;
let metronomeSynth: Tone.MembraneSynth | null = null;

export async function initAudio() {
  if (!isInitialized) {
    await Tone.start(); // unlocks audio on first click

    transport.bpm.value = 120;
    transport.loop = true;
    transport.loopStart = 0;
    transport.loopEnd = `${LOOP_BARS}m`;

    metronomeSynth = new Tone.MembraneSynth().toDestination();

    // Click every quarter note
    metronomeLoop = new Tone.Loop((time: number) => {
      metronomeSynth?.triggerAttackRelease("C2", "8n", time);
    }, "4n");

    metronomeLoop.start(0);
    isInitialized = true;
  }
}

export function startTransport() {
  transport.start();
}

export function stopTransport() {
  transport.stop();
}

export function setBpm(bpm: number) {
  transport.bpm.rampTo(bpm, 0.1);
}

export function getTransportPosition(): string {
  return transport.position.toString();
}

// Progress from 0 to 1 across the loop
export function getLoopProgress(): number {
  const parts = transport.position.toString().split(".");
  const bars = parseInt(parts[0] ?? "0", 10);
  const beats = parseInt(parts[1] ?? "0", 10);
  const six = parseInt(parts[2] ?? "0", 10);

  const beatsPerBar = 4;
  const totalBeats = bars * beatsPerBar + beats + six / 4;
  const loopBeats = LOOP_BARS * beatsPerBar;

  if (!loopBeats) return 0;

  return (totalBeats % loopBeats) / loopBeats;
}
