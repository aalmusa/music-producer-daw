# AI Music Production Assistant - DAW Flow

## Overview

This is an intelligent music production assistant that helps you create instrument loops for your DAW. It uses LangChain with Google's Gemini AI to understand musical context and generate appropriate instrument loops using ElevenLabs.

## How It Works

### 1. **Song Context**

The user defines the overall context of their song:

- **Genre**: e.g., Electronic, Hip Hop, Rock
- **Mood**: e.g., energetic, calm, dark
- **Tempo**: BPM (60-200)
- **Key**: Musical key (C major, A minor, etc.)
- **Time Signature**: 4/4, 3/4, 6/8, etc.
- **Description**: Optional additional context

### 2. **AI Agent Flow**

The LangChain agent follows this workflow:

```
User Request → LangChain Agent → Instrument Analysis → ElevenLabs Generation → 4-Bar Loop
```

#### Step-by-Step Process:

1. **User makes a request** (e.g., "Add a bass line")

2. **LangChain Agent analyzes** the request considering:

   - Song context (genre, mood, tempo, key)
   - User's specific request
   - Musical theory and production best practices

3. **Agent returns a JSON decision**:

   ```json
   {
     "instrument": "bass",
     "reasoning": "Why this instrument choice works",
     "musicalCharacteristics": "Specific details about the loop"
   }
   ```

4. **System calculates 4-bar length**:

   - Formula: `(beats per bar × 4 bars × 60) / tempo`
   - Converts to milliseconds for ElevenLabs

5. **Creates detailed ElevenLabs prompt**:

   - Combines song context + instrument + agent's characteristics
   - Example: "A energetic bass Electronic loop in C minor at 128 BPM, 4/4 time signature. [musical characteristics]. This is a 4-bar melodic loop designed for music production."

6. **ElevenLabs generates the audio**:

   - Creates exactly 4 bars of music
   - Returns audio buffer with metadata

7. **System returns the loop** with:
   - Audio file (as base64 data URL)
   - AI reasoning
   - Metadata (title, description)
   - Instrument information

### 3. **Frontend Interface**

The DAW Assistant page provides:

- **Song Context Panel**: Set genre, mood, tempo, key, etc.
- **AI Chat Interface**: Natural language requests for instruments
- **Quick Request Buttons**: Common requests (Add bass, Add drums, etc.)
- **Generated Loops Collection**: All created loops with audio players
- **Download & Playback**: Individual loop controls

## API Routes

### `/api/music-assistant` (POST)

**Request Body:**

```typescript
{
  songContext: {
    genre: string;
    mood: string;
    tempo: number;
    key: string;
    timeSignature: string;
    description?: string;
  },
  userRequest: string;
}
```

**Response:**

```typescript
{
  success: boolean;
  reasoning: string;
  instrument: string;
  prompt: string;
  loop?: {
    instrument: string;
    prompt: string;
    audioUrl: string;
    metadata: {
      title: string;
      description: string;
    };
    bars: number;
    order: number;
  };
  error?: string;
}
```

## Key Features

### 🎵 **Intelligent Instrument Selection**

The AI agent understands musical context and suggests appropriate instruments that fit your song's genre, mood, and key.

### ⏱️ **Precise 4-Bar Calculation**

Automatically calculates the exact duration for 4 bars based on tempo and time signature.

### 🎹 **Musical Context Awareness**

The agent considers:

- Key and scale compatibility
- Genre conventions
- Mood and energy level
- Tempo appropriateness
- Harmonic relationships

### 🎼 **Production-Ready Loops**

Each loop is:

- Exactly 4 bars long
- In the correct key and tempo
- Designed for layering in a DAW
- Downloadable as MP3

## Example Usage

1. **Set your song context:**

   - Genre: "Electronic"
   - Mood: "dark and mysterious"
   - Tempo: 140 BPM
   - Key: "D minor"
   - Time Signature: "4/4"

2. **Request an instrument:**

   - "Add a deep bass line"

3. **AI Agent responds:**

   - Instrument: "Sub Bass"
   - Reasoning: "A deep sub bass in D minor will provide a solid foundation for your dark electronic track, creating tension and depth"
   - Generates 4-bar loop at 140 BPM in D minor

4. **Build your track:**
   - Continue requesting layers (drums, pads, leads, etc.)
   - Each loop is perfectly synced and in key
   - Download all loops to import into your DAW

## Technical Stack

- **LangChain**: Agent orchestration and reasoning
- **Google Gemini**: Large language model for music analysis
- **ElevenLabs**: AI music generation
- **Next.js**: API routes and frontend
- **TypeScript**: Type-safe development

## Environment Variables Required

```bash
GOOGLE_API_KEY=your_google_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

## File Structure

```
/app
  /api
    /music-assistant
      route.ts          # Main agent logic
  /daw-assistant
    page.tsx            # Frontend UI
/types
  music-production.ts   # TypeScript types
  elevenlabs.ts         # ElevenLabs types
```

## Future Enhancements

- [ ] Multi-instrument orchestration
- [ ] Variation generation (A/B sections)
- [ ] Chord progression suggestions
- [ ] Stem separation and mixing
- [ ] Project export to DAW formats
- [ ] Real-time collaboration
- [ ] Loop quantization and alignment
