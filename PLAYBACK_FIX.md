# Playback System Fix - Sequential Timeline Playback

## Problem Fixed

**Before:** Each MIDI clip looped independently, causing overlapping playback and incorrect timing.

**After:** Clips play sequentially across the full 16-bar timeline, with silence where no clips exist.

## 🎯 How It Works Now

### Timeline Playback Behavior

```
16-Bar Loop:
|--Bar 1-4--|--Bar 5-8--|--Bar 9-12--|--Bar 13-16--|
   Clip 1       Silent      Clip 2        Silent

Playback Order:
1. Bar 0-4: Play Clip 1
2. Bar 4-8: Silent (no clip)
3. Bar 8-12: Play Clip 2
4. Bar 12-16: Silent (no clip)
5. Loop back to Bar 0
```

### Key Changes

1. **No More Independent Looping**

   - Each clip plays ONCE per 16-bar cycle
   - Clips don't loop independently
   - Transport loop handles the repeat

2. **Correct Timeline Positioning**

   - Clips scheduled at their `startBar` position
   - Stop playing at `startBar + bars` position
   - Playhead matches actual audio playback

3. **Sequential Playback**
   - Clips play in timeline order
   - Silence between clips is preserved
   - Full song structure maintained

## 🔧 Technical Implementation

### Audio Engine Changes

**Before:**

```typescript
// Old: Each clip looped independently
part.loop = true;
part.loopStart = 0;
part.loopEnd = `${clipData.bars}m`;
part.start(0); // Always started at 0
```

**After:**

```typescript
// New: No loop, positioned in timeline
part.loop = false; // Let transport handle looping
part.start(`${clipData.startBar}m`); // Start at clip position
part.stop(`${clipData.startBar + clipData.bars}m`); // Stop after duration
```

### Function Signature Change

**Old:**

```typescript
updateMidiPart(trackId: string, clipData: MidiClipData | null)
// Only handled single clip at a time
```

**New:**

```typescript
updateMidiParts(trackId: string, clips: MidiClipData[] | null)
// Handles all clips for a track at once
// Schedules each at correct timeline position
```

### Scheduling Example

For a track with clips at Bar 0-4 and Bar 8-12:

```typescript
// Clip 1: Bars 0-4
const part1 = new Tone.Part(callback, events1);
part1.loop = false;
part1.start('0m'); // Start at bar 0
part1.stop('4m'); // Stop at bar 4

// Clip 2: Bars 8-12
const part2 = new Tone.Part(callback, events2);
part2.loop = false;
part2.start('8m'); // Start at bar 8
part2.stop('12m'); // Stop at bar 12

// Transport loops from 0-16 bars
transport.loopStart = 0;
transport.loopEnd = '16m';
```

## 🎼 Playback Timeline

### Example Song Structure

```
Timeline (16 bars total):
├── Bar 0-4:   Bass Clip 1 (Intro)     🎵
├── Bar 4-8:   Silent                  🔇
├── Bar 8-12:  Bass Clip 2 (Verse)     🎵
└── Bar 12-16: Silent                  🔇
     ↓ (loops back to Bar 0)

Keys Track:
├── Bar 0-4:   Silent                  🔇
├── Bar 4-8:   Keys Clip 1 (Build)     🎵
├── Bar 8-12:  Keys Clip 2 (Drop)      🎵
└── Bar 12-16: Silent                  🔇
```

### Playback Sequence

**First Loop (0-16 bars):**

- 0-4: Bass plays
- 4-8: Keys plays, Bass silent
- 8-12: Both play together
- 12-16: Both silent

**Second Loop (16-32 bars):**

- Same pattern repeats exactly

## 🎯 Key Benefits

### 1. Predictable Timing

- ✅ Playhead position = actual audio position
- ✅ Notes trigger at visual positions
- ✅ No timing drift or misalignment

### 2. Song Structure

- ✅ Create intros, verses, choruses, outros
- ✅ Silence is preserved (for breaks/fills)
- ✅ Build tension with sparse arrangements

### 3. Arrangement Flexibility

- ✅ Drag clips to rearrange song
- ✅ Visual timeline matches audio
- ✅ Easy to see what plays when

## 📊 Before vs After

### Playback Behavior

**Before:**

```
Clip 1 (Bar 0-4): 🔁🔁🔁🔁 (looping constantly)
Clip 2 (Bar 8-12): 🔁🔁🔁🔁 (looping constantly)
Result: Overlapping chaos ❌
```

**After:**

```
Bar 0-4:   Clip 1 🎵____
Bar 4-8:   Silent ____
Bar 8-12:  Clip 2 ____🎵
Bar 12-16: Silent ____
→ Loop back to Bar 0
Result: Sequential playback ✅
```

### Playhead Accuracy

**Before:**

```
Visual playhead: Bar 6
Actual audio: Clip 1 at Bar 2 (looping)
Mismatch! ❌
```

**After:**

```
Visual playhead: Bar 6
Actual audio: Silent (no clip at Bar 6)
Perfect match! ✅
```

## 🔄 Update Triggers

The audio engine reschedules clips when:

1. **Clip Edited**

   - Notes added/removed
   - All clips for track rescheduled
   - Maintains positions

2. **Clip Moved**

   - New `startBar` position
   - All clips for track rescheduled
   - Updates timing immediately

3. **Clip Added/Removed**
   - Track clip array changes
   - Full rescheduling
   - No gaps in logic

## 💡 Usage Examples

### Example 1: Intro → Verse → Chorus

```typescript
// Bass track clips:
[
  { startBar: 0, bars: 4, notes: [...introPattern] },
  { startBar: 4, bars: 4, notes: [...versePattern] },
  { startBar: 8, bars: 4, notes: [...chorusPattern] },
];

// Playback:
// 0-4: Intro bass plays
// 4-8: Verse bass plays
// 8-12: Chorus bass plays
// 12-16: Silent
// → Loop
```

### Example 2: Sparse Arrangement

```typescript
// Keys track clips:
[
  { startBar: 4, bars: 4, notes: [...chords] },
  { startBar: 12, bars: 4, notes: [...melody] },
];

// Playback:
// 0-4: Silent (tension)
// 4-8: Chords enter
// 8-12: Silent (breakdown)
// 12-16: Melody finale
// → Loop
```

### Example 3: Dense Section

```typescript
// All tracks have clips at Bar 8-12:
Bass: { startBar: 8, bars: 4 }
Keys: { startBar: 8, bars: 4 }
Lead: { startBar: 8, bars: 4 }

// Playback:
// 0-8: Build up (sparse)
// 8-12: DROP (all instruments) 🔊
// 12-16: Wind down
// → Loop
```

## 🎛️ Developer Notes

### Part Management

```typescript
// Each track stores an array of Tone.Part instances
const midiPartMap = new Map<string, Tone.Part[]>();

// When updating:
1. Dispose all existing parts for track
2. Create new part for each clip
3. Schedule at clip.startBar position
4. Store in array
```

### Timing Precision

- Uses Tone.js musical time notation: `"4m"` = 4 bars
- Scheduling happens before playback starts
- Transport loop handles repetition
- No manual looping needed

### Memory Management

- Old parts properly disposed before creating new ones
- No memory leaks
- Clean state management

## ✅ Testing Checklist

Test these scenarios:

1. **Single clip plays at correct position** ✓
2. **Multiple clips play sequentially** ✓
3. **Silence between clips is preserved** ✓
4. **Playhead matches audio position** ✓
5. **Moving clip updates timing** ✓
6. **Editing clip updates content** ✓
7. **Full 16-bar loop works** ✓
8. **Empty sections stay silent** ✓

## 🚀 Performance

- **Efficient**: Parts scheduled once, not re-calculated
- **Precise**: Uses Tone.js internal clock
- **Smooth**: No audio glitches or gaps
- **Scalable**: Works with any number of clips

---

**Result:** Professional DAW-like playback with accurate timing and visual feedback! 🎵
