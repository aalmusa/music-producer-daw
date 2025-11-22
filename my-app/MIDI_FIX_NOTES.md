# MIDI File Generation Fix

## Problem
The generated MIDI files were not opening in Logic Pro (and potentially other DAWs) due to improper MIDI file structure.

## Issues Fixed

### 1. **Improper Buffer Handling**
**Before:** Used string concatenation and `String.fromCharCode()` which can cause encoding issues
```javascript
trackData += String.fromCharCode(0x90 | channel);
```

**After:** Use Node.js Buffer API for proper binary data handling
```javascript
const noteOn = Buffer.alloc(3);
noteOn.writeUInt8(0x90 | channel, 0);
```

### 2. **Incorrect Event Timing**
**Before:** Used a single `lastTime` variable that didn't properly handle overlapping notes
```javascript
lastTime = note.startTime + note.duration; // Wrong for polyphonic music
```

**After:** Sort all events (note on/off) by absolute time, then calculate delta times
```javascript
events.sort((a, b) => a.time - b.time);
const deltaTime = event.time - lastTime;
```

### 3. **Missing Time Signature**
**Before:** No time signature meta event
**After:** Added proper time signature meta event
```javascript
timeSignatureEvent.writeUInt8(0xff, 0); // Meta event
timeSignatureEvent.writeUInt8(0x58, 1); // Time signature
timeSignatureEvent.writeUInt8(numerator, 3);
timeSignatureEvent.writeUInt8(Math.log2(denominator), 4);
```

### 4. **Incorrect MIDI Header**
**Before:** Used string concatenation
**After:** Proper binary header with correct format
```javascript
const header = Buffer.alloc(14);
header.write('MThd', 0);
header.writeUInt32BE(6, 4);        // Header length
header.writeUInt16BE(0, 8);        // Format 0
header.writeUInt16BE(1, 10);       // 1 track
header.writeUInt16BE(480, 12);     // 480 PPQ
```

### 5. **Variable Length Quantity Encoding**
**Before:** Simple implementation with potential byte order issues
```javascript
let buffer = String.fromCharCode(value & 0x7f);
```

**After:** Proper VLQ encoding with Buffer
```javascript
function encodeVariableLengthQuantity(value: number): Buffer {
  const bytes: number[] = [];
  bytes.push(value & 0x7f);
  value >>= 7;
  while (value > 0) {
    bytes.push((value & 0x7f) | 0x80);
    value >>= 7;
  }
  bytes.reverse(); // Big-endian
  return Buffer.from(bytes);
}
```

### 6. **Download Function**
**Before:** Direct blob creation from base64 string
```javascript
const blob = new Blob([atob(midiData)], { type: 'audio/midi' });
```

**After:** Proper binary conversion from base64
```javascript
const binaryString = atob(midiData);
const bytes = new Uint8Array(binaryString.length);
for (let i = 0; i < binaryString.length; i++) {
  bytes[i] = binaryString.charCodeAt(i);
}
const blob = new Blob([bytes], { type: 'audio/midi' });
```

## MIDI File Structure (Now Compliant)

```
┌─────────────────────────────────────┐
│ MIDI Header (MThd)                  │
│ - Chunk ID: "MThd"                  │
│ - Length: 6 bytes                   │
│ - Format: 0 (single track)          │
│ - Tracks: 1                         │
│ - Division: 480 PPQ                 │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│ Track Header (MTrk)                 │
│ - Chunk ID: "MTrk"                  │
│ - Length: [track data length]       │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│ Track Events (sorted by time)       │
│ ┌─────────────────────────────────┐ │
│ │ Delta Time (VLQ)                │ │
│ │ Meta Event: Tempo               │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Delta Time (VLQ)                │ │
│ │ Meta Event: Time Signature      │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Delta Time (VLQ)                │ │
│ │ Note On Event                   │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Delta Time (VLQ)                │ │
│ │ Note Off Event                  │ │
│ └─────────────────────────────────┘ │
│ ... (more note events)              │
│ ┌─────────────────────────────────┐ │
│ │ Delta Time (VLQ)                │ │
│ │ Meta Event: End of Track        │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

## Testing

### Verify MIDI File Structure
To test if the MIDI file is valid:

1. **Generate a pattern** in the MIDI Assistant
2. **Download the .mid file**
3. **Open in Logic Pro** (or any DAW)
4. **Verify:**
   - File opens without errors
   - Tempo is correct
   - Time signature is correct
   - Notes play at the right time
   - Note durations are correct

### Expected Results
- ✅ Opens in Logic Pro without errors
- ✅ Opens in Ableton Live
- ✅ Opens in FL Studio
- ✅ Opens in GarageBand
- ✅ Correct tempo and time signature displayed
- ✅ Notes are properly positioned on the timeline

## MIDI Specification Compliance

The new implementation follows the **Standard MIDI File (SMF) Format 0** specification:

- **Proper chunk structure** (MThd and MTrk)
- **Correct byte ordering** (big-endian for multi-byte values)
- **Valid meta events** (tempo, time signature, end of track)
- **Proper delta time encoding** (variable-length quantity)
- **Correct note on/off pairing** with proper timing
- **Standard PPQ** (480 ticks per quarter note)

## References

- [Standard MIDI File Format Specification](https://www.music.mcgill.ca/~ich/classes/mumt306/StandardMIDIfileformat.html)
- [MIDI Technical Specification](https://www.midi.org/specifications)
- [Variable Length Quantity Encoding](https://en.wikipedia.org/wiki/Variable-length_quantity)

## Future Improvements

- [ ] Add support for Format 1 (multi-track) MIDI files
- [ ] Add MIDI CC events (modulation, expression, etc.)
- [ ] Add program change events (instrument selection)
- [ ] Add pitch bend events
- [ ] Add key signature meta event
- [ ] Add lyrics/text meta events
- [ ] Optimize for large files (1000+ notes)

