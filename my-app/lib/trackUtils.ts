// lib/trackUtils.ts
/**
 * Track Creation Utilities for AI Integration
 * These functions provide a clean API for both UI and AI agents to create/manage tracks
 */

import { Track, createEmptyMidiClip } from './midiTypes';

const trackColors = [
  'bg-emerald-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-yellow-500',
  'bg-red-500',
  'bg-cyan-500',
  'bg-indigo-500',
];

/**
 * Factory function to create a new track
 * Can be called by UI components or AI agents
 *
 * @param trackType - 'midi' for synthesized instruments, 'audio' for audio files
 * @param name - Custom track name (optional - generates default if not provided)
 * @param trackIndex - Position in track list (used for naming and color)
 * @returns A new Track object
 *
 * @example
 * // User creates track via UI
 * const midiTrack = createNewTrack('midi', undefined, 0);
 *
 * @example
 * // AI agent creates specific track
 * const drumTrack = createNewTrack('audio', 'Drums - Kick Heavy', 5);
 * const bassTrack = createNewTrack('midi', 'Synth Bass - Deep', 6);
 */
export function createNewTrack(
  trackType: 'midi' | 'audio',
  name?: string,
  trackIndex: number = 0
): Track {
  const colorIndex = trackIndex % trackColors.length;
  const displayName = name || `${trackType === 'midi' ? 'Synth' : 'Audio'} ${trackIndex + 1}`;

  return {
    id: crypto.randomUUID(),
    name: displayName,
    color: trackColors[colorIndex],
    type: trackType,
    muted: false,
    solo: false,
    volume: 1,
    ...(trackType === 'midi'
      ? { midiClip: createEmptyMidiClip() }
      : { audioUrl: undefined }),
  };
}

/**
 * Creates multiple tracks at once (useful for AI generating full compositions)
 *
 * @param tracks - Array of track specifications
 * @returns Array of new Track objects
 *
 * @example
 * const tracks = createMultipleTracks([
 *   { type: 'audio', name: 'Drums' },
 *   { type: 'midi', name: 'Synth Pad' },
 *   { type: 'midi', name: 'Bass Line' },
 * ]);
 */
export interface TrackSpec {
  type: 'midi' | 'audio';
  name?: string;
}

export function createMultipleTracks(specs: TrackSpec[]): Track[] {
  return specs.map((spec, index) =>
    createNewTrack(spec.type, spec.name, index)
  );
}

/**
 * Gets suggested track setup based on music genre or style
 * Useful for AI recommendations
 *
 * @param genre - Music genre or style
 * @returns Recommended track setup
 *
 * @example
 * const trackSetup = getRecommendedTracksForGenre('electronic');
 * // Returns multiple MIDI tracks optimized for electronic music
 */
export function getRecommendedTracksForGenre(
  genre: 'electronic' | 'hip-hop' | 'pop' | 'ambient' | 'other' = 'other'
): TrackSpec[] {
  const setups: Record<string, TrackSpec[]> = {
    electronic: [
      { type: 'midi', name: 'Kick' },
      { type: 'midi', name: 'Drums' },
      { type: 'midi', name: 'Bass' },
      { type: 'midi', name: 'Synth Pad' },
      { type: 'midi', name: 'Synth Melody' },
    ],
    'hip-hop': [
      { type: 'audio', name: 'Drums' },
      { type: 'midi', name: 'Bass' },
      { type: 'midi', name: 'Synth' },
      { type: 'midi', name: 'Strings' },
    ],
    pop: [
      { type: 'audio', name: 'Drums' },
      { type: 'midi', name: 'Bass' },
      { type: 'midi', name: 'Guitar' },
      { type: 'midi', name: 'Synth' },
      { type: 'midi', name: 'Vocals' },
    ],
    ambient: [
      { type: 'midi', name: 'Pad 1' },
      { type: 'midi', name: 'Pad 2' },
      { type: 'midi', name: 'Texture' },
      { type: 'audio', name: 'Field Recording' },
    ],
    other: [
      { type: 'midi', name: 'Track 1' },
      { type: 'midi', name: 'Track 2' },
    ],
  };

  return setups[genre] || setups.other;
}
