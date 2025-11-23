# Piano Roll Time Format Fix

## Problem

Notes placed in the piano roll were playing at incorrect times, with the issue being most noticeable for notes that don't fall exactly on the first beat of a bar (i.e., notes with decimal `start` values).

### Example

- Note at `start = 3.0` (bar 4, beat 1): Plays correctly ✓
- Note at `start = 3.0625` (bar 4, first 16th note after beat 1): Plays incorrectly ✗

## Root Cause

The issue was in how decimal time values were being passed to Tone.js:

**Before:**

```typescript
const events = clipData.notes.map((note: MidiNote) => ({
  time: `${note.start}m`, // e.g., "3.0625m"
  duration: `${note.duration}m`,
  ...
}));
```

Tone.js's `"m"` notation (measures) doesn't reliably handle decimal values like `"3.0625m"`. While integer measures work fine (`"3m"`), decimal measures can cause scheduling issues.

## Solution

Convert decimal bar positions to Tone.js's **bars:quarters:sixteenths** notation:

```typescript
// Convert 3.0625 bars to "3:0:1" (3 bars, 0 quarters, 1 sixteenth)
const bars = Math.floor(note.start);
const remainderBars = note.start - bars;
const quarters = Math.floor(remainderBars * 4);
const remainderQuarters = remainderBars * 4 - quarters;
const sixteenths = Math.round(remainderQuarters * 4);
const time = `${bars}:${quarters}:${sixteenths}`;
```

### Conversion Examples

| Decimal Start | Calculation                            | Time Format | Meaning                      |
| ------------- | -------------------------------------- | ----------- | ---------------------------- |
| 0.0           | 0:0:0                                  | `"0:0:0"`   | Bar 1, beat 1                |
| 0.25          | 0 + (0.25 × 4) = 0 + 1 quarter         | `"0:1:0"`   | Bar 1, beat 2                |
| 0.0625        | 0 + (0.0625 × 4 × 4) = 0 + 1 sixteenth | `"0:0:1"`   | Bar 1, 1st 16th note         |
| 1.0           | 1:0:0                                  | `"1:0:0"`   | Bar 2, beat 1                |
| 3.0           | 3:0:0                                  | `"3:0:0"`   | Bar 4, beat 1                |
| 3.0625        | 3 + 0.25 sixteenths                    | `"3:0:1"`   | Bar 4, 1st 16th after beat 1 |
| 3.125         | 3 + 0.5 quarters                       | `"3:0:2"`   | Bar 4, 2nd 16th after beat 1 |
| 3.25          | 3 + 1 quarter                          | `"3:1:0"`   | Bar 4, beat 2                |

## Implementation

**File:** `my-app/lib/audioEngine.ts`

### Time Conversion Logic

```typescript
// For note start position
const bars = Math.floor(note.start);
const remainderBars = note.start - bars;
const quarters = Math.floor(remainderBars * 4); // 4 quarter notes per bar
const remainderQuarters = remainderBars * 4 - quarters;
const sixteenths = Math.round(remainderQuarters * 4); // 4 sixteenth notes per quarter
const time = `${bars}:${quarters}:${sixteenths}`;

// Same logic for duration
```

### Why This Works

1. **Bars:** Floor division extracts the whole bar number
2. **Quarters:** Multiply remainder by 4 (quarters per bar), floor to get whole quarters
3. **Sixteenths:** Multiply quarter remainder by 4, round to get sixteenths

This converts our decimal notation (where 1 unit = 1 bar) to Tone.js's notation (bars:quarters:sixteenths).

## Testing

To verify the fix works:

1. Open browser console (F12)
2. Create a MIDI clip
3. Place notes at various positions in the piano roll
4. Check console output shows correct conversions:

```
Note conversion: start=3.0 → time="3:0:0", duration=0.0625 → "0:0:1"
Note conversion: start=3.0625 → time="3:0:1", duration=0.0625 → "0:0:1"
Note conversion: start=3.125 → time="3:0:2", duration=0.0625 → "0:0:1"
```

5. Play the clip and verify notes play at correct positions

## Why Decimal Measures Failed

Tone.js's `"m"` notation is primarily designed for whole measures. When you pass `"3.0625m"`, Tone.js may:

- Round or truncate the decimal
- Interpret it relative to a different time base
- Cause floating-point precision issues

The `bars:quarters:sixteenths` format is unambiguous and handles fractional positions correctly.

## Benefits

1. ✅ **Precise timing** for all note positions
2. ✅ **Works with 16th note grid** (GRID_DIVISIONS = 16)
3. ✅ **No floating-point precision issues**
4. ✅ **Standard Tone.js notation**
5. ✅ **Consistent with how musicians think** (bars and beats)

## Notes

- Console logging is included for debugging and can be removed once verified
- The same conversion is applied to both `time` and `duration`
- The fix maintains backward compatibility with existing clips
- All note positions are still stored as decimal bars in the data model (only converted when scheduling audio)
