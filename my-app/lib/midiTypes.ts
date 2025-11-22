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
}

export interface Track {
  id: string;
  name: string;
  color: string;
  type: 'audio' | 'midi';
  muted: boolean;
  solo: boolean;
  volume: number;
  // For audio tracks
  audioUrl?: string;
  // For MIDI tracks
  midiClip?: MidiClipData;
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
export function createEmptyMidiClip(bars: number = 4): MidiClipData {
  return {
    id: crypto.randomUUID(),
    notes: [],
    bars,
  };
}

// Create a demo MIDI clip with some notes
export function createDemoMidiClip(): MidiClipData {
  return {
    id: crypto.randomUUID(),
    bars: 4,
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
