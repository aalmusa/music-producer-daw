# Clip Operations Update - Add & Delete

## New Features

Your DAW now has intuitive clip management with **visual add buttons** for each empty 4-bar slot and **right-click deletion**!

## 🎯 What's New

### 1. **Individual Add Buttons per Slot**

**Before:**

- ❌ Single "+ Add Clip" button at track start
- ❌ Unclear where clip would be added
- ❌ No visual indication of empty slots

**After:**

- ✅ Visual + button in each empty 4-bar slot
- ✅ Click exactly where you want the clip
- ✅ Dashed border shows available space
- ✅ Hover effect for feedback

### 2. **Right-Click to Delete**

**Before:**

- ❌ No way to delete clips

**After:**

- ✅ Right-click any clip to delete
- ✅ Confirmation dialog for safety
- ✅ Instant removal with audio engine update

## 🎹 Visual Design

### Empty Slot Button

```
┌─────────────────────────────────┐
│                                 │  Dashed border
│              +                  │  Plus icon
│                                 │  Hover brightens
└─────────────────────────────────┘
  ↑                             ↑
Bar 4                         Bar 8
```

**Styling:**

- Dashed border (shows it's empty)
- Transparent background
- Plus icon centered
- Hover effect (brighter)
- Full 4-bar width
- Positioned exactly in timeline

### Timeline Layout Example

```
Track 1 (Bass):
|--Bar 0-4--|--Bar 4-8--|--Bar 8-12--|--Bar 12-16--|
   [Clip]      [+ Add]     [Clip]       [+ Add]
   ████         ┆┆┆┆        ████          ┆┆┆┆

Track 2 (Keys):
|--Bar 0-4--|--Bar 4-8--|--Bar 8-12--|--Bar 12-16--|
  [+ Add]     [Clip]      [+ Add]      [+ Add]
   ┆┆┆┆         ████         ┆┆┆┆         ┆┆┆┆
```

## 🔧 How It Works

### Adding Clips

**1. Visual Slot Detection:**

```typescript
const getEmptySlots = (trackId: string): number[] => {
  // Get occupied ranges from existing clips
  const occupiedRanges =
    track?.midiClips?.map((clip) => ({
      start: clip.startBar,
      end: clip.startBar + clip.bars,
    })) || [];

  // Check each 4-bar slot (0, 4, 8, 12)
  for (let bar = 0; bar < 16; bar += 4) {
    if (!isOccupied(bar)) {
      emptySlots.push(bar);
    }
  }

  return emptySlots; // [0, 4, 8, 12] minus occupied
};
```

**2. Render Empty Slot Buttons:**

```typescript
{
  getEmptySlots(track.id).map((startBar) => {
    const leftPercent = (startBar / 16) * 100;
    const widthPercent = (4 / 16) * 100; // 25%

    return (
      <button
        style={{
          left: `${leftPercent}%`,
          width: `${widthPercent}%`,
        }}
        onClick={() => handleAddClip(track.id, startBar)}
      >
        + Icon
      </button>
    );
  });
}
```

**3. Add Clip at Position:**

```typescript
const handleAddClip = (trackId: string, startBar: number) => {
  const newClip = createEmptyMidiClip(4, startBar);

  // Add to track
  const updatedClips = [...existingClips, newClip];

  // Update audio engine
  updateMidiParts(trackId, updatedClips);

  // Open piano roll for editing
  openPianoRoll(trackId, newClip.id);
};
```

### Deleting Clips

**1. Right-Click Handler:**

```typescript
const handleContextMenu = (e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();

  if (window.confirm('Delete this MIDI clip?')) {
    onDelete();
  }
};
```

**2. Delete Clip:**

```typescript
const handleDeleteClip = (trackId: string, clipId: string) => {
  // Remove from array
  const updatedClips = track.midiClips.filter((clip) => clip.id !== clipId);

  // Update audio engine (removes scheduled notes)
  updateMidiParts(trackId, updatedClips);

  // Slot now shows + button automatically
};
```

## 📊 User Workflows

### Building a Song Structure

**Step 1: Empty Track**

```
|--Bar 0-4--|--Bar 4-8--|--Bar 8-12--|--Bar 12-16--|
  [+ Add]     [+ Add]     [+ Add]      [+ Add]
```

**Step 2: Add Intro (click first +)**

```
|--Bar 0-4--|--Bar 4-8--|--Bar 8-12--|--Bar 12-16--|
   [Intro]     [+ Add]     [+ Add]      [+ Add]
```

**Step 3: Add Verse (click second +)**

```
|--Bar 0-4--|--Bar 4-8--|--Bar 8-12--|--Bar 12-16--|
   [Intro]     [Verse]     [+ Add]      [+ Add]
```

**Step 4: Add Chorus (click third +)**

```
|--Bar 0-4--|--Bar 4-8--|--Bar 8-12--|--Bar 12-16--|
   [Intro]     [Verse]    [Chorus]     [+ Add]
```

**Step 5: Delete Intro (right-click)**

```
|--Bar 0-4--|--Bar 4-8--|--Bar 8-12--|--Bar 12-16--|
  [+ Add]     [Verse]    [Chorus]     [+ Add]
```

### Creating Variations

**Original Pattern:**

```
Bass: [Pattern A] [Pattern A] [Pattern A] [Pattern A]
```

**Add Variation:**

1. Right-click Pattern A at Bar 8-12
2. Click the new + button
3. Edit to create Pattern B

```
Bass: [Pattern A] [Pattern A] [Pattern B] [Pattern A]
```

### Sparse Arrangement

**Create space for dynamics:**

```
Keys: [Chords] [+ Add] [Melody] [+ Add]
```

Leave empty slots for:

- Tension building
- Breakdowns
- Call and response
- Dynamic contrast

## 🎨 Visual Features

### Empty Slot Button Styling

```css
/* Normal state */
border: dashed 2px rgba(slate-700, 0.5)
background: rgba(slate-800, 0.2)
text-color: slate-600
opacity: 0.5 (icon)

/* Hover state */
border: dashed 2px rgba(slate-600, 0.7)
background: rgba(slate-800, 0.4)
text-color: slate-400
opacity: 1.0 (icon)
```

### Plus Icon

```html
<svg>
  <path d="M12 4v16m8-8H4" />
  <!-- + shape -->
</svg>

Size: 24×24px Stroke width: 2px Centered in button Fades in on hover
```

### Z-Index Layering

```
Grid background: z-0
Empty slot buttons: z-1 (below clips)
MIDI clips: z-10
Dragging clip: z-20
Playhead: z-40
```

## 💡 Smart Slot Detection

### Overlap Prevention

The system checks for overlaps comprehensively:

```typescript
const isOccupied = occupiedRanges.some(
  (range) =>
    (bar >= range.start && bar < range.end) || // Slot starts inside clip
    (slotEnd > range.start && slotEnd <= range.end) || // Slot ends inside clip
    (bar < range.start && slotEnd > range.start) // Slot encompasses clip
);
```

**Example:**

```
Clip at Bar 2-6 (offset, not aligned):

Slot 0-4: Overlaps (ends at 4, clip starts at 2) ❌
Slot 4-8: Overlaps (starts at 4, clip ends at 6) ❌
Slot 8-12: Free ✓
Slot 12-16: Free ✓
```

### Dynamic Updates

Empty slots update automatically when:

- Clip is added → slot disappears
- Clip is deleted → slot appears
- Clip is moved → slots adjust

**Example:**

```
Before move:
[Clip A] [+ Add] [Clip B] [+ Add]

After dragging Clip A to right:
[+ Add] [+ Add] [Clip A] [Clip B]

Slots recalculated instantly!
```

## 🔒 Safety Features

### Deletion Confirmation

```javascript
if (window.confirm('Delete this MIDI clip?')) {
  onDelete();
}
```

**Benefits:**

- Prevents accidental deletion
- Native browser dialog
- Clear action description
- Cancel option available

### Audio Engine Sync

Every operation updates the audio engine:

```typescript
// Add clip
updateMidiParts(trackId, [...clips, newClip]);

// Delete clip
updateMidiParts(
  trackId,
  clips.filter((c) => c.id !== clipId)
);

// Move clip
updateMidiParts(trackId, clips); // With updated startBar
```

**Result:**

- Audio always matches visual
- No orphaned scheduled notes
- Clean state management

## ⚡ Performance

### Efficient Rendering

- Empty slots calculated once per render
- Only visible slots rendered
- SVG icon cached by browser
- Hover effects use CSS transitions

### Minimal Re-renders

```typescript
// Only re-renders affected track
setTracks((prev) =>
  prev.map(
    (track) =>
      track.id === trackId ? { ...track, midiClips: updatedClips } : track // Unchanged tracks reuse reference
  )
);
```

## 🎯 Keyboard Shortcuts (Future)

Planned enhancements:

- **Delete key**: Remove selected clip
- **Cmd/Ctrl + D**: Duplicate clip
- **Cmd/Ctrl + Z**: Undo delete
- **Cmd/Ctrl + Shift + Z**: Redo

## 📱 Interaction Details

### Add Button Click

```
User action: Click empty slot button
↓
handleAddClip(trackId, startBar)
↓
Create new clip at that position
↓
Update audio engine
↓
Open piano roll automatically
↓
User can immediately start adding notes
```

### Right-Click Delete

```
User action: Right-click clip
↓
Confirmation dialog appears
↓
If confirmed:
  Remove clip from array
  Update audio engine
  Slot + button appears
↓
If cancelled:
  No changes
```

## 🎼 Use Case Examples

### Example 1: Progressive Build

```
Step 1: Add intro chords (Bar 0-4)
Step 2: Add verse melody (Bar 4-8)
Step 3: Add chorus lead (Bar 8-12)
Step 4: Add outro (Bar 12-16)

Result: Full 16-bar progression
```

### Example 2: Call and Response

```
Lead track:
[Phrase A] [+ Add] [Phrase A] [+ Add]

Response track:
[+ Add] [Answer] [+ Add] [Answer]

Result: Alternating musical conversation
```

### Example 3: Iteration

```
Start: [Pattern v1] [+ Add] [+ Add] [+ Add]

Test:  [Pattern v1] [Pattern v2] [+ Add] [+ Add]

Refine: [+ Add] [Pattern v3] [Pattern v2] [+ Add]
(Deleted v1, added v3, rearranged)

Final: [Intro] [Pattern v3] [Pattern v2] [Outro]
```

## ✅ Quality of Life

**Before:**

- Unclear where clips would go
- No way to remove mistakes
- Had to reload to reset
- Guesswork for placement

**After:**

- Click exactly where you want
- Remove with right-click
- Iterate quickly
- Visual feedback everywhere

---

**Result:** Professional clip management with intuitive add/delete operations! 🎵
