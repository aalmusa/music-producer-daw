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
 * - Sampler audio files (this file): instruments (bass, guitar, piano, trumpet),
 *   house drums (clap, hihat, kick), rap drums (808, clap, hat, kick),
 *   rock drums (hat, kick, open-hat, snare), and loops
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
  // Instruments
  {
    id: 'bass',
    name: 'Bass',
    filename: 'bass.wav',
    path: '/audio/instruments/bass.wav',
    category: 'sample',
    description: 'Deep bass instrument - perfect for low-end foundation',
  },
  {
    id: 'guitar',
    name: 'Guitar',
    filename: 'guitar.wav',
    path: '/audio/instruments/guitar.wav',
    category: 'sample',
    description: 'Electric guitar sample - great for melodies and chords',
  },
  {
    id: 'piano',
    name: 'Piano',
    filename: 'piano.wav',
    path: '/audio/instruments/piano.wav',
    category: 'sample',
    description: 'Classic piano sound - versatile for any genre',
  },
  {
    id: 'trumpet',
    name: 'Trumpet',
    filename: 'trumpet.wav',
    path: '/audio/instruments/trumpet.wav',
    category: 'sample',
    description: 'Brass trumpet - adds bright, melodic character',
  },
  // House Drums
  {
    id: 'house-clap',
    name: 'House Clap',
    filename: 'clap.wav',
    path: '/audio/house-drums/clap.wav',
    category: 'percussion',
    description: 'House-style clap - punchy and energetic',
  },
  {
    id: 'house-hihat',
    name: 'House Hi-Hat',
    filename: 'hihat.wav',
    path: '/audio/house-drums/hihat.wav',
    category: 'drums',
    description: 'House hi-hat - crisp and clean for dance beats',
  },
  {
    id: 'house-kick',
    name: 'House Kick',
    filename: 'kick.wav',
    path: '/audio/house-drums/kick.wav',
    category: 'drums',
    description: 'House kick drum - deep and driving',
  },
  // Rap Drums
  {
    id: 'rap-808',
    name: '808',
    filename: '808.wav',
    path: '/audio/rap-drums/808.wav',
    category: 'drums',
    description: 'Classic 808 bass drum - essential for hip-hop',
  },
  {
    id: 'rap-clap',
    name: 'Rap Clap',
    filename: 'clap.wav',
    path: '/audio/rap-drums/clap.wav',
    category: 'percussion',
    description: 'Rap-style clap - sharp and snappy',
  },
  {
    id: 'rap-hat',
    name: 'Rap Hi-Hat',
    filename: 'hat.wav',
    path: '/audio/rap-drums/hat.wav',
    category: 'drums',
    description: 'Rap hi-hat - tight and punchy',
  },
  {
    id: 'rap-kick',
    name: 'Rap Kick',
    filename: 'kick.wav',
    path: '/audio/rap-drums/kick.wav',
    category: 'drums',
    description: 'Rap kick drum - powerful and punchy',
  },
  // Rock Drums
  {
    id: 'rock-hat',
    name: 'Rock Hi-Hat',
    filename: 'hat.wav',
    path: '/audio/rock-drums/hat.wav',
    category: 'drums',
    description: 'Rock hi-hat - bright and cutting',
  },
  {
    id: 'rock-kick',
    name: 'Rock Kick',
    filename: 'kick.wav',
    path: '/audio/rock-drums/kick.wav',
    category: 'drums',
    description: 'Rock kick drum - powerful and punchy',
  },
  {
    id: 'rock-open-hat',
    name: 'Rock Open Hi-Hat',
    filename: 'open-hat.wav',
    path: '/audio/rock-drums/open-hat.wav',
    category: 'drums',
    description: 'Rock open hi-hat - bright and sizzling',
  },
  {
    id: 'rock-snare',
    name: 'Rock Snare',
    filename: 'snare.wav',
    path: '/audio/rock-drums/snare.wav',
    category: 'drums',
    description: 'Rock snare drum - crisp and powerful',
  },
  // Loops
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
