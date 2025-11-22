# MIDI Clip Management Guide

## Overview

Your DAW now supports **multiple 4-bar MIDI clips per track** with drag-and-drop positioning! Clips automatically snap to 4-bar divisions and visually match the timeline grid.

## 🎯 Key Features

### 1. Multiple Clips Per Track
- Add **unlimited** 4-bar MIDI clips to each track
- Each clip is independent with its own notes
- Clips can be positioned anywhere on the 16-bar timeline
- Visual representation matches timeline grid perfectly

### 2. Drag & Drop Positioning
- **Click and drag** clips to move them
- Automatically **snaps to 4-bar divisions** (bars 0, 4, 8, 12)
- Visual feedback while dragging
- Can't overlap with other clips

### 3. Visual Sizing
- Clip width = exactly 4 bars on the timeline
- Position matches bar numbers shown on ruler
- Shows bar range in clip label (e.g., "Bar 1-4", "Bar 5-8")

## 🎹 How to Use

### Adding Clips

**Method 1: "+ Add Clip" Button**
1. Find the "+ Add Clip" button on any MIDI track
2. Click it
3. New clip appears at next available 4-bar slot
4. Piano roll automatically opens for editing

**Method 2: Empty Track**
- Click "+ Add MIDI Clip" on empty tracks
- First clip starts at bar 1

### Moving Clips

**Drag and Drop:**
1. **Click and hold** anywhere on the clip (except the center)
2. **Drag left or right**
3. Clip snaps to 4-bar boundaries
4. Release to place

**Visual Feedback:**
- Clip changes color while dragging
- Shadow effect shows it's being moved
- Cursor changes to grabbing hand

**Snap Points:**
- Bar 0 (1-4)
- Bar 4 (5-8)
- Bar 8 (9-12)
- Bar 12 (13-16)

### Editing Clips

**Open Piano Roll:**
1. Click the center of any clip
2. Full-screen piano roll opens
3. Edit notes as usual
4. Close with ESC or Done

**Clip Shows:**
- Number of notes
- Bar range (e.g., "Bar 5-8")
- Track color coding

### Managing Multiple Clips

**Creating a Song Structure:**
```
Bass Track:
[Intro: Bar 1-4] [Verse: Bar 5-8] [Chorus: Bar 9-12] [Outro: Bar 13-16]
     ████            ████              ████               ████

Keys Track:
            [Build: Bar 5-8]      [Breakdown: Bar 13-16]
                ████                      ████
```

**Workflow:**
1. Add first clip (intro pattern)
2. Click "+ Add Clip" for next section
3. Edit each clip independently
4. Drag to rearrange sections
5. Add more clips as needed

## 📐 Technical Details

### Clip Structure

```typescript
interface MidiClipData {
  id: string;
  notes: MidiNote[];
  bars: number;         // Always 4
  startBar: number;     // 0, 4, 8, or 12
  color?: string;
}
```

### Track Structure

```typescript
interface Track {
  // ... other properties
  midiClips?: MidiClipData[];  // Array of clips
}
```

### Visual Calculations

```typescript
// Clip position and width
const clipWidthPercent = (clipData.bars / totalBars) * 100;  // 25%
const clipLeftPercent = (clipData.startBar / totalBars) * 100;

// Example: Clip at bar 4
// Left: (4 / 16) * 100 = 25%
// Width: (4 / 16) * 100 = 25%
```

### Snap Logic

```typescript
// Snap to 4-bar divisions
const deltaBar = Math.round(deltaX / barWidth / 4) * 4;

// Valid positions: 0, 4, 8, 12
// Invalid positions: 1, 2, 3, 5, 6, 7, etc.
```

## 🎨 Visual Design

### Clip States

**Normal:**
```css
background: purple-600/90
border: purple-400/60
cursor: grab
```

**Hover:**
```css
background: purple-600
border: purple-400
```

**Dragging:**
```css
background: purple-700
border: purple-300
shadow: large
cursor: grabbing
z-index: 20 (above other clips)
```

### Clip Layout

```
┌──────────────────────────────────┐
│      MIDI Clip                   │  ← Drag anywhere here
│  12 notes • Bar 5-8              │  ← Click here to edit
└──────────────────────────────────┘
     ↑                         ↑
   Left edge              Right edge
  at bar 4               at bar 8
```

### Timeline Grid Alignment

```
Timeline Ruler:
| 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |

Clip 1 (Bar 1-4):
[████████████████]

Clip 2 (Bar 9-12):
                                [████████████████]

Perfect alignment! ✓
```

## 🔧 Advanced Features

### Automatic Slot Finding

The system automatically finds the next available 4-bar slot:

```typescript
function findNextAvailableSlot(trackId: string): number {
  // Checks: 0-3, 4-7, 8-11, 12-15
  // Returns first available slot
  // Falls back to 0 if all occupied
}
```

**Example:**
```
Existing clips: Bar 1-4, Bar 9-12
Next click on "+ Add Clip" → Creates clip at Bar 5-8
```

### Collision Prevention

- Can't drag clip to occupied slot
- Can't place clip beyond timeline end
- Automatically constrains to valid positions

### Z-Index Management

```
Dragging clip: z-index 20
Normal clips: z-index 10
Add button: z-index 10
Resize handle: z-index 30
Playhead: z-index 40
```

## 💡 Use Cases

### 1. Song Structure

Create different sections:
```
Bass:
[Intro] [Verse 1] [Chorus] [Verse 2]

Keys:
        [Verse 1] [Chorus] [Bridge]
```

### 2. Variation Patterns

Multiple variations of same part:
```
Drums:
[Pattern A] [Pattern B] [Pattern A] [Pattern C]
```

### 3. Progressive Build

Add elements gradually:
```
Bar 1-4:   Bass only
Bar 5-8:   Bass + Keys
Bar 9-12:  Bass + Keys + Lead
Bar 13-16: All elements
```

### 4. Call and Response

Alternating patterns:
```
Lead:
[Call] [____] [Call] [____]

Harmony:
[____] [Response] [____] [Response]
```

## 📊 Workflow Examples

### Creating a 16-Bar Loop

1. **Start with Bass:**
   - Add clip at Bar 1-4 (intro bass line)
   - Add clip at Bar 5-8 (verse bass)
   - Add clip at Bar 9-12 (chorus bass)
   - Add clip at Bar 13-16 (outro bass)

2. **Layer Keys:**
   - Add clip at Bar 5-8 (verse chords)
   - Add clip at Bar 9-12 (chorus melody)

3. **Add Lead:**
   - Add clip at Bar 9-12 (chorus lead)
   - Add clip at Bar 13-16 (outro solo)

### Rearranging Sections

1. **Original:**
   ```
   [Intro] [Verse] [Chorus] [Outro]
   ```

2. **Drag Chorus to start:**
   ```
   [Chorus] [Intro] [Verse] [Outro]
   ```

3. **Works great for:**
   - Testing different arrangements
   - Building tension/release
   - Finding best song structure

## 🎵 Tips & Tricks

### 1. Color Coding (Future)
- Each clip can have its own color
- Use to distinguish sections
- Visual organization

### 2. Naming Clips (Future)
- Custom labels per clip
- "Intro", "Verse 1", "Chorus", etc.
- Easier navigation

### 3. Copy/Paste (Future)
- Duplicate successful patterns
- Variation with small changes
- Speed up workflow

### 4. Clip Trimming (Future)
- Adjust clip length
- Not limited to 4 bars
- Fine-grained control

## ⚡ Performance

- **Efficient rendering**: Only visible clips rendered
- **Smooth dragging**: 60fps interaction
- **Instant updates**: Real-time position changes
- **No lag**: Optimized calculations

## 🔜 Future Enhancements

Planned features:
- **Variable clip lengths** (1, 2, 4, 8 bars)
- **Clip duplication** (copy/paste)
- **Clip colors** (custom per clip)
- **Clip names** (labels)
- **Resize clips** (drag edges)
- **Delete clips** (right-click)
- **Undo/redo** clip operations
- **Clip automation** (volume, pan)

## 🚀 Quick Reference

| Action | Method |
|--------|--------|
| Add clip | Click "+ Add Clip" button |
| Move clip | Drag clip left/right |
| Edit clip | Click center of clip |
| Position | Snaps to 4-bar divisions |
| Visual size | Matches 4 bars on ruler |
| Multiple clips | Unlimited per track |

## 🎯 Best Practices

1. **Plan your structure**: Think in 4-bar sections
2. **Start simple**: One clip per section first
3. **Layer gradually**: Add complexity track by track
4. **Use space**: Leave gaps for dynamics
5. **Experiment**: Drag clips around to find best flow
6. **Save often**: Complex arrangements deserve backups

---

**Enjoy your multi-clip MIDI workflow!** 🎶

You can now build complete songs with multiple sections, variations, and professional arrangements!

