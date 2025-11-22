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
const midiPartMap = new Map<string, Tone.Part[]>(); // Now stores array of parts per track

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
 * Updates all MIDI parts for a track with multiple clips
 */
export function updateMidiParts(
  trackId: string,
  clips: MidiClipData[] | null | undefined
) {
  // Remove existing parts if they exist
  const existingParts = midiPartMap.get(trackId);
  if (existingParts) {
    existingParts.forEach((part) => {
      part.stop();
      part.dispose();
    });
    midiPartMap.delete(trackId);
  }

  // If no clips, just return (track is empty)
  if (!clips || clips.length === 0) {
    return;
  }

  const synth = getSynthForTrack(trackId);
  const parts: Tone.Part[] = [];

  // Create a part for each clip
  clips.forEach((clipData) => {
    if (clipData.notes.length === 0) return;

    // Convert MIDI notes to Tone.js Part events
    // Note times are relative to the clip (0 to clipData.bars)
    const events = clipData.notes.map((note: MidiNote) => ({
      time: `${note.start}m`, // Relative to clip start
      note: noteNumberToName(note.pitch),
      duration: `${note.duration}m`,
      velocity: note.velocity,
    }));

    // Create a Part for this clip
    const part = new Tone.Part((time, value) => {
      synth.triggerAttackRelease(
        value.note,
        value.duration,
        time,
        value.velocity
      );
    }, events);

    // DON'T loop the part - let the transport loop handle it
    part.loop = false;

    // Start this part at the clip's position in the timeline
    // This is the key fix: position in the 16-bar timeline
    part.start(`${clipData.startBar}m`);

    // Stop it after the clip duration
    part.stop(`${clipData.startBar + clipData.bars}m`);

    parts.push(part);
  });

  if (parts.length > 0) {
    midiPartMap.set(trackId, parts);
  }
}

/**
 * Legacy function for single clip - redirects to new function
 * @deprecated Use updateMidiParts instead
 */
export function updateMidiPart(trackId: string, clipData: MidiClipData | null) {
  if (clipData) {
    updateMidiParts(trackId, [clipData]);
  } else {
    updateMidiParts(trackId, null);
  }
}

/**
 * Removes a track's MIDI parts and synth
 */
export function removeMidiTrack(trackId: string) {
  const parts = midiPartMap.get(trackId);
  if (parts) {
    parts.forEach((part) => {
      part.stop();
      part.dispose();
    });
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
