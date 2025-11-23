# Quick Start Guide - MIDI Features

## 🎵 Get Started in 3 Minutes

### Step 1: Start the DAW

```bash
cd my-app
npm run dev
```

Open http://localhost:3000/daw

### Step 2: Play the Demo

1. Click the green **"Play"** button in the top bar
2. You'll hear a C major chord progression from the Bass track
3. Watch the green playhead move across the timeline

### Step 3: Create Your First MIDI Pattern

1. **Open the Piano Roll**:

   - Find the "Keys" track (purple, third track)
   - Click on the purple "MIDI Clip" button
   - A full-screen piano roll editor will open as an overlay

2. **Add Some Notes**:

   - **Click and drag** on the grid to create notes
   - Hold the mouse button and drag right to set note length
   - Try creating these notes for a simple melody:
     - Click-drag on "C4" (middle of keyboard) for 4 cells (quarter note)
     - Click-drag on "E4" (3 keys up) for 4 cells
     - Click-drag on "G4" (3 keys up) for 4 cells
     - Click-drag on "C5" (4 keys up) for 4 cells
   - You'll hear a preview when you release!

3. **Play Your Composition**:
   - Click **"Done"** or press **ESC** to close the piano roll
   - Click **"Play"** to listen to your melody with the Bass

### Step 4: Experiment

**Remove notes**: Right-click any note, or select it and press Delete  
**Change length**: Delete and recreate with different drag length  
**Select note**: Left-click to select (turns yellow), shows details  
**Clear all**: Click the "Clear All" button to start fresh (with confirmation)  
**Mute tracks**: Click the **M** button on any track to silence it  
**Close piano roll**: Click "Done" button or press ESC

## 🎹 Piano Roll Layout (Full-Screen Overlay)

```
┌────────────────────────────────────────────┐
│ 🟣 Track Name  | Clear All | Done          │
├────────────────────────────────────────────┤
│ NOTE │  1    2    3    4    (Bar numbers)  │
├──────┼────────────────────────────────────┤
│  B5  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  A5  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ... │ ░░░░█████░░░░░░░█████░░░░░░░░░░░░  │ ← Notes
│  C4  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ... │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  C2  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
└────────────────────────────────────────────┘
        ↑ Click piano   ↑ Click grid to
          keys to         add/remove notes
          preview
```

## 🎛️ Controls

**Transport Bar** (top):

- **Play/Stop**: Start/stop playback
- **Position**: Shows current bar.beat.sixteenth
- **BPM**: Tempo (default: 120)

**Track List** (left sidebar):

- **Track name**: Click to select
- **M button**: Mute (red when active)
- **S button**: Solo (yellow when active)
- **Type badge**: AUDIO or MIDI

**Timeline** (center):

- **Numbered bars**: 1-16 bars shown
- **Colored clips**: Click MIDI clips to edit
- **Green playhead**: Shows current position

**Piano Roll** (overlay):

- **Click & drag**: Create notes with custom length
- **Right-click note**: Delete note
- **Left-click note**: Select note (shows details)
- **Delete key**: Remove selected note
- **Hover note**: Preview sound
- **ESC key**: Close editor

## 💡 Tips

1. **No sound?** Make sure your browser allows audio. Try clicking Play twice.
2. **Can't see piano roll?** Click the purple "MIDI Clip" button to open the overlay
3. **Wrong pitch?** Remember: higher on the grid = higher pitch
4. **Timing off?** Each column is a 16th note (4 columns = 1 beat)
5. **Note length**: Drag farther right for longer notes
6. **Quick delete**: Right-click any note to remove it instantly
7. **Quick close**: Press ESC to close the piano roll anytime

## 🎼 Try These Patterns

### Simple Bass Line

On the "Bass" or "Keys" track, create:

- C3 at beat 1 (bottom of keyboard)
- C3 at beat 2.5
- F3 at beat 3
- G3 at beat 4

### Chord Stabs

Stack notes vertically:

- C4, E4, G4 all at beat 1 (C major chord)
- D4, F4, A4 all at beat 3 (D minor chord)

### Melody

Use the top half of the keyboard:

- G4 → A4 → B4 → C5 → B4 → A4 → G4 → G4

## 📚 Want More?

- See `NOTE_EDITING_GUIDE.md` for advanced editing techniques
- See `PIANO_ROLL_OVERLAY.md` for piano roll details
- See `MIDI_FEATURES.md` for full documentation
- See `IMPLEMENTATION_SUMMARY.md` for technical details
- Check the code in `components/daw/PianoRollModal.tsx` to customize

Happy composing! 🎶
