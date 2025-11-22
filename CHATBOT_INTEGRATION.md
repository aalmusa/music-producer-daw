# Piano Roll Chatbot Integration

## Overview
Added an AI chatbot interface on the right side of the Piano Roll Modal to assist users with MIDI editing tasks. Also adjusted the grid width to eliminate the large gap on the right side.

## Changes Made

### 1. Layout Restructure
- Split the piano roll content into two sections:
  - **Left side**: Piano roll editor (flex-1, takes remaining space)
  - **Right side**: AI chatbot panel (fixed width: 384px/w-96)
- Piano roll grid width reduced from 800px to 600px

### 2. New State Management
Added chat-related state:
```typescript
const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([...]);
const [chatInput, setChatInput] = useState('');
const [isProcessing, setIsProcessing] = useState(false);
const chatEndRef = useRef<HTMLDivElement>(null);
```

### 3. Chat Functionality

#### `handleChatSubmit` Function
- Handles form submission
- Sends user message to `/api/assistant-agent`
- Updates chat messages with user input and AI response
- Updates clip data if AI modifies notes
- Includes error handling

#### Auto-scroll Effect
- Automatically scrolls chat to bottom when new messages arrive
- Uses `chatEndRef` for smooth scrolling

### 4. Chatbot UI Components

#### Header
- Shows "AI Assistant" with animated status indicator
- Helper text explaining capabilities

#### Messages Area
- Scrollable message list
- User messages: emerald background, right-aligned
- Assistant messages: slate background, left-aligned
- Loading indicator with animated dots during processing

#### Input Form
- Text input for user messages
- Send button (disabled when processing or empty)
- Helper text with example prompts

## API Integration

The chatbot expects an API endpoint at `/api/assistant-agent` that accepts:
```json
{
  "message": "user's message",
  "clipData": { ... },
  "trackId": "track-id"
}
```

And returns:
```json
{
  "message": "assistant's response",
  "clipData": { ... } // optional, if notes were modified
}
```

## Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│                         Header                               │
├──────────────────────────────────────┬──────────────────────┤
│ Piano Roll Editor (600px grid)       │  AI Chatbot (384px)  │
│                                      │                       │
│ ┌─────┬────────────────────┐        │  ┌────────────────┐  │
│ │NOTE │ Time Ruler          │        │  │ Chat Header    │  │
│ ├─────┼────────────────────┤        │  ├────────────────┤  │
│ │Keys │ Grid                │        │  │                │  │
│ │     │   • Notes           │        │  │ Messages       │  │
│ │     │   • Grid cells      │        │  │                │  │
│ └─────┴────────────────────┘        │  ├────────────────┤  │
│                                      │  │ Input Form     │  │
│                                      │  └────────────────┘  │
└──────────────────────────────────────┴──────────────────────┘
│                         Footer                               │
└─────────────────────────────────────────────────────────────┘
```

## Features

### Chat Interface
- ✅ Real-time conversation with AI assistant
- ✅ Message history display
- ✅ Loading states with animated indicators
- ✅ Auto-scroll to latest message
- ✅ Example prompts for user guidance
- ✅ Error handling and user feedback

### Layout Improvements
- ✅ Eliminated right-side gap
- ✅ Proper spacing and borders
- ✅ Responsive chatbot panel
- ✅ Maintained piano roll functionality

### Integration
- ✅ Can update clip data based on AI suggestions
- ✅ Passes current clip context to AI
- ✅ Non-blocking UI during processing

## Example Use Cases

Users can ask the AI assistant to:
- "Create a C major scale"
- "Add harmony to the existing melody"
- "Generate a drum pattern"
- "Transpose all notes up by 2 semitones"
- "Create a chord progression"
- "Add arpeggios"

## Grid Width Adjustments

Updated all grid-related widths from 800px to 600px:
- Time ruler container: 600px
- Time ruler divisions: 600 / (bars × 4) px
- Grid container: 600px
- Note position calculation: (note.start / bars) × 600
- Note width calculation: (note.duration / bars) × 600

## Styling Details

- Chatbot background: `bg-slate-900/30`
- User messages: `bg-emerald-600 text-white`
- Assistant messages: `bg-slate-800 text-slate-200`
- Input field: `bg-slate-800` with emerald focus ring
- Border between panels: `border-slate-800`

