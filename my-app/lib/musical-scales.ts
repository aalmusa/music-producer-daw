/**
 * Comprehensive database of musical scales
 * Based on standard music theory with proper enharmonic spellings
 */

export type ScaleType = 'major' | 'minor'

export interface Scale {
  root: string
  type: ScaleType
  notes: string[] // The 7 notes of the scale in order
}

/**
 * Major scales database
 * Each scale includes the root note and all 7 scale degrees with proper enharmonic spellings
 */
export const MAJOR_SCALES: Record<string, string[]> = {
  // Sharp keys
  'C': ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
  'G': ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
  'D': ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
  'A': ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'],
  'E': ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'],
  'B': ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'],
  'F#': ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#'],
  'C#': ['C#', 'D#', 'E#', 'F#', 'G#', 'A#', 'B#'],
  
  // Flat keys
  'F': ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'],
  'Bb': ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'],
  'Eb': ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'],
  'Ab': ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G'],
  'Db': ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'],
  'Gb': ['Gb', 'Ab', 'Bb', 'Cb', 'Db', 'Eb', 'F'],
  
  // Enharmonic equivalents (using flat notation)
  'Cb': ['Cb', 'Db', 'Eb', 'Fb', 'Gb', 'Ab', 'Bb'], // Same as B major
  'Fb': ['Fb', 'Gb', 'Ab', 'Bbb', 'Cb', 'Db', 'Eb'], // Same as E major
}

/**
 * Minor scales database (natural minor)
 * Each scale includes the root note and all 7 scale degrees
 */
export const MINOR_SCALES: Record<string, string[]> = {
  // Natural minor scales
  'A': ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
  'E': ['E', 'F#', 'G', 'A', 'B', 'C', 'D'],
  'B': ['B', 'C#', 'D', 'E', 'F#', 'G', 'A'],
  'F#': ['F#', 'G#', 'A', 'B', 'C#', 'D', 'E'],
  'C#': ['C#', 'D#', 'E', 'F#', 'G#', 'A', 'B'],
  'G#': ['G#', 'A#', 'B', 'C#', 'D#', 'E', 'F#'],
  'D#': ['D#', 'E#', 'F#', 'G#', 'A#', 'B', 'C#'],
  'A#': ['A#', 'B#', 'C#', 'D#', 'E#', 'F#', 'G#'],
  
  'D': ['D', 'E', 'F', 'G', 'A', 'Bb', 'C'],
  'G': ['G', 'A', 'Bb', 'C', 'D', 'Eb', 'F'],
  'C': ['C', 'D', 'Eb', 'F', 'G', 'Ab', 'Bb'],
  'F': ['F', 'G', 'Ab', 'Bb', 'C', 'Db', 'Eb'],
  'Bb': ['Bb', 'C', 'Db', 'Eb', 'F', 'Gb', 'Ab'],
  'Eb': ['Eb', 'F', 'Gb', 'Ab', 'Bb', 'Cb', 'Db'],
  'Ab': ['Ab', 'Bb', 'Cb', 'Db', 'Eb', 'Fb', 'Gb'],
}

/**
 * Get scale notes for a given root and scale type
 * @param root - The root note (e.g., "C", "F#", "Bb", "Gb")
 * @param type - The scale type ("major" or "minor")
 * @returns Array of 7 notes in the scale, or empty array if not found
 */
export function getScaleNotes(root: string, type: ScaleType = 'major'): string[] {
  // Normalize root note (handle flat and sharp symbols)
  let normalizedRoot = root.trim()
  
  // Convert Unicode flat/sharp to ASCII
  normalizedRoot = normalizedRoot.replace('♭', 'b').replace('♯', '#')
  
  // Normalize case
  normalizedRoot = normalizedRoot.charAt(0).toUpperCase() + normalizedRoot.slice(1)
  
  // Get the appropriate scale database
  const scales = type === 'major' ? MAJOR_SCALES : MINOR_SCALES
  
  // Try exact match first
  if (scales[normalizedRoot]) {
    return scales[normalizedRoot]
  }
  
  // Try enharmonic equivalents
  const enharmonicMap: Record<string, string> = {
    // Sharp to flat
    'C#': 'Db',
    'D#': 'Eb',
    'F#': 'Gb',
    'G#': 'Ab',
    'A#': 'Bb',
    // Flat to sharp
    'Db': 'C#',
    'Eb': 'D#',
    'Gb': 'F#',
    'Ab': 'G#',
    'Bb': 'A#',
    // Special cases
    'B#': 'C',
    'E#': 'F',
    'Cb': 'B',
    'Fb': 'E',
  }
  
  const equivalent = enharmonicMap[normalizedRoot]
  if (equivalent && scales[equivalent]) {
    return scales[equivalent]
  }
  
  // If still not found, return empty array
  return []
}

/**
 * Get all available major scale roots
 */
export function getMajorScaleRoots(): string[] {
  return Object.keys(MAJOR_SCALES)
}

/**
 * Get all available minor scale roots
 */
export function getMinorScaleRoots(): string[] {
  return Object.keys(MINOR_SCALES)
}

