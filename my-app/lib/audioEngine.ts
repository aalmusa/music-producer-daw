// lib/audioEngine.ts
import * as Tone from "tone";

// Tone.js v15+ recommends getTransport() instead of Tone.Transport
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
    transport.loopEnd = "4m";

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
  // Convert to bars.beats.sixteenths
  return transport.position.toString();
}
