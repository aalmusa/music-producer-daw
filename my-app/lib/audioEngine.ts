// lib/audioEngine.ts
import * as Tone from 'tone';
import { MidiClipData, MidiNote, noteNumberToName } from './midiTypes';

// Shared musical settings
export const LOOP_BARS = 16; // same as the number of measures in Timeline

// Tone.js v15+ style transport
const transport = Tone.getTransport();

let isInitialized = false;
let metronomeLoop: Tone.Loop | null = null;
let metronomeSynth: Tone.MembraneSynth | null = null;

// MIDI synthesizers and parts
const synthMap = new Map<string, Tone.PolySynth>();
const midiPartMap = new Map<string, Tone.Part>();

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
      metronomeSynth?.triggerAttackRelease('C2', '8n', time);
    }, '4n');

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
  const parts = transport.position.toString().split('.');
  const bars = parseInt(parts[0] ?? '0', 10);
  const beats = parseInt(parts[1] ?? '0', 10);
  const six = parseInt(parts[2] ?? '0', 10);

  const beatsPerBar = 4;
  const totalBeats = bars * beatsPerBar + beats + six / 4;
  const loopBeats = LOOP_BARS * beatsPerBar;

  if (!loopBeats) return 0;

  return (totalBeats % loopBeats) / loopBeats;
}

// ============ MIDI SYNTH FUNCTIONS ============

/**
 * Creates or retrieves a synthesizer for a track
 */
export function getSynthForTrack(trackId: string): Tone.PolySynth {
  let synth = synthMap.get(trackId);

  if (!synth) {
    synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: 'triangle',
      },
      envelope: {
        attack: 0.005,
        decay: 0.1,
        sustain: 0.3,
        release: 1,
      },
    }).toDestination();

    synthMap.set(trackId, synth);
  }

  return synth;
}

/**
 * Updates the MIDI part for a track with new clip data
 */
export function updateMidiPart(trackId: string, clipData: MidiClipData | null) {
  // Remove existing part if it exists
  const existingPart = midiPartMap.get(trackId);
  if (existingPart) {
    existingPart.stop();
    existingPart.dispose();
    midiPartMap.delete(trackId);
  }

  // If no clip data, just return (track is empty)
  if (!clipData || clipData.notes.length === 0) {
    return;
  }

  const synth = getSynthForTrack(trackId);

  // Convert MIDI notes to Tone.js Part events
  const events = clipData.notes.map((note: MidiNote) => ({
    time: `${note.start}m`, // Convert bars to musical time
    note: noteNumberToName(note.pitch),
    duration: `${note.duration}m`,
    velocity: note.velocity,
  }));

  // Create a new Part
  const part = new Tone.Part((time, value) => {
    synth.triggerAttackRelease(
      value.note,
      value.duration,
      time,
      value.velocity
    );
  }, events);

  // Set part to loop within the clip's bar range
  part.loop = true;
  part.loopStart = 0;
  part.loopEnd = `${clipData.bars}m`;

  // Start the part at time 0 in the transport
  part.start(0);

  midiPartMap.set(trackId, part);
}

/**
 * Removes a track's MIDI part and synth
 */
export function removeMidiTrack(trackId: string) {
  const part = midiPartMap.get(trackId);
  if (part) {
    part.stop();
    part.dispose();
    midiPartMap.delete(trackId);
  }

  const synth = synthMap.get(trackId);
  if (synth) {
    synth.dispose();
    synthMap.delete(trackId);
  }
}

/**
 * Mutes or unmutes a track's synth
 */
export function setTrackMute(trackId: string, muted: boolean) {
  const synth = synthMap.get(trackId);
  if (synth) {
    synth.volume.value = muted ? -Infinity : 0;
  }
}

/**
 * Sets the volume for a track's synth
 */
export function setTrackVolume(trackId: string, volume: number) {
  const synth = synthMap.get(trackId);
  if (synth) {
    // Convert 0-1 range to decibels (-24 to 0)
    const db = volume === 0 ? -Infinity : (volume - 1) * 24;
    synth.volume.value = db;
  }
}

/**
 * Preview a single MIDI note (for piano roll interaction)
 */
export function previewNote(
  trackId: string,
  pitch: number,
  duration: number = 0.2,
  velocity: number = 0.8
) {
  const synth = getSynthForTrack(trackId);
  const noteName = noteNumberToName(pitch);
  synth.triggerAttackRelease(noteName, duration, undefined, velocity);
}
