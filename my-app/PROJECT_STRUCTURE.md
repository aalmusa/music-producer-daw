# Music Producer DAW - Project Structure

## Overview

This is an AI-powered music production assistant system that helps with creating music loops and MIDI patterns through natural language interaction.

## System Components

### 🎵 1. Audio Loop Generation (ElevenLabs)

Generate AI-powered music loops using ElevenLabs API.

**Location:**

- API: `/app/api/elevenlabs/route.ts`
- Test Page: `/app/elevenlabs-test/page.tsx`
- Types: `/types/elevenlabs.ts`

**What it does:**

- Generates audio music loops from text prompts
- Configurable length and style
- Returns MP3 audio data
- Playable in browser

**Access:** `http://localhost:3000/elevenlabs-test`

---

### 🎹 2. DAW Assistant (Audio Loops)

Intelligent music production assistant that generates instrument loops based on song context.

**Location:**

- API: `/app/api/music-assistant/route.ts`
- UI: `/app/daw-assistant/page.tsx`
- Types: `/types/music-production.ts`

**What it does:**

- Understands song context (genre, mood, tempo, key)
- Uses LangChain + Gemini AI to analyze requests
- Generates 4-bar instrument loops via ElevenLabs
- Calculates precise timing based on tempo/time signature
- Returns downloadable audio loops

**Example Flow:**

```
User: "Add a bass line"
AI: *Analyzes song context* → Generates bass prompt
ElevenLabs: *Creates 4-bar bass loop at exact tempo*
User: Downloads MP3
```

**Access:** `http://localhost:3000/daw-assistant`

---

### 🎼 3. MIDI Pattern Assistant

Interactive conversational AI for creating MIDI patterns from chord progressions.

**Location:**

- API: `/app/api/midi-assistant/route.ts`
- UI: `/app/midi-assistant/page.tsx`
- Library: `/lib/midi-generator.ts`
- Types: `/types/midi.ts`
- Docs: `/MIDI_ASSISTANT_README.md`

**What it does:**

- Natural language conversation about chord progressions
- Parses chord notation (e.g., "Cmaj7 Am7 Dm7 G7")
- Generates 4 pattern types: bass, melody, arpeggio, rhythm
- Exports standard MIDI files (.mid)
- Compatible with all DAWs

**Pattern Types:**

1. **Bass Lines**: Root-based patterns with beat emphasis
2. **Arpeggios**: Up/down/updown note patterns
3. **Melodies**: Rhythmic melodic lines with chord tones
4. **Rhythm Patterns**: Chordal rhythm patterns

**Example Conversation:**

```
You: "Create a bass line for C Am F G"
AI: "I'll generate a bass line using the root notes..."
System: *Generates MIDI file*
You: Downloads .mid file → imports to DAW
```

**Access:** `http://localhost:3000/midi-assistant`

---

### 🤖 4. Basic AI Chat

Simple LangChain + Gemini chat interface (baseline implementation).

**Location:**

- API: `/app/api/ai/route.ts`
- UI: `/app/langchain/page.tsx`

**What it does:**

- Basic conversational AI
- Template for other AI features

**Access:** `http://localhost:3000/langchain`

---

## Technology Stack

### AI & LLM

- **LangChain**: Agent orchestration and conversation management
- **Google Gemini (Flash 2.5)**: Large language model for reasoning
- **ElevenLabs**: AI music generation

### Backend

- **Next.js 16**: API routes and server-side logic
- **TypeScript**: Type-safe development
- **Node.js Buffer**: MIDI file encoding

### Frontend

- **React 19**: UI components
- **Next.js App Router**: Client components
- **Tailwind CSS**: Styling
- **HTML5 Audio**: Audio playback

---

## File Structure

```
/app
  /api
    /ai/route.ts                    # Basic AI chat
    /elevenlabs/route.ts            # Audio generation
    /music-assistant/route.ts       # Audio loop assistant
    /midi-assistant/route.ts        # MIDI pattern assistant

  /daw-assistant/page.tsx           # Audio loop UI
  /elevenlabs-test/page.tsx         # Audio generation test UI
  /midi-assistant/page.tsx          # MIDI pattern chat UI
  /langchain/page.tsx               # Basic AI chat UI

/lib
  /midi-generator.ts                # MIDI generation logic
  /utils.ts                         # General utilities

/types
  /elevenlabs.ts                    # ElevenLabs types
  /music-production.ts              # Audio loop types
  /midi.ts                          # MIDI types

/public                             # Static assets

*.md                                # Documentation files
```

---

## Environment Variables Required

```bash
GOOGLE_API_KEY=your_google_gemini_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

---

## Complete Workflow Example

### Building a Complete Track

1. **Set Your Song Context**

   - Genre: Electronic
   - Mood: Energetic
   - Tempo: 128 BPM
   - Key: C minor
   - Time Signature: 4/4

2. **Generate Audio Loops** (DAW Assistant)

   ```
   Visit: /daw-assistant
   Request: "Add a bass line"
   AI generates: 4-bar bass loop audio (MP3)
   Download and save
   ```

3. **Generate MIDI Patterns** (MIDI Assistant)

   ```
   Visit: /midi-assistant
   Say: "Create a melody over Cm Fm Gm Ab"
   AI generates: MIDI melody pattern
   Download .mid file
   ```

4. **Import to Your DAW**
   - Import audio loops as audio tracks
   - Import MIDI files as MIDI tracks
   - Assign instruments to MIDI
   - Arrange and produce!

---

## Key Features Summary

### Audio Generation

✅ AI-powered music loop generation  
✅ Context-aware instrument selection  
✅ Precise 4-bar timing  
✅ Production-ready audio (MP3)  
✅ Downloadable loops

### MIDI Generation

✅ Conversational chord progression input  
✅ Multiple pattern types  
✅ Standard MIDI file export  
✅ DAW-compatible  
✅ Music theory aware

### AI Intelligence

✅ Natural language understanding  
✅ Musical context awareness  
✅ Genre-appropriate suggestions  
✅ Interactive clarification  
✅ Production best practices

---

## Development

### Run Development Server

```bash
cd my-app
npm run dev
```

### Build for Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

---

## Documentation

- **MIDI Assistant**: `MIDI_ASSISTANT_README.md`
- **DAW Assistant**: `DAW_ASSISTANT_README.md`
- **Project Structure**: `PROJECT_STRUCTURE.md` (this file)

---

## Future Enhancements

### Audio Side

- [ ] Multi-track orchestration
- [ ] Variation generation (A/B sections)
- [ ] Stem separation
- [ ] Audio effects processing
- [ ] Loop quantization

### MIDI Side

- [ ] Advanced chord voicings
- [ ] Scale-based improvisation
- [ ] Polyrhythmic patterns
- [ ] MIDI CC automation
- [ ] Humanization (swing, timing variation)

### Integration

- [ ] Combined audio + MIDI generation
- [ ] Full arrangement creator
- [ ] Project export to DAW formats
- [ ] Real-time collaboration
- [ ] Audio preview of MIDI (with synth)

---

**Built with ❤️ for music producers**
