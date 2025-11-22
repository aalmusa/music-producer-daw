# 🎹 MIDI Pattern Assistant - Interactive Chord Progression System

## Overview

An intelligent conversational AI system that helps you create MIDI patterns based on chord progressions. The assistant uses LangChain to understand musical context and generate production-ready MIDI files through natural language interaction.

## Features

### 🎼 **Interactive Conversation**

- Natural language interface for discussing chord progressions
- AI asks clarifying questions when needed
- Suggests common progressions and musical ideas
- Explains music theory concepts

### 🎵 **Pattern Types**

The assistant can generate four types of MIDI patterns:

1. **Bass Lines**: Root-based patterns with emphasis on beat one
2. **Arpeggios**: Note-by-note chord patterns (up, down, or up-down)
3. **Melodies**: Rhythmically varied melodic lines using chord tones
4. **Rhythm Patterns**: Chordal rhythm patterns with varied timing

### 🎹 **Chord Support**

Supports a wide range of chord types:

- Basic: Major, Minor, Diminished, Augmented
- Seventh Chords: Major7, Minor7, Dominant7, Minor7b5
- Extensions: Sus2, Sus4, Add9, 6, Minor6

### 📥 **MIDI Export**

- Generates standard MIDI files (.mid)
- Compatible with all DAWs (Ableton, Logic, FL Studio, etc.)
- Proper tempo and time signature metadata
- Downloadable patterns

## How It Works

### Conversation Flow

```
User: "I want to create a bass line"
  ↓
AI: "Great! What chord progression would you like to use?"
  ↓
User: "C major to A minor to F major to G major"
  ↓
AI: *Parses chords* → "I'll create a bass line for C-Am-F-G"
  ↓
System: *Generates MIDI pattern*
  ↓
User: Downloads MIDI file
```

### Technical Process

1. **User Input Processing**

   - LangChain agent analyzes the message
   - Extracts chord progression (if provided)
   - Determines pattern type intent
   - Identifies if more information is needed

2. **Context Management**

   - Maintains conversation history
   - Tracks chord progression state
   - Remembers pattern preferences
   - Uses song context (key, tempo, time signature)

3. **Chord Parsing**

   - Recognizes various chord notation formats:
     - "C Am F G"
     - "Cmaj7 Am7 Dm7 G7"
     - "C-Am-F-G"
   - Converts to MIDI note numbers
   - Validates chord quality

4. **Pattern Generation**

   - Applies music theory rules
   - Creates rhythmically appropriate patterns
   - Ensures notes stay within chord tones
   - Adds musical variation and dynamics

5. **MIDI File Creation**
   - Converts patterns to MIDI format
   - Adds tempo and time signature metadata
   - Encodes as base64 for download
   - Ensures DAW compatibility

## API Endpoint

### `/api/midi-assistant` (POST)

**Request Body:**

```typescript
{
  userMessage: string;           // User's message
  context: {
    conversationHistory: Array<{
      role: 'user' | 'assistant';
      content: string;
      timestamp: number;
    }>;
    chordProgression?: {         // Parsed progression
      chords: Array<{
        name: string;
        root: string;
        quality: string;
        notes: number[];
        duration: number;
      }>;
      key: string;
      tempo: number;
      timeSignature: string;
    };
    patternType?: 'melody' | 'bass' | 'arpeggio' | 'rhythm';
    complexity?: 'simple' | 'moderate' | 'complex';
  };
  songContext?: {
    genre: string;
    mood: string;
    tempo: number;
    key: string;
    timeSignature: string;
  };
}
```

**Response:**

```typescript
{
  success: boolean;
  assistantMessage: string;      // AI's conversational response
  needsMoreInfo: boolean;         // Whether more input is needed
  suggestedQuestions?: string[];  // Follow-up questions
  midiPattern?: {                 // Generated pattern (if ready)
    name: string;
    notes: Array<{
      pitch: number;              // MIDI note (0-127)
      velocity: number;           // Velocity (0-127)
      startTime: number;          // Start time in beats
      duration: number;           // Duration in beats
      channel: number;            // MIDI channel
    }>;
    tempo: number;
    timeSignature: string;
    lengthInBars: number;
    key: string;
  };
  chordProgression?: {...};       // Updated progression
  midiFileData?: string;          // Base64 MIDI file
  updatedContext?: {...};         // Updated conversation context
}
```

## Example Conversations

### Example 1: Bass Line Generation

```
User: "Create a bass line"

AI: "I'd be happy to help! What chord progression would you like
     to use for the bass line?"

User: "I-V-vi-IV in C major"

AI: "Perfect! That's the classic C-G-Am-F progression. I'll create
     a bass line using quarter notes that emphasizes the root of
     each chord."

*Generates MIDI pattern*
```

### Example 2: Arpeggio with Clarification

```
User: "Make an arpeggio for Cmaj7 Am7 Dm7 G7"

AI: "Great chord progression! Would you like the arpeggio to go
     up, down, or up-and-down?"

User: "Up and down"

AI: "I'll create an up-and-down arpeggio pattern that plays through
     each chord tone in ascending then descending order."

*Generates MIDI pattern*
```

### Example 3: Guided Progression Creation

```
User: "I'm not sure what chord progression to use"

AI: "No problem! What's the genre and mood of your track?"

User: "Pop ballad, emotional"

AI: "For an emotional pop ballad, a great progression would be
     vi-IV-I-V (Am-F-C-G in C major). This creates a melancholic
     yet hopeful feeling. Would you like me to create a pattern
     with this progression?"

User: "Yes, make a melody"

*Generates MIDI pattern*
```

## Code Structure

```
/app/api/midi-assistant/
  route.ts                    # Main API endpoint with conversation agent

/lib/
  midi-generator.ts           # MIDI generation utilities
    - parseChord()            # Parse chord names
    - chordToMidiNotes()      # Convert chords to MIDI
    - generateBassLine()      # Generate bass patterns
    - generateArpeggio()      # Generate arpeggio patterns
    - generateMelody()        # Generate melodic patterns
    - generateRhythmPattern() # Generate rhythm patterns
    - midiPatternToBase64()   # Export MIDI files

/types/
  midi.ts                     # TypeScript type definitions
    - Note, Chord, ChordProgression
    - MidiPattern, MidiGenerationContext
    - ConversationMessage
    - Request/Response types

/app/midi-assistant/
  page.tsx                    # Frontend chat interface
```

## Usage Examples

### In Your DAW Workflow

1. **Set Your Song Context**

   - Key: C major
   - Tempo: 120 BPM
   - Time Signature: 4/4

2. **Have a Conversation**

   ```
   You: "I need a bass line for a house track"
   AI: "What chord progression are you using?"
   You: "Cm7 Fm7 Cm7 G7"
   AI: *Generates bass line*
   ```

3. **Download MIDI**

   - Click "Download MIDI"
   - Import into your DAW
   - Assign to any instrument
   - Edit as needed

4. **Build Your Track**
   - Generate multiple patterns
   - Layer bass, melody, arpeggios
   - Use as inspiration or final parts

## Musical Intelligence

The AI assistant understands:

- **Common Progressions**: I-V-vi-IV, ii-V-I, I-vi-IV-V
- **Roman Numeral Notation**: Converts to actual chords
- **Chord Substitutions**: Suggests alternatives
- **Voice Leading**: Creates smooth transitions
- **Genre Conventions**: Adapts patterns to style
- **Rhythmic Variations**: Adds musical interest

## Technical Details

### MIDI Note Numbers

- Middle C (C4) = 60
- Range: 0-127 (C-1 to G9)
- Each octave = 12 semitones

### Time Calculations

- Quarter note = 1 beat
- 4/4 time = 4 beats per bar
- MIDI ticks = 480 per quarter note

### Pattern Algorithms

**Bass Line:**

- Uses chord root note
- Octave lower than chords
- Quarter note rhythm
- Emphasis on beat one

**Arpeggio:**

- Cycles through chord tones
- Configurable direction
- Even timing distribution
- Slight velocity variation

**Melody:**

- Selects from chord tones + octave
- Varied rhythm patterns
- Random melodic contour
- Dynamic velocity

**Rhythm:**

- Plays full chords
- Various rhythmic feels
- Syncopation options
- Staccato articulation

## Future Enhancements

- [ ] Scale-based improvisation
- [ ] Chord voicing variations
- [ ] Swing and groove quantization
- [ ] Polyrhythmic patterns
- [ ] Chord inversions
- [ ] Voice leading optimization
- [ ] Genre-specific templates
- [ ] MIDI CC automation
- [ ] Multi-track arrangements
- [ ] Audio preview (play MIDI with synth)

## Integration with DAW Assistant

The MIDI assistant can be integrated with the main DAW assistant for:

- Generating MIDI patterns that match ElevenLabs audio loops
- Creating backing tracks for vocals
- Prototyping harmonic structures
- Building complete arrangements

## Dependencies

- **@langchain/core**: Conversation management
- **@langchain/google-genai**: LLM for musical reasoning
- **Buffer**: MIDI file encoding
- **TypeScript**: Type-safe development

## Environment Variables

```bash
GOOGLE_API_KEY=your_google_api_key
```

## Access the Assistant

Navigate to: `http://localhost:3000/midi-assistant`

---

**Happy Music Making! 🎵**
