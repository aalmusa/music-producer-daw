// lib/audioEngine.ts
import * as Tone from 'tone';
import { MidiClipData, MidiNote, noteNumberToName } from './midiTypes';
import { getSynthPreset, SynthPresetName, EffectsChain } from './synthPresets';

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
const effectsChainMap = new Map<string, Tone.ToneAudioNode[]>(); // Effects chains per track

// Master output chain - initialized in initAudio()
let masterLimiter: Tone.Limiter | null = null;
let masterCompressor: Tone.Compressor | null = null;

/**
 * Get the master output node - returns Destination if master chain not initialized
 */
function getMasterOutput(): Tone.ToneAudioNode {
  return masterCompressor || Tone.getDestination();
}

export async function initAudio() {
  if (!isInitialized) {
    await Tone.start(); // unlocks audio on first click

    // Create master chain after Tone is started
    if (!masterCompressor) {
      masterCompressor = new Tone.Compressor({
        threshold: -20,
        ratio: 3,
        attack: 0.003,
        release: 0.1,
      });
    }
    
    if (!masterLimiter) {
      masterLimiter = new Tone.Limiter(-3); // Prevent peaks above -3dB
    }
    
    // Connect master chain
    masterCompressor.connect(masterLimiter);
    masterLimiter.toDestination();

    transport.bpm.value = 120;
    transport.loop = true;
    transport.loopStart = 0;
    transport.loopEnd = `${LOOP_BARS}m`;

    metronomeSynth = new Tone.MembraneSynth().connect(getMasterOutput());

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
 * Creates an effects chain based on the preset configuration
 * Returns an array of Tone.js effect nodes
 */
function createEffectsChain(effectsConfig?: EffectsChain): Tone.ToneAudioNode[] {
  const effects: Tone.ToneAudioNode[] = [];
  
  if (!effectsConfig) return effects;

  // EQ - typically first in chain
  if (effectsConfig.eq) {
    const eq3 = new Tone.EQ3({
      low: effectsConfig.eq.low,
      mid: effectsConfig.eq.mid,
      high: effectsConfig.eq.high,
    });
    effects.push(eq3);
  }

  // Distortion/Saturation
  if (effectsConfig.distortion) {
    const distortion = new Tone.Distortion({
      distortion: effectsConfig.distortion.distortion,
      wet: effectsConfig.distortion.wet,
    });
    effects.push(distortion);
  }

  // Compressor - for dynamics control
  if (effectsConfig.compressor) {
    const compressor = new Tone.Compressor({
      threshold: effectsConfig.compressor.threshold,
      ratio: effectsConfig.compressor.ratio,
      attack: effectsConfig.compressor.attack,
      release: effectsConfig.compressor.release,
    });
    effects.push(compressor);
  }

  // Modulation effects
  if (effectsConfig.chorus) {
    const chorus = new Tone.Chorus({
      frequency: effectsConfig.chorus.frequency,
      delayTime: effectsConfig.chorus.delayTime,
      depth: effectsConfig.chorus.depth,
      wet: effectsConfig.chorus.wet,
    }).start();
    effects.push(chorus);
  }

  if (effectsConfig.phaser) {
    const phaser = new Tone.Phaser({
      frequency: effectsConfig.phaser.frequency,
      octaves: effectsConfig.phaser.octaves,
      baseFrequency: effectsConfig.phaser.baseFrequency,
      wet: effectsConfig.phaser.wet,
    });
    effects.push(phaser);
  }

  if (effectsConfig.tremolo) {
    const tremolo = new Tone.Tremolo({
      frequency: effectsConfig.tremolo.frequency,
      depth: effectsConfig.tremolo.depth,
      wet: effectsConfig.tremolo.wet,
    }).start();
    effects.push(tremolo);
  }

  if (effectsConfig.vibrato) {
    const vibrato = new Tone.Vibrato({
      frequency: effectsConfig.vibrato.frequency,
      depth: effectsConfig.vibrato.depth,
      wet: effectsConfig.vibrato.wet,
    });
    effects.push(vibrato);
  }

  // Time-based effects
  if (effectsConfig.delay) {
    const delay = new Tone.FeedbackDelay({
      delayTime: effectsConfig.delay.delayTime,
      feedback: effectsConfig.delay.feedback,
      wet: effectsConfig.delay.wet,
    });
    effects.push(delay);
  }

  // Reverb - typically last in chain
  if (effectsConfig.reverb) {
    const reverb = new Tone.Reverb({
      decay: effectsConfig.reverb.decay,
      preDelay: effectsConfig.reverb.preDelay,
      wet: effectsConfig.reverb.wet,
    });
    effects.push(reverb);
  }

  return effects;
}

/**
 * Disposes of an existing effects chain for a track
 */
function disposeEffectsChain(trackId: string) {
  const existingEffects = effectsChainMap.get(trackId);
  if (existingEffects) {
    existingEffects.forEach(effect => effect.dispose());
    effectsChainMap.delete(trackId);
  }
}

/**
 * Creates or retrieves a synthesizer for a track
 * Can use a preset configuration or default to basic synth
 */
export function getSynthForTrack(trackId: string, presetName?: string): Tone.PolySynth {
  // If we're changing presets, dispose of the old synth and effects
  const existingSynth = synthMap.get(trackId);
  if (existingSynth && presetName) {
    existingSynth.dispose();
    synthMap.delete(trackId);
    disposeEffectsChain(trackId);
  }

  let synth = synthMap.get(trackId);

  if (!synth) {
    const preset = presetName ? getSynthPreset(presetName as SynthPresetName) : null;
    
    // Create the appropriate synth type based on the preset
    if (preset) {
      switch (preset.synthType) {
        case 'FMSynth':
          synth = new Tone.PolySynth(Tone.FMSynth, preset.options) as any;
          break;
        case 'AMSynth':
          synth = new Tone.PolySynth(Tone.AMSynth, preset.options) as any;
          break;
        case 'MonoSynth':
          synth = new Tone.PolySynth(Tone.MonoSynth, preset.options) as any;
          break;
        case 'PluckSynth':
          synth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.001, decay: 0.5, sustain: 0.1, release: 1 }
          });
          break;
        case 'MetalSynth':
          synth = new Tone.PolySynth(Tone.FMSynth, {
            harmonicity: 5.1,
            modulationIndex: 32,
            envelope: { attack: 0.001, decay: 1.4, release: 0.2 }
          });
          break;
        default:
          synth = new Tone.PolySynth(Tone.Synth, preset.options);
      }

      // Create and connect effects chain
      if (synth && preset.effects) {
        const effects = createEffectsChain(preset.effects);
        effectsChainMap.set(trackId, effects);
        
        // Connect synth through effects chain to master output
        if (effects.length > 0) {
          synth.connect(effects[0]);
          
          // Chain effects together
          for (let i = 0; i < effects.length - 1; i++) {
            effects[i].connect(effects[i + 1]);
          }
          
          // Connect last effect to master output
          effects[effects.length - 1].connect(getMasterOutput());
        } else {
          synth.connect(getMasterOutput());
        }
      } else if (synth) {
        synth.connect(getMasterOutput());
      }
    } else {
      // Default basic synth
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
      }).connect(getMasterOutput());
    }

    if (synth) {
      synthMap.set(trackId, synth);
    }
  }

  return synth!;
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
  ).connect(getMasterOutput());

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
  samplerAudioUrl?: string | null, // Optional: if provided, use sampler instead of synth
  synthPreset?: string // Optional: synth preset name
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
    instrument = getSynthForTrack(trackId, synthPreset);
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
