# Note Editing Guide - Advanced MIDI Features

## Overview

Your piano roll editor now supports **advanced note editing** with click-and-drag creation, custom note lengths, and multiple deletion methods!

## 🎹 New Features

### 1. Click & Drag to Create Notes

**How it works:**
- Click on an empty grid cell and **hold** the mouse button
- Drag horizontally to set the note length
- Release to finalize the note
- The note will snap to 16th note increments

**Visual Feedback:**
- As you drag, the note expands in real-time
- You'll hear a preview when you release
- The note appears in green with its duration shown

**Example:**
```
Click here → [░] and drag right → [█][█][█][█]
           Start                    Release here
           
Result: One note spanning 4 16th notes (quarter note)
```

### 2. Multiple Ways to Delete Notes

#### Method 1: Right-Click (Recommended)
- **Right-click** any note to delete it instantly
- No selection needed
- Quick and precise

#### Method 2: Select + Delete Key
1. **Left-click** a note to select it (turns yellow)
2. Press **Delete** or **Backspace** key
3. Note is removed

#### Method 3: Clear All Button
- Click **"Clear All"** in the header
- Confirmation dialog appears
- All notes removed at once

### 3. Note Selection

**Selecting Notes:**
- **Left-click** any note to select it
- Selected notes turn **yellow**
- Note name and duration display on the note
- Only one note can be selected at a time

**Why Select?**
- Visual identification of the note
- Shows note details (pitch and duration)
- Required for keyboard deletion

### 4. Visual Feedback

**Note States:**
- **Green** = Normal note
- **Yellow** = Selected note
- **Lighter green** = Hover state
- **Opacity** = Velocity (louder = more opaque)

**Note Information:**
- **Hover**: Shows note name (e.g., "C4")
- **Selected**: Shows note name + duration (e.g., "C4 | 0.25b")

## 📋 Complete Interaction Guide

### Creating Notes

| Action | Result |
|--------|--------|
| Click empty cell | Start drawing |
| Drag right while holding | Extend note length |
| Release mouse | Finalize note |
| Drag to same cell | Creates 1/16th note (shortest) |
| Drag across multiple cells | Creates longer note |

**Tips:**
- Hold the mouse button down while dragging
- Stay on the same piano key row (don't drag up/down)
- Release outside the grid cancels the note
- Each cell = 1/16th note (16 cells = 1 bar)

### Deleting Notes

| Method | Steps | Best For |
|--------|-------|----------|
| Right-click | Right-click note | Quick deletion |
| Delete key | 1. Click note<br>2. Press Delete/Backspace | Keyboard workflow |
| Clear All | Click "Clear All" button | Starting fresh |

### Selecting Notes

| Action | Result |
|--------|--------|
| Left-click note | Select (turns yellow) |
| Click another note | Select that one instead |
| Click empty space | Deselect (when drawing) |
| Delete/Backspace | Delete selected note |

### Previewing Sound

| Action | Result |
|--------|--------|
| Hover over note | Preview sound |
| Click piano key (left sidebar) | Preview that pitch |
| Release after drawing | Preview created note |

## 🎼 Common Workflows

### Creating a Melody

1. **Quarter Notes:**
   - Click and drag across 4 cells (1 beat)
   - Repeat for each note in melody

2. **Eighth Notes:**
   - Click and drag across 2 cells (half beat)
   - Faster, more rhythmic

3. **Whole Notes:**
   - Click and drag across 16 cells (1 bar)
   - Long, sustained notes

### Creating Chords

1. Click-drag to create first note (e.g., C4)
2. Click-drag same length on E4 (3 keys up)
3. Click-drag same length on G4 (3 keys up)
4. Result: C major chord

**Pro Tip:** Create them at the same start position for a tight chord!

### Editing Existing Patterns

**To change a note:**
1. Right-click to delete it
2. Click-drag to create new note at desired length

**To adjust length:**
1. Delete the note
2. Recreate it with different drag length

**To transpose (change pitch):**
1. Delete the note
2. Recreate it on a different piano key

## 🎯 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **ESC** | Close piano roll |
| **Delete** | Remove selected note |
| **Backspace** | Remove selected note (same as Delete) |

## 💡 Tips & Tricks

### Creating Precise Lengths

**16th notes (1 cell):**
- Click and release immediately
- Or click-drag to same cell

**8th notes (2 cells):**
- Drag across 2 cells
- Common for faster rhythms

**Quarter notes (4 cells):**
- Drag across 4 cells
- Standard beat length

**Half notes (8 cells):**
- Drag across 8 cells
- Two beats

**Whole notes (16 cells):**
- Drag across entire bar
- Very long notes

### Grid Divisions Reference

```
| 1   | 2   | 3   | 4   |  (Beats)
|-----|-----|-----|-----|
[16 16th notes per bar]

Each cell = 1/16th note
4 cells = 1 quarter note (1 beat)
16 cells = 1 whole note (1 bar)
```

### Working with Selection

1. **Inspect before deleting:**
   - Click to select (yellow)
   - Check note name and duration
   - Press Delete if it's the one you want

2. **Quick deletion:**
   - Right-click for instant removal
   - No selection step needed

### Visual Cues

**Check the note label:**
- Shows pitch name when selected or on hover
- Shows duration when selected (e.g., "0.25b" = quarter bar)

**Note opacity:**
- All notes currently have same velocity (0.8)
- Future: adjust opacity for volume

## 🔧 Technical Details

### Note Lengths

Notes snap to 16th note increments:
- Minimum: 0.0625 bars (1/16)
- Maximum: 4 bars (entire clip)

### Grid Resolution

- **Horizontal**: 16 cells per bar
- **Vertical**: 48 piano keys (C2-B5)
- **Snap**: Always snaps to 16th notes

### Drawing Behavior

```
Mouse Down → Start drawing at click position
Mouse Move → Update note length in real-time
Mouse Up   → Finalize note and preview sound
Mouse Leave Grid → Cancel drawing
```

### Selection Behavior

- Only one note can be selected at once
- Selection persists until another note is clicked
- Right-click doesn't require selection
- Clicking empty space while drawing doesn't deselect

## 🎨 Visual States

### Note Colors

```css
Normal:   Green (#10b981 - emerald-500)
Selected: Yellow (#eab308 - yellow-500)
Hover:    Light green (#34d399 - emerald-400)
```

### Note Information Display

```
┌─────────────────┐
│ C4        0.25b │  ← Selected note shows both
└─────────────────┘

┌─────────────────┐
│ D4              │  ← Hover shows only note name
└─────────────────┘
```

## 🚀 Future Enhancements

Coming soon:
- **Drag to move notes** (position in time/pitch)
- **Resize by dragging edges** (adjust start/end)
- **Velocity editing** (click-drag up/down for volume)
- **Multi-select** (Shift+click for multiple notes)
- **Copy/paste** (Duplicate patterns)
- **Quantize** (Auto-align to grid)

## ❓ Troubleshooting

**Note won't create:**
- Make sure you're dragging on the same piano key row
- Check you're not starting on an existing note
- Try clicking and holding before dragging

**Can't delete note:**
- Try right-clicking directly on the note
- Or select it (click) then press Delete key
- Make sure note is visible and not behind another

**Note is too short:**
- Drag farther to the right before releasing
- Minimum length is 1 cell (1/16th note)

**Note length jumps:**
- This is normal - notes snap to 16th note grid
- Can't create notes between cells (by design)

**Drawing cancelled:**
- This happens if you drag outside the grid
- Keep mouse inside the grid area while dragging

## 📊 Examples by Use Case

### Fast Drum Pattern
```
Kick:  █░░░█░░░█░░░█░░░  (Quarter notes)
Snare: ░░░░█░░░░░░░█░░░  (Backbeat)
HH:    ██████████████  (8th notes)
```
Create with: Short drags (2 cells for HH, 4 for kick)

### Sustained Pad
```
Chord: ████████████████  (Whole note)
       ████████████████  (All keys at once)
       ████████████████
```
Create with: Long drag across 16 cells, multiple keys

### Melodic Line
```
Notes: █░█░█░░░█░░░█░█░  (Mixed rhythms)
```
Create with: Varying drag lengths for rhythm

---

**Enjoy your enhanced piano roll editor!** 🎵

The new click-drag system makes creating musical patterns fast and intuitive. Experiment with different note lengths to create interesting rhythms!

