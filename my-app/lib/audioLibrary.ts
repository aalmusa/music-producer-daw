// lib/audioLibrary.ts
/**
 * Audio Library Configuration
 * Defines available audio files and their metadata for use in sampler mode
 * 
 * NOTE: All audio tracks are automatically quantized to 4-bar clips
 * and synced to the project BPM using Tone.js time-stretching.
 * Each clip plays once through its 4-bar duration (no looping).
 * 
 * INSTRUMENT COVERAGE:
 * - Sampler audio files (this file): clap, hi-hat
 * - Synth presets (synthPresets.ts): piano, bass, lead, pad, bells, pluck
 * 
 * For instruments not in library, recommend generating audio loops.
 */

export interface AudioFile {
  id: string;
  name: string;
  filename: string;
  path: string;
  category: 'drums' | 'percussion' | 'loop' | 'sample' | 'other';
  description: string;
}

export const audioLibrary: AudioFile[] = [
  {
    id: 'clap',
    name: 'Clap',
    filename: 'clap.wav',
    path: '/audio/clap.wav',
    category: 'percussion',
    description: 'Sharp clap sound - perfect for adding punch to beats',
  },
  {
    id: 'hihat',
    name: 'Hi-Hat',
    filename: 'hihat.wav',
    path: '/audio/hihat.wav',
    category: 'drums',
    description: 'Crisp hi-hat cymbal - ideal for rhythm and groove',
  },
  {
    id: 'demo-loop',
    name: 'Demo Loop',
    filename: 'demo-loop.wav',
    path: '/audio/demo-loop.wav',
    category: 'loop',
    description: 'Sample drum loop - great for reference or layering',
  },
];

/**
 * Get all audio files
 */
export function getAllAudioFiles(): AudioFile[] {
  return audioLibrary;
}

/**
 * Get audio files by category
 */
export function getAudioFilesByCategory(
  category: AudioFile['category']
): AudioFile[] {
  return audioLibrary.filter((file) => file.category === category);
}

/**
 * Get audio file by ID
 */
export function getAudioFileById(id: string): AudioFile | undefined {
  return audioLibrary.find((file) => file.id === id);
}
