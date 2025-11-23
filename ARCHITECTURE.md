# System Architecture - MIDI DAW

## Component Hierarchy

```
DawShell (State Container)
├── TransportBar (Playback Controls)
│   ├── Play/Stop Button
│   ├── Position Display
│   └── BPM Input
│
├── TrackList (Left Sidebar)
│   └── Track × 3
│       ├── Track Name + Type Badge
│       └── Mute/Solo Buttons
│
├── Timeline (Center Area)
│   ├── Time Ruler (1-16 bars)
│   └── Track Lanes × 3
│       ├── Drums (Audio)
│       │   └── WaveformTrack Component
│       ├── Bass (MIDI)
│       │   └── MidiClip Component
│       │       └── Piano Roll Editor
│       └── Keys (MIDI)
│           └── MidiClip Component
│               └── Piano Roll Editor
│
├── RightSidebar (Inspector)
└── Mixer (Bottom Panel)
```

## Data Flow Architecture

### 1. Track State Management
```
┌─────────────────────────────────────────────┐
│ DawShell.tsx (Root State)                   │
│                                             │
│ tracks: Track[] = [                         │
│   { id, name, type: "audio"|"midi", ... }   │
│ ]                                           │
└──────────┬──────────────────────────────────┘
           │
           ├──→ TrackList (read-only display)
           │
           └──→ Timeline (read + update via setTracks)
                    │
                    └──→ MidiClip (update via callback)
```

### 2. MIDI Playback Pipeline
```
User Interaction
      ↓
┌──────────────────────┐
│ MidiClip.tsx         │  ← User clicks grid
│ - handleGridClick()  │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│ Timeline.tsx         │  ← Updates track state
│ - handleUpdateMidiClip()
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│ audioEngine.ts       │  ← Schedules notes
│ - updateMidiPart()   │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│ Tone.js              │  ← Manages timing
│ - Part (scheduler)   │
│ - Transport (clock)  │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│ Tone.PolySynth       │  ← Generates sound
│ - triggerAttackRelease()
└──────────┬───────────┘
           ↓
      Web Audio API
           ↓
      🔊 Speakers
```

### 3. Real-time Preview Flow
```
User hovers/clicks note
        ↓
MidiClip.handleNoteHover()
        ↓
audioEngine.previewNote()
        ↓
PolySynth.triggerAttackRelease()
        ↓
Immediate audio feedback
```

## File Structure

```
my-app/
├── lib/
│   ├── midiTypes.ts           # Type definitions
│   │   ├── MidiNote
│   │   ├── MidiClipData
│   │   ├── Track
│   │   └── Utility functions
│   │
│   └── audioEngine.ts         # Tone.js integration
│       ├── Transport control
│       ├── MIDI synthesis
│       ├── Part scheduling
│       └── Track management
│
├── components/daw/
│   ├── DawShell.tsx          # Root container
│   │   └── Track state management
│   │
│   ├── TransportBar.tsx      # Playback controls
│   │   └── Play/Stop/BPM
│   │
│   ├── TrackList.tsx         # Left sidebar
│   │   └── Track info + M/S buttons
│   │
│   ├── Timeline.tsx          # Main timeline
│   │   ├── Time ruler
│   │   └── Track lanes
│   │
│   ├── MidiClip.tsx          # Piano roll editor ⭐
│   │   ├── Grid rendering
│   │   ├── Note visualization
│   │   └── Click interaction
│   │
│   ├── WaveformTrack.tsx     # Audio visualization
│   ├── RightSideBar.tsx      # Inspector
│   └── Mixer.tsx             # Bottom mixer
│
└── app/daw/
    └── page.tsx              # Route entry point
```

## Key Design Patterns

### 1. Lifting State Up
- Track data lives in `DawShell` (single source of truth)
- Child components receive data via props
- Updates flow through callbacks back to parent

### 2. Separation of Concerns
- **UI Layer**: React components (visual representation)
- **Data Layer**: TypeScript types (data structure)
- **Audio Layer**: audioEngine.ts (sound generation)

### 3. Unidirectional Data Flow
```
User Action → Component State Update → 
Engine Update → Audio Output
```

### 4. Component Composition
```typescript
<Timeline>
  {tracks.map(track => 
    track.type === "midi" ? 
      <MidiClip /> : 
      <WaveformTrack />
  )}
</Timeline>
```

## State Management

### Track State (DawShell)
```typescript
const [tracks, setTracks] = useState<Track[]>([...]);

// Mute toggle
const handleToggleMute = (trackId: string) => {
  setTracks(prev => prev.map(track => 
    track.id === trackId 
      ? { ...track, muted: !track.muted }
      : track
  ));
  setTrackMute(trackId, !track.muted); // Audio engine
};
```

### MIDI Clip State (Timeline)
```typescript
const handleUpdateMidiClip = (trackId, clipData) => {
  setTracks(prev => prev.map(track =>
    track.id === trackId 
      ? { ...track, midiClip: clipData }
      : track
  ));
  updateMidiPart(trackId, clipData); // Audio engine
};
```

### Local UI State (MidiClip)
```typescript
const [showPianoRoll, setShowPianoRoll] = useState(false);
const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
```

## Audio Engine Architecture

### Singleton Pattern
```typescript
// One transport for entire app
const transport = Tone.getTransport();

// One synth per track (lazy creation)
const synthMap = new Map<string, Tone.PolySynth>();
const midiPartMap = new Map<string, Tone.Part>();
```

### Resource Management
```typescript
// Create on demand
function getSynthForTrack(trackId: string): Tone.PolySynth {
  if (!synthMap.has(trackId)) {
    const synth = new Tone.PolySynth(...);
    synthMap.set(trackId, synth);
  }
  return synthMap.get(trackId);
}

// Clean up when removed
function removeMidiTrack(trackId: string) {
  part?.dispose();
  synth?.dispose();
}
```

## Timing System

### Musical Time Notation
```typescript
// Tone.js uses "bars:beats:sixteenths" format
"0:0:0"   // Start of bar 1
"1:0:0"   // Start of bar 2
"0:2:0"   // Beat 3 of bar 1
"3:3:2"   // 3rd sixteenth of beat 4 in bar 4
```

### Note Scheduling
```typescript
// Convert our format to Tone format
const events = notes.map(note => ({
  time: `${note.start}m`,      // "0m" = bar 0
  duration: `${note.duration}m`, // "0.25m" = quarter bar
  note: noteNumberToName(note.pitch),
  velocity: note.velocity
}));

// Create looping Part
const part = new Tone.Part((time, value) => {
  synth.triggerAttackRelease(
    value.note, 
    value.duration, 
    time, 
    value.velocity
  );
}, events);

part.loop = true;
part.loopEnd = "4m"; // Loop every 4 bars
```

## Performance Considerations

### Efficient Rendering
- CSS Grid for piano roll (no canvas needed)
- Absolute positioning for notes (no layout thrashing)
- React state updates batched automatically

### Audio Optimization
- Notes scheduled ahead of time (no timing jitter)
- Synths reused per track (no constant allocation)
- Parts disposed when tracks change (no memory leaks)

### Update Minimization
```typescript
// Only update changed tracks
setTracks(prev => prev.map(track =>
  track.id === trackId 
    ? { ...track, midiClip: newData }
    : track  // Reuse unchanged track objects
));
```

## Extension Points

### Adding New Features

**Custom Synthesizers**:
```typescript
// In audioEngine.ts
function setSynthType(trackId: string, type: "piano" | "bass" | "lead") {
  const oldSynth = synthMap.get(trackId);
  oldSynth?.dispose();
  
  const newSynth = createSynthOfType(type);
  synthMap.set(trackId, newSynth);
}
```

**Multiple Clips Per Track**:
```typescript
// In midiTypes.ts
interface Track {
  // ... existing fields
  clips: MidiClipData[];  // Array instead of single clip
}
```

**Effects Chain**:
```typescript
// In audioEngine.ts
function getSynthForTrack(trackId: string) {
  const synth = new Tone.PolySynth(...);
  const reverb = new Tone.Reverb(...);
  const delay = new Tone.FeedbackDelay(...);
  
  synth.connect(reverb);
  reverb.connect(delay);
  delay.toDestination();
  
  return synth;
}
```

## Testing Strategy

### Manual Testing
1. Click interactions (add/remove notes)
2. Playback (start/stop/loop)
3. Mute/solo (track control)
4. State persistence (refresh page)

### Integration Points to Test
- MidiClip → Timeline → DawShell (state updates)
- Timeline → audioEngine (sound generation)
- TransportBar → audioEngine → Timeline (playback sync)

## Browser Compatibility

### Web Audio API Requirements
- Chrome 35+ ✅
- Firefox 25+ ✅
- Safari 14+ ✅
- Edge 79+ ✅

### Tone.js Requirements
- ES6 module support
- Web Audio API
- User gesture for audio context (handled by Play button)

---

This architecture provides a solid foundation for a web-based DAW with room for extensive future enhancements! 🎵

