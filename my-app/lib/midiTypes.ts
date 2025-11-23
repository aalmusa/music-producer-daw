// lib/midiTypes.ts

export interface MidiNote {
  id: string;
  pitch: number; // MIDI note number (0-127)
  start: number; // Start time in bars (0-4 for 4 bars)
  duration: number; // Duration in bars
  velocity: number; // 0-1
}

export interface MidiClipData {
  id: string;
  notes: MidiNote[];
  bars: number; // Number of bars in the clip (4 for 4-bar clips)
  startBar: number; // Which bar in the timeline this clip starts at (0-based)
  color?: string; // Optional color for the clip
}

export interface AudioClipData {
  id: string;
  audioUrl: string;
  bars: number; // Number of bars (4 for loops)
  startBar: number; // Position in timeline (0-based)
  name?: string;
}

export interface Track {
  id: string;
  name: string;
  color: string;
  type: 'audio' | 'midi';
  muted: boolean;
  solo: boolean;
  volume: number;
  // For audio tracks - now supports multiple clips (4-bar loops)
  audioClips?: AudioClipData[];
  // Legacy: single audio URL (deprecated, use audioClips instead)
  audioUrl?: string;
  // For MIDI tracks - now supports multiple clips
  midiClips?: MidiClipData[];
  // For MIDI tracks - instrument mode selection
  instrumentMode?: null | 'synth' | 'sampler'; // null = no mode selected yet
  // For MIDI tracks using synth mode - which preset to use
  synthPreset?: string; // preset name like 'piano', 'bass', etc.
  // For MIDI tracks that use samples instead of synth
  // Maps MIDI note numbers to audio files
  samplerAudioUrl?: string | null; // Audio file to use as sample
}

// MIDI note utilities
export function noteNumberToName(noteNumber: number): string {
  const noteNames = [
    'C',
    'C#',
    'D',
    'D#',
    'E',
    'F',
    'F#',
    'G',
    'G#',
    'A',
    'A#',
    'B',
  ];
  const octave = Math.floor(noteNumber / 12) - 1;
  const noteName = noteNames[noteNumber % 12];
  return `${noteName}${octave}`;
}

export function noteNameToNumber(noteName: string): number {
  const noteNames = [
    'C',
    'C#',
    'D',
    'D#',
    'E',
    'F',
    'F#',
    'G',
    'G#',
    'A',
    'A#',
    'B',
  ];
  const match = noteName.match(/^([A-G]#?)(\d+)$/);
  if (!match) return 60; // Default to C4

  const [, note, octave] = match;
  const noteIndex = noteNames.indexOf(note);
  return noteIndex + (parseInt(octave) + 1) * 12;
}

// Create a default empty MIDI clip
export function createEmptyMidiClip(
  bars: number = 4,
  startBar: number = 0
): MidiClipData {
  return {
    id: crypto.randomUUID(),
    notes: [],
    bars,
    startBar,
  };
}

// Create an audio clip (4-bar loop)
export function createAudioClip(
  audioUrl: string,
  startBar: number = 0,
  name?: string
): AudioClipData {
  return {
    id: crypto.randomUUID(),
    audioUrl,
    bars: 4, // Always 4 bars for loops
    startBar,
    name,
  };
}

// Create a demo MIDI clip with some notes
export function createDemoMidiClip(startBar: number = 0): MidiClipData {
  return {
    id: crypto.randomUUID(),
    bars: 4,
    startBar,
    notes: [
      // C major chord progression
      {
        id: crypto.randomUUID(),
        pitch: 60,
        start: 0,
        duration: 0.25,
        velocity: 0.8,
      }, // C4
      {
        id: crypto.randomUUID(),
        pitch: 64,
        start: 0,
        duration: 0.25,
        velocity: 0.7,
      }, // E4
      {
        id: crypto.randomUUID(),
        pitch: 67,
        start: 0,
        duration: 0.25,
        velocity: 0.6,
      }, // G4

      {
        id: crypto.randomUUID(),
        pitch: 62,
        start: 1,
        duration: 0.25,
        velocity: 0.8,
      }, // D4
      {
        id: crypto.randomUUID(),
        pitch: 65,
        start: 1,
        duration: 0.25,
        velocity: 0.7,
      }, // F4
      {
        id: crypto.randomUUID(),
        pitch: 69,
        start: 1,
        duration: 0.25,
        velocity: 0.6,
      }, // A4

      {
        id: crypto.randomUUID(),
        pitch: 64,
        start: 2,
        duration: 0.25,
        velocity: 0.8,
      }, // E4
      {
        id: crypto.randomUUID(),
        pitch: 67,
        start: 2,
        duration: 0.25,
        velocity: 0.7,
      }, // G4
      {
        id: crypto.randomUUID(),
        pitch: 71,
        start: 2,
        duration: 0.25,
        velocity: 0.6,
      }, // B4

      {
        id: crypto.randomUUID(),
        pitch: 60,
        start: 3,
        duration: 0.25,
        velocity: 0.8,
      }, // C4
      {
        id: crypto.randomUUID(),
        pitch: 64,
        start: 3,
        duration: 0.25,
        velocity: 0.7,
      }, // E4
      {
        id: crypto.randomUUID(),
        pitch: 67,
        start: 3,
        duration: 0.25,
        velocity: 0.6,
      }, // G4
    ],
  };
}
