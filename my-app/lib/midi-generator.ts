import type { Chord, ChordProgression, MidiPattern, Note } from '@/types/midi';

// MIDI note mappings
const NOTE_MAP: { [key: string]: number } = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

// Chord quality intervals (semitones from root)
const CHORD_INTERVALS: { [key: string]: number[] } = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
  augmented: [0, 4, 8],
  major7: [0, 4, 7, 11],
  minor7: [0, 3, 7, 10],
  dominant7: [0, 4, 7, 10],
  minor7b5: [0, 3, 6, 10],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  add9: [0, 4, 7, 14],
  '6': [0, 4, 7, 9],
  minor6: [0, 3, 7, 9],
};

/**
 * Parse chord name into root and quality
 */
export function parseChord(chordName: string): {
  root: string;
  quality: string;
} {
  const match = chordName.match(/^([A-G][#b]?)(.*)/);
  if (!match) {
    throw new Error(`Invalid chord name: ${chordName}`);
  }

  const [, root, qualityStrRaw] = match;
  const qualityStr = qualityStrRaw.toLowerCase();

  // Map common chord quality notations
  const qualityMap: { [key: string]: string } = {
    '': 'major',
    m: 'minor',
    min: 'minor',
    maj: 'major',
    dim: 'diminished',
    aug: 'augmented',
    maj7: 'major7',
    m7: 'minor7',
    min7: 'minor7',
    '7': 'dominant7',
    m7b5: 'minor7b5',
    sus2: 'sus2',
    sus4: 'sus4',
    add9: 'add9',
    '6': '6',
    m6: 'minor6',
  };

  const quality = qualityMap[qualityStr] || 'major';
  return { root, quality };
}

/**
 * Convert chord to MIDI notes
 */
export function chordToMidiNotes(
  chordName: string,
  octave: number = 4
): number[] {
  const { root, quality } = parseChord(chordName);
  const rootNote = NOTE_MAP[root];
  if (rootNote === undefined) {
    throw new Error(`Invalid root note: ${root}`);
  }

  const intervals = CHORD_INTERVALS[quality] || CHORD_INTERVALS.major;
  const baseNote = rootNote + octave * 12;

  return intervals.map((interval) => baseNote + interval);
}

/**
 * Create a chord object from name
 */
export function createChord(
  chordName: string,
  duration: number = 4,
  octave: number = 4
): Chord {
  const { root, quality } = parseChord(chordName);
  const notes = chordToMidiNotes(chordName, octave);

  return {
    name: chordName,
    root,
    quality,
    notes,
    duration,
  };
}

/**
 * Parse chord progression string (e.g., "Cmaj7 Am7 Dm7 G7")
 */
export function parseChordProgression(
  progressionString: string,
  key: string,
  tempo: number,
  timeSignature: string = '4/4'
): ChordProgression {
  const chordNames = progressionString.trim().split(/\s+/);
  const [beatsPerBar] = timeSignature.split('/').map(Number);

  const chords = chordNames.map((name) => createChord(name, beatsPerBar, 4));

  return {
    chords,
    key,
    timeSignature,
    tempo,
  };
}

/**
 * Generate bass line from chord progression
 */
export function generateBassLine(progression: ChordProgression): MidiPattern {
  const notes: Note[] = [];
  let currentTime = 0;

  progression.chords.forEach((chord) => {
    // Use the root note of the chord, octave lower
    const bassNote = chord.notes[0] - 12;

    // Simple pattern: quarter notes
    const quarterNoteDuration = 1;
    const numNotes = Math.floor(chord.duration);

    for (let i = 0; i < numNotes; i++) {
      notes.push({
        pitch: bassNote,
        velocity: i === 0 ? 100 : 80, // Emphasize first note
        startTime: currentTime + i * quarterNoteDuration,
        duration: quarterNoteDuration * 0.9, // Slight gap between notes
        channel: 0,
      });
    }

    currentTime += chord.duration;
  });

  return {
    name: 'Bass Line',
    notes,
    tempo: progression.tempo,
    timeSignature: progression.timeSignature,
    lengthInBars: progression.chords.length,
    key: progression.key,
  };
}

/**
 * Generate arpeggio pattern from chord progression
 */
export function generateArpeggio(
  progression: ChordProgression,
  pattern: 'up' | 'down' | 'updown' = 'up'
): MidiPattern {
  const notes: Note[] = [];
  let currentTime = 0;

  progression.chords.forEach((chord) => {
    let chordNotes = [...chord.notes];

    // Create arpeggio pattern
    if (pattern === 'down') {
      chordNotes.reverse();
    } else if (pattern === 'updown') {
      chordNotes = [...chordNotes, ...chordNotes.slice(0, -1).reverse()];
    }

    const noteDuration = chord.duration / chordNotes.length;

    chordNotes.forEach((pitch, index) => {
      notes.push({
        pitch,
        velocity: 80 + Math.random() * 20, // Add slight velocity variation
        startTime: currentTime + index * noteDuration,
        duration: noteDuration * 0.9,
        channel: 0,
      });
    });

    currentTime += chord.duration;
  });

  return {
    name: `Arpeggio (${pattern})`,
    notes,
    tempo: progression.tempo,
    timeSignature: progression.timeSignature,
    lengthInBars: progression.chords.length,
    key: progression.key,
  };
}

/**
 * Generate simple melody from chord progression
 */
export function generateMelody(progression: ChordProgression): MidiPattern {
  const notes: Note[] = [];
  let currentTime = 0;

  progression.chords.forEach((chord) => {
    // Pick notes from the chord with some rhythm variation
    const chordNotes = [...chord.notes, chord.notes[0] + 12]; // Add octave higher root
    const numMelodyNotes = Math.floor(Math.random() * 3) + 2; // 2-4 notes per chord

    const rhythmPatterns = [
      [1, 1, 1, 1], // Quarter notes
      [2, 1, 1], // Half, quarter, quarter
      [1, 2, 1], // Quarter, half, quarter
      [0.5, 0.5, 1, 1, 1], // Eighth notes pattern
    ];

    const rhythm =
      rhythmPatterns[Math.floor(Math.random() * rhythmPatterns.length)];
    let timeInChord = 0;

    rhythm.forEach((duration, i) => {
      if (i < numMelodyNotes && timeInChord < chord.duration) {
        const pitch = chordNotes[Math.floor(Math.random() * chordNotes.length)];
        notes.push({
          pitch,
          velocity: 85 + Math.random() * 15,
          startTime: currentTime + timeInChord,
          duration: Math.min(duration, chord.duration - timeInChord) * 0.9,
          channel: 0,
        });
        timeInChord += duration;
      }
    });

    currentTime += chord.duration;
  });

  return {
    name: 'Melody',
    notes,
    tempo: progression.tempo,
    timeSignature: progression.timeSignature,
    lengthInBars: progression.chords.length,
    key: progression.key,
  };
}

/**
 * Generate rhythm pattern (chords as rhythm)
 */
export function generateRhythmPattern(
  progression: ChordProgression
): MidiPattern {
  const notes: Note[] = [];
  let currentTime = 0;

  const rhythmPatterns = [
    [1, 1, 1, 1], // Four quarter notes
    [2, 2], // Two half notes
    [1, 0.5, 0.5, 1, 1], // Syncopated
    [0.5, 0.5, 0.5, 0.5, 2], // Eighth notes then half
  ];

  progression.chords.forEach((chord) => {
    const rhythm =
      rhythmPatterns[Math.floor(Math.random() * rhythmPatterns.length)];
    let timeInChord = 0;

    rhythm.forEach((duration) => {
      if (timeInChord < chord.duration) {
        // Play all chord notes together
        chord.notes.forEach((pitch) => {
          notes.push({
            pitch,
            velocity: 75 + Math.random() * 15,
            startTime: currentTime + timeInChord,
            duration: Math.min(duration, chord.duration - timeInChord) * 0.8,
            channel: 0,
          });
        });
        timeInChord += duration;
      }
    });

    currentTime += chord.duration;
  });

  return {
    name: 'Rhythm Pattern',
    notes,
    tempo: progression.tempo,
    timeSignature: progression.timeSignature,
    lengthInBars: progression.chords.length,
    key: progression.key,
  };
}

/**
 * Convert MIDI pattern to proper MIDI file format (base64)
 * Creates a standard MIDI file compatible with all DAWs
 */
export function midiPatternToBase64(pattern: MidiPattern): string {
  const PPQ = 480; // Pulses (ticks) per quarter note

  // Create MIDI file header (MThd chunk)
  const header = Buffer.alloc(14);
  header.write('MThd', 0); // Chunk type
  header.writeUInt32BE(6, 4); // Chunk length
  header.writeUInt16BE(0, 8); // Format 0 (single track)
  header.writeUInt16BE(1, 10); // Number of tracks
  header.writeUInt16BE(PPQ, 12); // Ticks per quarter note

  // Build track events
  const events: Array<{ time: number; data: Buffer }> = [];

  // Add tempo meta event
  const microsecondsPerQuarter = Math.floor(60000000 / pattern.tempo);
  const tempoEvent = Buffer.alloc(6);
  tempoEvent.writeUInt8(0xff, 0); // Meta event
  tempoEvent.writeUInt8(0x51, 1); // Tempo
  tempoEvent.writeUInt8(0x03, 2); // Length
  tempoEvent.writeUInt8((microsecondsPerQuarter >> 16) & 0xff, 3);
  tempoEvent.writeUInt8((microsecondsPerQuarter >> 8) & 0xff, 4);
  tempoEvent.writeUInt8(microsecondsPerQuarter & 0xff, 5);
  events.push({ time: 0, data: tempoEvent });

  // Add time signature meta event
  const [numerator, denominator] = pattern.timeSignature.split('/').map(Number);
  const timeSignatureEvent = Buffer.alloc(7);
  timeSignatureEvent.writeUInt8(0xff, 0); // Meta event
  timeSignatureEvent.writeUInt8(0x58, 1); // Time signature
  timeSignatureEvent.writeUInt8(0x04, 2); // Length
  timeSignatureEvent.writeUInt8(numerator, 3); // Numerator
  timeSignatureEvent.writeUInt8(Math.log2(denominator), 4); // Denominator (as power of 2)
  timeSignatureEvent.writeUInt8(24, 5); // Metronome click
  timeSignatureEvent.writeUInt8(8, 6); // 32nd notes per quarter note
  events.push({ time: 0, data: timeSignatureEvent });

  // Create note on/off events
  pattern.notes.forEach((note) => {
    const channel = note.channel || 0;
    const startTicks = Math.floor(note.startTime * PPQ);
    const endTicks = Math.floor((note.startTime + note.duration) * PPQ);

    // Note On event
    const noteOn = Buffer.alloc(3);
    noteOn.writeUInt8(0x90 | channel, 0); // Note On
    noteOn.writeUInt8(note.pitch, 1);
    noteOn.writeUInt8(note.velocity, 2);
    events.push({ time: startTicks, data: noteOn });

    // Note Off event
    const noteOff = Buffer.alloc(3);
    noteOff.writeUInt8(0x80 | channel, 0); // Note Off
    noteOff.writeUInt8(note.pitch, 1);
    noteOff.writeUInt8(0, 2); // Release velocity
    events.push({ time: endTicks, data: noteOff });
  });

  // Sort events by time
  events.sort((a, b) => a.time - b.time);

  // Add end of track event
  const endOfTrack = Buffer.alloc(3);
  endOfTrack.writeUInt8(0xff, 0); // Meta event
  endOfTrack.writeUInt8(0x2f, 1); // End of track
  endOfTrack.writeUInt8(0x00, 2); // Length
  const lastEventTime = events.length > 0 ? events[events.length - 1].time : 0;
  events.push({ time: lastEventTime + PPQ, data: endOfTrack });

  // Encode track data with delta times
  const trackDataBuffers: Buffer[] = [];
  let lastTime = 0;

  events.forEach((event) => {
    const deltaTime = event.time - lastTime;
    const deltaTimeVLQ = encodeVariableLengthQuantity(deltaTime);
    trackDataBuffers.push(deltaTimeVLQ);
    trackDataBuffers.push(event.data);
    lastTime = event.time;
  });

  const trackData = Buffer.concat(trackDataBuffers);

  // Create track header (MTrk chunk)
  const trackHeader = Buffer.alloc(8);
  trackHeader.write('MTrk', 0); // Chunk type
  trackHeader.writeUInt32BE(trackData.length, 4); // Chunk length

  // Combine all parts
  const midiFile = Buffer.concat([header, trackHeader, trackData]);

  // Convert to base64
  return midiFile.toString('base64');
}

/**
 * Encode a number as a MIDI variable-length quantity
 */
function encodeVariableLengthQuantity(value: number): Buffer {
  const bytes: number[] = [];
  
  // Extract 7-bit chunks
  bytes.push(value & 0x7f);
  value >>= 7;
  
  while (value > 0) {
    bytes.push((value & 0x7f) | 0x80);
    value >>= 7;
  }
  
  // Reverse to get big-endian order
  bytes.reverse();
  
  return Buffer.from(bytes);
}
