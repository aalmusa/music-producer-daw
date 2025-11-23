# Audio Clips - No Looping Behavior

## Summary
Audio clips now play **once through their 4-bar duration** and then stop, instead of looping continuously.

## What Changed

### Before
```
┌────────────────────────────────────────────────────┐
│ Audio Clip (4 bars)                                │
│ ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│ │ Play 1   │→ │ Play 2   │→ │ Play 3   │→ ...    │
│ └──────────┘  └──────────┘  └──────────┘         │
│ (Loops continuously every 4 bars)                  │
└────────────────────────────────────────────────────┘
```

### After
```
┌────────────────────────────────────────────────────┐
│ Audio Clip (4 bars)                                │
│ ┌──────────┐  ┌──────────┐                        │
│ │ Play 1   │→ │ STOP     │                         │
│ └──────────┘  └──────────┘                        │
│ (Plays once, then stops)                           │
└────────────────────────────────────────────────────┘
```

## Technical Implementation

### Audio Engine Changes

**Player Configuration:**
```typescript
// Before
const player = new Tone.Player({
  url: audioUrl,
  loop: true,  // ❌ Continuous looping
  // ...
});

// After
const player = new Tone.Player({
  url: audioUrl,
  loop: false,  // ✅ Play once only
  // ...
});
```

**Playback Schedule:**
```typescript
// Before
player.sync().start(`${startBar}m`);
// Player would loop automatically

// After
player.sync().start(`${startBar}m`).stop(`${startBar + 4}m`);
// Player stops exactly after 4 bars
```

## How It Works

### Timeline Behavior

```
Timeline (16 bars):
┌────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┐
│ 1  │ 2  │ 3  │ 4  │ 5  │ 6  │ 7  │ 8  │ 9  │ 10 │ 11 │ 12 │ 13 │ 14 │ 15 │ 16 │
└────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┘

Clip 1: [▶▶▶▶] ····  ····  ····  (Plays bars 1-4, silent after)
Clip 2:  ····  ····  [▶▶▶▶] ····  (Plays bars 9-12, silent after)

Legend:
▶ = Playing audio
· = Silent
```

### Transport Loop Behavior

When the transport loops (goes from bar 16 back to bar 1):
- **Clip 1** plays again (bars 1-4)
- **Clip 2** plays again (bars 9-12)
- Each clip still plays only once per loop cycle

## Use Cases

### Perfect For:
✅ **One-shot samples** (drums, hits, fx)
✅ **Melodic phrases** that shouldn't repeat within the loop
✅ **Vocal chops** or samples
✅ **Sound effects** at specific positions
✅ **Fills and transitions**

### Example Arrangement:
```
Drums Track:
┌────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┐
│ 1  │ 2  │ 3  │ 4  │ 5  │ 6  │ 7  │ 8  │ 9  │ 10 │ 11 │ 12 │ 13 │ 14 │ 15 │ 16 │
├────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┤
│ [Kick Pattern ]  [Snare+Hat   ]  [Full Kit    ]  [Drum Fill   ]               │
└────────────────────────────────────────────────────────────────────────────────┘

Bass Track:
┌────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┐
│ 1  │ 2  │ 3  │ 4  │ 5  │ 6  │ 7  │ 8  │ 9  │ 10 │ 11 │ 12 │ 13 │ 14 │ 15 │ 16 │
├────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┤
│ [Bass Line A ]  ····  ····  ····  [Bass Line B ]  ····  ····  ····            │
└────────────────────────────────────────────────────────────────────────────────┘
```

## Advantages

### 1. **Precise Arrangement Control**
- Place audio exactly where you want it
- No unwanted repetition
- Build arrangements bar by bar

### 2. **Mix Multiple Clips**
- Layer different clips on the same track
- Create variations across the 16-bar loop
- Build dynamic arrangements

### 3. **BPM Synchronized**
- Each clip is still time-stretched to fit 4 bars
- All clips stay in sync with the project tempo
- Change BPM and clips adjust automatically

### 4. **Visual Clarity**
- What you see is what you hear
- Empty spaces = silence
- Clips only play where they're placed

## Creating Longer Patterns

If you want a sound to continue across multiple 4-bar sections:

### Option 1: Duplicate Clips
```
[Clip 1] [Clip 2] [Clip 3] [Clip 4]
 Bar 1-4  Bar 5-8  Bar 9-12 Bar 13-16
```

### Option 2: Use MIDI Tracks
For continuous patterns that need to loop, use MIDI tracks with samplers:
```typescript
// MIDI track with sampler
track.type = 'midi'
track.samplerAudioUrl = '/audio/loop.wav'
// MIDI notes trigger the sample continuously
```

## Comparison: Audio Clips vs MIDI + Sampler

| Feature | Audio Clips | MIDI + Sampler |
|---------|-------------|----------------|
| **Playback** | Once per clip | Triggered by notes |
| **Timing** | Fixed 4 bars | Flexible note timing |
| **Repetition** | Add multiple clips | Loop notes in MIDI |
| **Pitch** | Fixed | Variable per note |
| **Best For** | Full loops, phrases | Drums, one-shots |

## Future Enhancements

### Potential Features:
1. **Clip Length Options** (1, 2, 4, 8 bars)
2. **Fade In/Out** for smoother starts/stops
3. **Reverse Playback**
4. **Loop Toggle** (per clip)
5. **Slice Points** (start playback mid-clip)

### Would You Like To Add?
- **Continuous loop mode** as an option per clip
- **Crossfades** between clips
- **Volume envelopes** (ADSR)
- **Clip stretching** (change duration)

## Technical Notes

### Player Lifecycle
```typescript
// 1. Create player
const player = new Tone.Player({ 
  url: audioUrl, 
  loop: false 
});

// 2. Sync and schedule
player.sync()
  .start(`${startBar}m`)      // Start at bar position
  .stop(`${startBar + 4}m`);  // Stop after 4 bars

// 3. Player automatically stops after playing
// No manual stop needed unless clip is moved/deleted
```

### BPM Changes
- Playback rate adjusts to maintain 4-bar duration
- Stop time automatically recalculates
- No need to reschedule clips

### Transport Loop
- Players restart when transport loops back to their position
- Each clip plays once per transport loop
- Consistent behavior across all clips

## Migration from Previous Version

If you had audio tracks before this update:

**Old behavior:**
- Single `audioUrl` per track
- Continuous looping

**New behavior:**
- Multiple `audioClips` per track  
- Each clip plays once

**Default setup:**
- New tracks get one clip at bar 0
- Demo track has clips at bars 0 and 8

## Troubleshooting

**Q: Clip doesn't play**
- Check if transport is running
- Verify clip is not muted
- Check playhead reaches the clip's position

**Q: Clip plays twice**
- This is normal if transport loops back
- Each transport cycle plays the clip once

**Q: Audio sounds cut off**
- File might be longer than 4 bars
- Playback rate might be very slow
- Consider using a different clip length (future feature)

**Q: Want continuous looping**
- Use MIDI track with sampler
- Or duplicate clips across timeline

---

**Last Updated:** November 2025  
**Version:** 2.0 - Non-looping clips

