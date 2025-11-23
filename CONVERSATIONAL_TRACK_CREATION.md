# Conversational Track Creation - AI Assistant Feature

## Overview

The AI Assistant now supports an intelligent conversational flow for creating tracks with instruments. When users ask to create a track, the AI engages in a natural dialogue to determine the best instrument configuration.

## How It Works

### Flow 1: User Asks for Generic Track

**User:** "Add a track" or "Create a new track"

**AI Response:**
1. Creates a new MIDI track
2. Asks what instrument the user wants
3. Lists available options with emojis
4. Provides suggestions as clickable buttons

**User Follow-up:** "Bass" (or any instrument name)

**AI Response:**
1. Determines if instrument is available in library
2. Sets up the appropriate configuration:
   - Synth mode + preset (for most instruments)
   - Sampler mode + audio file (for percussion)
   - Suggests audio track + loop generation (for unavailable instruments)

### Flow 2: User Specifies Instrument Immediately

**User:** "Add a piano track" or "Create a bass track"

**AI Response:**
1. Creates the track
2. Automatically configures the instrument
3. Confirms the setup with friendly message

### Flow 3: Unavailable Instrument

**User:** "I need a trumpet track"

**AI Response:**
1. Explains that trumpet is not in the library
2. Suggests creating an audio track instead
3. Recommends using the audio loop generator
4. Waits for user confirmation

## Available Instruments

### MIDI Synth Presets
These use synthesized sounds and are great for most musical instruments:

| Instrument Request | Synth Preset | Best For |
|-------------------|--------------|----------|
| Piano, Keyboard | `piano` | Electric piano, keys, chords |
| Bass, Sub Bass | `bass` | Bass guitar, sub bass, kick drums |
| Guitar (lead), Lead | `lead` | Lead guitar, solos, melodies |
| Guitar (acoustic), Strings | `pluck` | Acoustic guitar, plucked strings, violin |
| Pad, Atmosphere | `pad` | Ambient pads, atmospheric sounds |
| Bells, Chimes | `bells` | Bell sounds, metallic tones |
| Kick Drum | `bass` | Deep, punchy kick drums |

### MIDI Sampler Audio
These use actual audio samples triggered by MIDI:

| Instrument Request | Audio File | Best For |
|-------------------|------------|----------|
| Hi-hat, Hi Hat | `/audio/hihat.wav` | Hi-hat cymbal sounds |
| Clap, Hand Clap | `/audio/clap.wav` | Clap percussion |

### Not Available (Suggest Audio Track)
For instruments not in our library, the AI suggests:
1. Creating an audio track
2. Using the audio loop generator to create custom loops
3. Examples: trumpet, saxophone, violin, cello, flute, etc.

## Action Types

### New Actions Introduced

#### `set_instrument_mode`
Sets a MIDI track to synth or sampler mode.

```json
{
  "type": "set_instrument_mode",
  "trackName": "Track 1",
  "instrumentMode": "synth",
  "reasoning": "Setting track to synth mode for piano"
}
```

#### `set_synth_preset`
Applies a synth preset to a MIDI track in synth mode.

```json
{
  "type": "set_synth_preset",
  "trackName": "Piano",
  "synthPreset": "piano",
  "reasoning": "Applying piano preset with FM synthesis"
}
```

### Existing Actions Still Supported

- `create_track` - Create MIDI or audio tracks
- `select_instrument` - Assign sampler audio (for sampler mode)
- `delete_track`, `adjust_volume`, `adjust_bpm`, etc.

## Example Conversations

### Example 1: Generic Track Creation

```
User: "Add a track"

AI: "I've created a new MIDI track for you! What instrument would you like? 
I can set up:

🎹 Piano
🎸 Guitar (lead or acoustic)
🎸 Bass
🥁 Kick drum
🎵 Hi-hat
👏 Clap
🌊 Synth pad
🔔 Bells

Or let me know if you need something else!"

[Suggestions: Piano | Bass | Guitar]

User: "Bass"

AI: "Perfect! I've set up Track 1 as a bass synth. It has a deep, punchy 
sound that's great for laying down a solid foundation. Try playing some 
notes to hear it!"

[Suggestions: Add a drum track | Create a piano melody | Adjust BPM]
```

### Example 2: Specific Instrument Request

```
User: "Create a piano track"

AI: "I've created a piano track for you! It's set up with an electric 
piano sound using FM synthesis. Perfect for chords and melodies."

[Suggestions: Add a bass line | Create a pad | Adjust BPM]
```

### Example 3: Unavailable Instrument

```
User: "I need a trumpet track"

AI: "Great idea! Unfortunately, I don't have a trumpet synth preset in 
my library yet. However, I can create an audio track for you, and you 
can generate a trumpet loop using the audio loop generator! Would you 
like me to create an audio track for trumpet?"

[Suggestions: Yes, create audio track | Use different instrument | Show available instruments]

User: "Yes, create audio track"

AI: "Done! I've created an audio track called 'Trumpet' for you. You 
can now use the audio loop generator to create trumpet loops and drag 
them into this track!"

[Suggestions: Open loop generator | Add another track | Adjust BPM]
```

### Example 4: Multi-step Workflow

```
User: "Help me build a basic track"

AI: "Let's start with the foundation! I'll create a bass track for you."

[Creates bass track with bass synth preset]

User: "Now add drums"

AI: "I've created a MIDI track for drums! Which drum sound would you like?
- 🥁 Kick drum (bass synth)
- 🎵 Hi-hat (sample)
- 👏 Clap (sample)"

[Suggestions: Kick drum | Hi-hat | Clap]

User: "Hi-hat"

AI: "Perfect! Your drum track is now set up with a hi-hat sample. Try 
playing some patterns!"

[Suggestions: Add kick drum | Add melody | Set BPM to 120]
```

## Technical Implementation

### Frontend Changes

**DawShell.tsx:**
- Added action handlers for `set_instrument_mode` and `set_synth_preset`
- Updated DAW state to include `instrumentMode` and `synthPreset`
- Actions automatically call existing `handleSetInstrumentMode` and `handleSetSynthPreset`

### Backend Changes

**route.ts (DAW Assistant API):**
- Updated system prompt with conversational guidelines
- Added instrument library mapping (synth presets and sampler audio)
- Included instrument mapping guidelines for AI decision-making
- Enhanced examples showing multi-turn conversations

**Types:**
- Extended `DAWAction` interface with new action types
- Updated `DAWState` to include instrument configuration
- Added `instrumentMode` and `synthPreset` fields

### Audio Library

**Synth Presets** (`synthPresets.ts`):
- piano, bass, lead, pad, bells, pluck

**Sampler Audio** (`audioLibrary.ts`):
- clap.wav, hihat.wav

## User Benefits

1. **Natural Interaction**: Users can ask for tracks conversationally
2. **Guided Setup**: AI asks clarifying questions when needed
3. **Smart Defaults**: AI automatically selects best instrument for request
4. **Discovery**: Users learn what instruments are available
5. **Flexibility**: Works with both specific and generic requests
6. **Fallback**: Suggests alternatives when requested instrument unavailable

## Testing Scenarios

### Test 1: Basic Conversation
```
1. Say "Add a track"
2. Verify track is created
3. Verify AI asks for instrument
4. Reply with "Piano"
5. Verify synth mode set to piano preset
```

### Test 2: Immediate Instrument
```
1. Say "Create a bass track"
2. Verify track created with name "Bass"
3. Verify synth mode and bass preset applied
```

### Test 3: Unavailable Instrument
```
1. Say "I need a saxophone track"
2. Verify AI suggests audio track + loop generation
3. Confirm "Yes"
4. Verify audio track created
```

### Test 4: Percussion
```
1. Say "Add a hi-hat track"
2. Verify MIDI track created
3. Verify sampler mode with hihat.wav applied
```

### Test 5: Multiple Tracks
```
1. Say "Add piano, bass, and drums"
2. Verify all three tracks created
3. Verify AI asks about drum type
4. Reply "Hi-hat"
5. Verify drum track configured
```

## Future Enhancements

- Add more synth presets (e.g., synth brass, organ, strings)
- Expand sampler library with more percussion samples
- Support for drum kits (multiple samples mapped to different notes)
- Genre-aware instrument suggestions
- Integration with loop generator for seamless audio track creation
- Voice-to-text for hands-free track creation
- Smart instrument recommendations based on existing tracks

