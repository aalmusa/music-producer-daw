export interface Note {
  pitch: number; // MIDI note number (0-127)
  velocity: number; // Note velocity (0-127)
  startTime: number; // Start time in ticks or beats
  duration: number; // Duration in ticks or beats
  channel?: number; // MIDI channel (0-15)
}

export interface Chord {
  name: string; // e.g., "Cmaj7", "Am", "G7"
  root: string; // e.g., "C", "A", "G"
  quality: string; // e.g., "major", "minor", "dominant7"
  notes: number[]; // MIDI note numbers
  duration: number; // Duration in beats
}

export interface ChordProgression {
  chords: Chord[];
  key: string;
  timeSignature: string;
  tempo: number;
}

export interface MidiPattern {
  name: string;
  notes: Note[];
  tempo: number;
  timeSignature: string;
  lengthInBars: number;
  key: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface MidiGenerationContext {
  chordProgression?: ChordProgression;
  patternType?: string; // 'melody', 'bass', 'arpeggio', 'rhythm'
  complexity?: 'simple' | 'moderate' | 'complex';
  style?: string;
  conversationHistory: ConversationMessage[];
}

export interface MidiGenerationRequest {
  userMessage: string;
  context: MidiGenerationContext;
  songContext?: {
    genre: string;
    mood: string;
    tempo: number;
    key: string;
    timeSignature: string;
  };
}

export interface MidiGenerationResponse {
  success: boolean;
  assistantMessage: string;
  needsMoreInfo: boolean;
  suggestedQuestions?: string[];
  midiPattern?: MidiPattern;
  chordProgression?: ChordProgression;
  midiFileData?: string; // Base64 encoded MIDI file
  updatedContext?: MidiGenerationContext;
  error?: string;
}
