# MIDI Features Documentation

## Overview

Your DAW now supports creating and playing back 4-bar MIDI sequences with a built-in synthesizer! This system allows you to compose music directly in the browser using an interactive piano roll editor.

## Features Implemented

### 1. **MIDI Data Structure** (`lib/midiTypes.ts`)

- **MidiNote**: Represents individual notes with pitch (0-127), start time, duration, and velocity
- **MidiClipData**: Contains a collection of MIDI notes spanning 4 bars
- **Track**: Supports both "audio" and "midi" track types
- Utility functions for note name conversion (e.g., "C4" to MIDI number 60)

### 2. **Audio Engine with Synthesizer** (`lib/audioEngine.ts`)

Enhanced with:

- **PolySynth**: Professional synthesizer that can play multiple notes simultaneously
- **updateMidiPart()**: Schedules MIDI notes for playback synchronized with the transport
- **previewNote()**: Plays individual notes for real-time feedback
- **Track muting and volume control**: Full mixer capabilities for MIDI tracks
- Automatic looping within 4-bar clips

### 3. **Piano Roll Editor** (`components/daw/MidiClip.tsx`)

Interactive MIDI editor featuring:

- **24-key piano keyboard** (2 octaves: C3 to B4)
- **16th-note grid** for precise note placement
- **Click to add/remove notes**: Simple mouse interaction
- **Visual feedback**: Notes colored by velocity, hover to preview
- **Collapsible interface**: Toggle piano roll visibility to save space
- **Clear all button**: Quick way to start fresh

### 4. **Track Management**

Updated components:

- **DawShell**: Central state management for all tracks
- **Timeline**: Displays both audio and MIDI clips
- **TrackList**: Shows track type (AUDIO/MIDI), mute/solo controls
- Mute and solo functionality for MIDI tracks

## How to Use

### Creating MIDI Notes

1. **Open the Piano Roll**:

   - Click on any MIDI clip in the timeline to expand the piano roll editor
   - The editor shows a 24-key keyboard (2 octaves) and a grid

2. **Add Notes**:

   - Click anywhere on the grid to place a note
   - Each cell represents a 16th note duration
   - The vertical position determines the pitch (higher = higher pitch)
   - When you click, you'll hear the note preview

3. **Remove Notes**:

   - Click on an existing note (green rectangle) to remove it
   - Or use the "Clear All" button to remove all notes

4. **Edit Your Clip**:
   - Notes are automatically saved
   - Playback updates immediately when you modify notes

### Playing Back MIDI

1. **Click Play** in the transport bar
2. Your MIDI clips will play back through the synthesizer
3. All clips loop seamlessly within the 16-bar timeline
4. Use **Mute/Solo** buttons in the track list to control which tracks play

### Track Controls

- **M (Mute)**: Silences the track (turns red when active)
- **S (Solo)**: Plays only soloed tracks (turns yellow when active)
- Track volume can be controlled (foundation in place)

## Default Setup

The DAW comes with 3 tracks:

1. **Drums** (Audio): Sample waveform track
2. **Bass** (MIDI): Pre-loaded with a demo chord progression
3. **Keys** (MIDI): Empty clip ready for your composition

## Technical Details

### Synthesizer Configuration

- **Oscillator**: Triangle wave for smooth, warm sound
- **Envelope**:
  - Attack: 5ms (quick start)
  - Decay: 100ms
  - Sustain: 0.3 (30% level)
  - Release: 1s (natural fade out)

### Grid Configuration

- **Bars per clip**: 4
- **Time signature**: 4/4
- **Grid resolution**: 16th notes (16 divisions per bar)
- **Piano range**: C3 to B4 (24 notes)

### Synchronization

- All MIDI playback is synchronized with Tone.js Transport
- Notes are scheduled using precise musical time notation ("bars.beats.sixteenths")
- Playback loops automatically at the clip boundaries

## Future Enhancements

Potential improvements:

- **Multiple clips per track**: Add multiple 4-bar clips along the timeline
- **Note velocity editing**: Click and drag to adjust volume
- **Note duration editing**: Resize notes by dragging edges
- **Quantization**: Snap notes to grid automatically
- **Piano roll zoom**: Adjust vertical and horizontal zoom
- **Different synthesizer types**: Choose from various instruments
- **MIDI export**: Save your compositions as MIDI files
- **Recording**: Real-time MIDI input from keyboard/controller
- **Effects**: Reverb, delay, filters for each track
- **Note selection**: Multi-select, copy, paste notes

## Troubleshooting

### No sound when playing:

1. Make sure your browser has audio permissions enabled
2. Check that the track is not muted (M button should not be red)
3. Try clicking "Play" twice to ensure Tone.js audio context starts

### Notes not appearing:

1. Make sure the piano roll is expanded (click the MIDI clip header)
2. Click clearly on the grid cells
3. Check browser console for any errors

### Performance issues:

1. Limit the number of simultaneous notes
2. Close the piano roll when not editing
3. Use fewer tracks if needed

## Code Architecture

```
lib/
├── midiTypes.ts       # Type definitions and utilities
└── audioEngine.ts     # Tone.js integration and playback

components/daw/
├── MidiClip.tsx       # Piano roll editor component
├── Timeline.tsx       # Displays all tracks and clips
├── TrackList.tsx      # Track controls and info
└── DawShell.tsx       # Main container with state management
```

## Example: Creating a Simple Melody

1. Click on the "Keys" track MIDI clip to open piano roll
2. Click on the C4 note at beat 1 (leftmost grid)
3. Click on the E4 note at beat 2 (4 cells to the right)
4. Click on the G4 note at beat 3 (8 cells to the right)
5. Click on the C5 note at beat 4 (12 cells to the right)
6. Click "Play" in the transport to hear your C major arpeggio!

Enjoy creating music in your web-based DAW! 🎵
