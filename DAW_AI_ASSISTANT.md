# DAW AI Assistant Implementation

## Overview

The DAW AI Assistant is an intelligent agent integrated into the main DAW interface that helps users with music production tasks. It can create and manage tracks, adjust settings, and provide creative suggestions for next steps.

## Features

### Core Capabilities

1. **Track Management**

   - Create new MIDI tracks
   - Create new audio tracks
   - Delete existing tracks
   - Name tracks appropriately based on context

2. **Volume Control**

   - Adjust individual track volumes
   - Mixing suggestions and best practices

3. **BPM Control**

   - Set project tempo
   - Adjust BPM based on genre and style

4. **Instrument Selection**

   - Select sampler instruments for MIDI tracks
   - Available instruments: clap.wav, hihat.wav
   - Option to use default synth

5. **Creative Guidance**
   - Provide suggestions for what to add next
   - Give production tips and ideas
   - Help with workflow and arrangement

## Architecture

### Components

#### 1. AI Assistant UI Component (`components/daw/AIAssistant.tsx`)

A chat-based interface that:

- Displays conversation history
- Shows AI suggestions as clickable buttons
- Handles user input and API communication
- Displays loading states during processing
- Auto-scrolls to latest messages

**Props:**

- `dawState`: Current state of the DAW (tracks, BPM)
- `onActionsReceived`: Callback to execute AI-generated actions

#### 2. API Route (`app/api/daw-assistant/route.ts`)

Backend agent that:

- Uses LangChain with Google Gemini 2.5 Flash
- Analyzes user requests in context of current DAW state
- Returns structured actions and natural language responses
- Provides creative suggestions for next steps

**Request Format:**

```typescript
{
  message: string;
  dawState: {
    tracks: Array<{
      id: string;
      name: string;
      type: 'audio' | 'midi';
      volume: number;
      muted: boolean;
      solo: boolean;
      samplerAudioUrl?: string;
    }>;
    bpm: number;
  };
  userContext?: string; // Optional high-level context
}
```

**Response Format:**

```typescript
{
  success: boolean;
  message: string; // Natural language response
  actions: Array<{
    type: 'create_track' | 'delete_track' | 'adjust_volume' | 'adjust_bpm' | 'select_instrument' | 'none';
    // Additional fields based on action type
    reasoning: string;
  }>;
  suggestions?: string[]; // Ideas for next steps
  error?: string;
}
```

#### 3. DawShell Integration

The main DAW component (`components/daw/DawShell.tsx`) includes:

- AI Assistant panel in the right sidebar (top half)
- Action execution handler (`handleAIAssistantActions`)
- State synchronization between assistant and DAW
- BPM management shared with TransportBar

### Action Types

1. **create_track**

   - Creates a new MIDI or audio track
   - Fields: `trackType`, `trackName`
   - Automatically assigns colors and initializes MIDI parts

2. **delete_track**

   - Removes a track by ID or name
   - Fields: `trackId` or `trackName`
   - Cleans up audio engine resources

3. **adjust_volume**

   - Sets track volume (0-1 range)
   - Fields: `trackId` or `trackName`, `volume`

4. **adjust_bpm**

   - Changes project tempo
   - Fields: `bpm`
   - Syncs with audio engine and all tracks

5. **select_instrument**

   - Sets a sampler instrument for MIDI track
   - Fields: `trackId` or `trackName`, `instrumentPath`
   - Updates MIDI parts with new sampler

6. **none**
   - No action, just conversational response
   - Used for questions, clarifications, or general guidance

## User Interface

### Layout

The AI Assistant is located in the right sidebar, occupying the top half:

```
┌─────────────────────────────────────────────────┐
│              Transport Bar (BPM, Play/Stop)     │
├───────┬─────────────────────────┬───────────────┤
│ Track │ Timeline                │ ┌───────────┐ │
│ List  │ (Clips, Grid)           │ │ AI        │ │
│       │                         │ │ Assistant │ │
│       │                         │ │           │ │
│       │                         │ ├───────────┤ │
│       │                         │ │ Right     │ │
│       │                         │ │ Sidebar   │ │
├───────┴─────────────────────────┴─┴───────────┘ │
│              Mixer (Track Faders)               │
└─────────────────────────────────────────────────┘
```

### Chat Interface Features

- **Message Display**: User messages (right, emerald) and assistant messages (left, slate)
- **Suggestions**: Clickable suggestion buttons below assistant messages
- **Loading Indicator**: Animated dots while processing
- **Auto-scroll**: Automatically scrolls to latest message
- **Input Field**: Text input with send button
- **Helper Text**: Examples of what to ask

## Example Usage

### Creating Tracks

**User:** "Add a drum track"

**Assistant:**

- Message: "I'll create a MIDI drum track for you. I'm setting it up with a hi-hat sample to get you started."
- Actions:
  1. Create MIDI track named "Drums"
  2. Select hi-hat instrument for the track
- Suggestions:
  - "Add a bass line to create a rhythm section"
  - "Create a melody track with a synth"
  - "Adjust the BPM to match your desired tempo"

### Adjusting Settings

**User:** "Set BPM to 128"

**Assistant:**

- Message: "I've set the project tempo to 128 BPM. This is a great tempo for electronic and dance music!"
- Actions:
  1. Adjust BPM to 128
- Suggestions:
  - "Create a kick drum pattern to establish the beat"
  - "Add a bass line that complements the tempo"
  - "Layer hi-hats for a driving rhythm"

### Getting Help

**User:** "What should I add next?"

**Assistant:**

- Message: "Based on your current setup with drums at 128 BPM, I'd suggest..."
- Actions: None (conversational)
- Suggestions:
  - "Add a bass track for low-end energy"
  - "Create a pad or synth track for atmosphere"
  - "Add percussion elements for texture"

## Technical Details

### State Management

- **BPM State**: Shared between DawShell, TransportBar, and AI Assistant
- **Track State**: Managed in DawShell, passed to AI Assistant as read-only
- **Actions**: Generated by AI, executed by DawShell handlers

### Action Execution Flow

1. User sends message to AI Assistant
2. Assistant sends request to `/api/daw-assistant`
3. API analyzes request with LangChain + Gemini
4. API returns actions and response
5. Assistant displays message and suggestions
6. Assistant calls `onActionsReceived` callback
7. DawShell executes actions via handlers
8. UI updates reflect changes

### Error Handling

- API errors display user-friendly messages
- Parsing errors fall back to conversational mode
- Invalid actions are filtered out
- Console logs track action execution

## Environment Variables

Required in `.env.local`:

```bash
GOOGLE_API_KEY=your_google_api_key_here
```

## Future Enhancements

### Planned Features

- [ ] **Context from Another Agent**: Integrate with a higher-level planning agent
- [ ] **Audio Library Integration**: Reference and add audio files from library
- [ ] **MIDI Editing Suggestions**: Generate note patterns and melodies
- [ ] **Mixing Advice**: EQ, compression, and effects suggestions
- [ ] **Arrangement Ideas**: Song structure and progression guidance
- [ ] **Genre-Specific Templates**: Quick-start templates for different styles
- [ ] **Voice Commands**: Voice input for hands-free operation
- [ ] **Export & Share**: Save and share assistant conversations

### Technical Improvements

- [ ] **Action Undo/Redo**: History and rollback for AI actions
- [ ] **Batch Actions**: Execute multiple related actions as atomic operations
- [ ] **Action Preview**: Show what will happen before executing
- [ ] **Custom Instruments**: User-uploaded samples in instrument selection
- [ ] **Advanced Routing**: Complex routing and send/return channels
- [ ] **Plugin Integration**: Control VST/AU plugins via AI

## Testing

To test the AI Assistant:

1. Start the dev server: `npm run dev`
2. Navigate to `/daw`
3. Open the AI Assistant panel (right sidebar, top half)
4. Try example prompts:
   - "Create a new MIDI track"
   - "Add a drum track with hi-hat"
   - "Set BPM to 140"
   - "Make the Drums track louder"
   - "Delete the Bass track"
   - "What should I add next?"

## API Costs

- Uses Google Gemini 2.5 Flash (cost-effective)
- Average token usage: 500-1000 tokens per request
- Estimated cost: $0.001-0.002 per request (varies)

## Troubleshooting

### Assistant not responding

- Check `GOOGLE_API_KEY` in environment variables
- Check browser console for API errors
- Verify network connection

### Actions not executing

- Check console logs for action details
- Verify track names/IDs match
- Ensure valid action parameters

### Suggestions not clickable

- Check that suggestions array is populated
- Verify message role is 'assistant'
- Check for UI rendering errors

## Credits

- **LangChain**: Agent orchestration
- **Google Gemini**: AI language model
- **Next.js**: Framework and API routes
- **Tone.js**: Audio engine integration
- **Tailwind CSS**: UI styling
