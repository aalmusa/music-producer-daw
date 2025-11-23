// lib/audioEngine.ts
import * as Tone from 'tone';
import { MidiClipData, MidiNote, noteNumberToName } from './midiTypes';

// Shared musical settings
export const LOOP_BARS = 16; // same as the number of measures in Timeline

// Tone.js v15+ style transport
const transport = Tone.getTransport();

let isInitialized = false;
let metronomeEnabled = false; // Metronome state
let metronomeLoop: Tone.Loop | null = null;
let metronomeSynth: Tone.MembraneSynth | null = null;

// MIDI synthesizers and parts
const synthMap = new Map<string, Tone.PolySynth>();
const midiPartMap = new Map<string, Tone.Part[]>(); // Now stores array of parts per track
const samplerMap = new Map<string, Tone.Sampler>(); // Samplers for drum samples

// Audio loop players for audio tracks (4-bar loops quantized to BPM)
const audioPlayerMap = new Map<string, Tone.Player>();

export async function initAudio() {
  if (!isInitialized) {
    await Tone.start(); // unlocks audio on first click

    transport.bpm.value = 120;
    transport.loop = true;
    transport.loopStart = 0;
    transport.loopEnd = `${LOOP_BARS}m`;

    metronomeSynth = new Tone.MembraneSynth().toDestination();

    // Click every quarter note
    metronomeLoop = new Tone.Loop((time: number) => {
      metronomeSynth?.triggerAttackRelease('C2', '8n', time);
    }, '4n');

    // Don't auto-start metronome - user toggles via button
    isInitialized = true;
  }
}

export function startTransport() {
  transport.start();
}

export function stopTransport() {
  transport.stop();
}

export function setBpm(bpm: number) {
  transport.bpm.rampTo(bpm, 0.1);
  // Update audio loop playback rates to match new BPM
  // Use setTimeout to allow BPM ramp to complete
  setTimeout(() => {
    updateAudioLoopBpm();
  }, 150);
}

export function getTransportPosition(): string {
  return transport.position.toString();
}

export function toggleMetronome(): boolean {
  if (!metronomeLoop) return false;

  metronomeEnabled = !metronomeEnabled;

  if (metronomeEnabled) {
    metronomeLoop.start(0);
  } else {
    metronomeLoop.stop();
  }

  return metronomeEnabled;
}

export function isMetronomeEnabled(): boolean {
  return metronomeEnabled;
}

// Progress from 0 to 1 across the loop
export function getLoopProgress(): number {
  // Get current position in seconds
  const seconds = transport.seconds;

  // Get loop duration in seconds
  const loopDuration = transport.toSeconds(`${LOOP_BARS}m`);

  if (!loopDuration) return 0;

  // Calculate position within the loop (0 to 1)
  // Modulo ensures we stay within 0-1 range even if transport goes beyond loop end
  const progress = (seconds % loopDuration) / loopDuration;

  return Math.max(0, Math.min(1, progress));
}

// ============ MIDI SYNTH FUNCTIONS ============

/**
 * Creates or retrieves a synthesizer for a track
 */
export function getSynthForTrack(trackId: string): Tone.PolySynth {
  let synth = synthMap.get(trackId);

  if (!synth) {
    synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: 'triangle',
      },
      envelope: {
        attack: 0.005,
        decay: 0.1,
        sustain: 0.3,
        release: 1,
      },
    }).toDestination();

    synthMap.set(trackId, synth);
  }

  return synth;
}

/**
 * Creates or retrieves a sampler for a track
 * Samplers play audio files triggered by MIDI notes
 * The sample is pitched based on the MIDI note, with C3 as the root pitch
 */
export async function getSamplerForTrack(
  trackId: string,
  audioUrl: string
): Promise<Tone.Sampler> {
  const existingSampler = samplerMap.get(trackId);

  // Dispose of the existing sampler if the audio URL has changed
  if (existingSampler) {
    existingSampler.dispose();
    samplerMap.delete(trackId);
  }

  // Create new sampler with C3 as the root note
  // Tone.js will automatically pitch-shift the sample for other notes
  const sampler = new Tone.Sampler(
    {
      C3: audioUrl, // Map the sample to C3 (MIDI note 60)
    },
    {
      onload: () => {
        console.log(`✓ Sample loaded for track ${trackId} (root: C3)`);
      },
      onerror: (err) => {
        console.error(`✗ Failed to load sample for track ${trackId}:`, err);
      },
    }
  ).toDestination();

  samplerMap.set(trackId, sampler);

  return sampler;
}

/**
 * Updates all MIDI parts for a track with multiple clips
 * Supports both synth and sampler playback
 */
export async function updateMidiParts(
  trackId: string,
  clips: MidiClipData[] | null | undefined,
  samplerAudioUrl?: string | null // Optional: if provided, use sampler instead of synth
) {
  // Remove existing parts if they exist
  const existingParts = midiPartMap.get(trackId);
  if (existingParts) {
    existingParts.forEach((part) => {
      // Cancel the part to avoid timing issues, then dispose
      part.cancel();
      part.dispose();
    });
    midiPartMap.delete(trackId);
  }

  // If no clips, just return (track is empty)
  if (!clips || clips.length === 0) {
    return;
  }

  // Determine if we should use sampler or synth
  let instrument: Tone.PolySynth | Tone.Sampler;
  if (samplerAudioUrl) {
    instrument = await getSamplerForTrack(trackId, samplerAudioUrl);
  } else {
    instrument = getSynthForTrack(trackId);
  }

  const parts: Tone.Part[] = [];

  // Create a part for each clip
  clips.forEach((clipData) => {
    if (clipData.notes.length === 0) return;

    // Convert MIDI notes to Tone.js Part events
    // Note times are relative to the clip (0 to clipData.bars)
    const events = clipData.notes.map((note: MidiNote) => {
      // Convert decimal bars to Tone.js time format (bars:quarters:sixteenths)
      // e.g., 3.0625 bars = 3 bars + 0.0625 bars = 3 bars + 0.25 quarter notes = 3:0:1
      const bars = Math.floor(note.start);
      const remainderBars = note.start - bars;
      const quarters = Math.floor(remainderBars * 4); // 4 quarter notes per bar
      const remainderQuarters = remainderBars * 4 - quarters;
      const sixteenths = Math.round(remainderQuarters * 4); // 4 sixteenth notes per quarter

      // Format: "bars:quarters:sixteenths"
      const time = `${bars}:${quarters}:${sixteenths}`;

      // Convert duration similarly
      const durationBars = Math.floor(note.duration);
      const durationRemainderBars = note.duration - durationBars;
      const durationQuarters = Math.floor(durationRemainderBars * 4);
      const durationRemainderQuarters =
        durationRemainderBars * 4 - durationQuarters;
      const durationSixteenths = Math.round(durationRemainderQuarters * 4);
      const duration = `${durationBars}:${durationQuarters}:${durationSixteenths}`;

      console.log(
        `Note conversion: start=${note.start} → time="${time}", duration=${note.duration} → "${duration}"`
      );

      return {
        time,
        note: noteNumberToName(note.pitch),
        duration,
        velocity: note.velocity,
      };
    });

    // Create a Part for this clip
    const part = new Tone.Part((time, value) => {
      if (instrument instanceof Tone.Sampler) {
        // For samplers, trigger the sample
        (instrument as Tone.Sampler).triggerAttackRelease(
          value.note,
          value.duration,
          time,
          value.velocity
        );
      } else {
        // For synths, trigger the note
        (instrument as Tone.PolySynth).triggerAttackRelease(
          value.note,
          value.duration,
          time,
          value.velocity
        );
      }
    }, events);

    // DON'T loop the part - let the transport loop handle it
    part.loop = false;

    // Start this part at the clip's position in the timeline
    // This is the key fix: position in the 16-bar timeline
    part.start(`${clipData.startBar}m`);

    // Stop it after the clip duration
    part.stop(`${clipData.startBar + clipData.bars}m`);

    parts.push(part);
  });

  if (parts.length > 0) {
    midiPartMap.set(trackId, parts);
  }
}

/**
 * Legacy function for single clip - redirects to new function
 * @deprecated Use updateMidiParts instead
 */
export function updateMidiPart(trackId: string, clipData: MidiClipData | null) {
  if (clipData) {
    updateMidiParts(trackId, [clipData]);
  } else {
    updateMidiParts(trackId, null);
  }
}

/**
 * Removes a track's MIDI parts, synth, and sampler
 */
export function removeMidiTrack(trackId: string) {
  const parts = midiPartMap.get(trackId);
  if (parts) {
    parts.forEach((part) => {
      part.cancel();
      part.dispose();
    });
    midiPartMap.delete(trackId);
  }

  const synth = synthMap.get(trackId);
  if (synth) {
    synth.dispose();
    synthMap.delete(trackId);
  }

  const sampler = samplerMap.get(trackId);
  if (sampler) {
    sampler.dispose();
    samplerMap.delete(trackId);
  }
}

/**
 * Mutes or unmutes a track's synth or sampler
 */
export function setTrackMute(trackId: string, muted: boolean) {
  const synth = synthMap.get(trackId);
  if (synth) {
    synth.volume.value = muted ? -Infinity : 0;
  }

  const sampler = samplerMap.get(trackId);
  if (sampler) {
    sampler.volume.value = muted ? -Infinity : 0;
  }
}

/**
 * Sets the volume for a track's synth
 */
export function setTrackVolume(trackId: string, volume: number) {
  const synth = synthMap.get(trackId);
  if (synth) {
    // Convert 0-1 range to decibels (-24 to 0)
    const db = volume === 0 ? -Infinity : (volume - 1) * 24;
    synth.volume.value = db;
  }
}

/**
 * Preview a single MIDI note (for piano roll interaction)
 */
export function previewNote(
  trackId: string,
  pitch: number,
  duration: number = 0.2,
  velocity: number = 0.8
) {
  const synth = getSynthForTrack(trackId);
  const noteName = noteNumberToName(pitch);
  synth.triggerAttackRelease(noteName, duration, undefined, velocity);
}

// ============ AUDIO LOOP PLAYER FUNCTIONS ============

/**
 * Creates or updates an audio loop player for a track
 * Audio loops are quantized to 4 bars and sync with the transport BPM
 */
export async function createAudioLoopPlayer(
  trackId: string,
  audioUrl: string
): Promise<Tone.Player> {
  // Remove existing player if it exists
  const existingPlayer = audioPlayerMap.get(trackId);
  if (existingPlayer) {
    existingPlayer.stop();
    existingPlayer.dispose();
    audioPlayerMap.delete(trackId);
  }

  return new Promise((resolve, reject) => {
    // Create a new player with looping enabled
    const player = new Tone.Player({
      url: audioUrl,
      loop: true,
      onload: () => {
        // Calculate the duration of 4 bars at current BPM
        const fourBarsDuration = transport.toSeconds('4m');
        
        // Set playback rate to fit the audio into exactly 4 bars
        // This quantizes the loop to the project's BPM
        const originalDuration = player.buffer.duration;
        const playbackRate = originalDuration / fourBarsDuration;
        player.playbackRate = playbackRate;
        
        // Set loop points to 4 bars
        player.loopStart = 0;
        player.loopEnd = fourBarsDuration;
        
        console.log(
          `✓ Audio loop loaded for track ${trackId}:`,
          `original=${originalDuration.toFixed(2)}s,`,
          `4bars=${fourBarsDuration.toFixed(2)}s,`,
          `rate=${playbackRate.toFixed(3)}`
        );
        
        audioPlayerMap.set(trackId, player);
        resolve(player);
      },
      onerror: (error) => {
        console.error(`✗ Failed to load audio for track ${trackId}:`, error);
        reject(error);
      },
    }).toDestination();
    
    // Sync player with transport
    player.sync().start(0);
  });
}

/**
 * Updates the playback rate of all audio loops when BPM changes
 */
export function updateAudioLoopBpm() {
  const fourBarsDuration = transport.toSeconds('4m');
  
  audioPlayerMap.forEach((player, trackId) => {
    const originalDuration = player.buffer.duration;
    const playbackRate = originalDuration / fourBarsDuration;
    player.playbackRate = playbackRate;
    player.loopEnd = fourBarsDuration;
    
    console.log(
      `Updated loop rate for track ${trackId}: ${playbackRate.toFixed(3)}`
    );
  });
}

/**
 * Removes an audio loop player
 */
export function removeAudioLoopPlayer(trackId: string) {
  const player = audioPlayerMap.get(trackId);
  if (player) {
    player.unsync();
    player.stop();
    player.dispose();
    audioPlayerMap.delete(trackId);
  }
}

/**
 * Sets volume for an audio loop player
 */
export function setAudioLoopVolume(trackId: string, volume: number) {
  const player = audioPlayerMap.get(trackId);
  if (player) {
    // Convert 0-1 range to decibels (-24 to 0)
    const db = volume === 0 ? -Infinity : (volume - 1) * 24;
    player.volume.value = db;
  }
}

/**
 * Mutes or unmutes an audio loop player
 */
export function setAudioLoopMute(trackId: string, muted: boolean) {
  const player = audioPlayerMap.get(trackId);
  if (player) {
    player.mute = muted;
  }
}
