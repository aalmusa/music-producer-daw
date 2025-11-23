"use client"

import * as React from "react"

interface PianoKeyboardProps {
  className?: string
  keySignature?: string // e.g., "G♭ Major"
}

// Major scale patterns: intervals from root (W=whole step, H=half step)
// Pattern: W-W-H-W-W-W-H
const getMajorScaleNotes = (root: string): string[] => {
  const allNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const enharmonicMap: Record<string, string> = {
    'Db': 'C#',
    'Eb': 'D#',
    'Gb': 'F#',
    'Ab': 'G#',
    'Bb': 'A#',
    'Cb': 'B',
    'E#': 'F',
    'Fb': 'E',
    'B#': 'C'
  }
  
  // Normalize the root note
  let normalizedRoot = root
  if (root.includes('♭')) {
    normalizedRoot = root.replace('♭', 'b')
  }
  if (root.includes('♯')) {
    normalizedRoot = root.replace('♯', '#')
  }
  
  // Handle enharmonic equivalents
  if (enharmonicMap[normalizedRoot]) {
    normalizedRoot = enharmonicMap[normalizedRoot]
  }
  
  const rootIndex = allNotes.indexOf(normalizedRoot)
  if (rootIndex === -1) return []
  
  // Major scale intervals: 0, 2, 4, 5, 7, 9, 11 (W-W-H-W-W-W-H)
  const intervals = [0, 2, 4, 5, 7, 9, 11]
  return intervals.map(interval => allNotes[(rootIndex + interval) % 12])
}

export function PianoKeyboard({ className, keySignature = "G♭ Major" }: PianoKeyboardProps) {
  // Extract root note from key signature (e.g., "G♭ Major" -> "G♭")
  const rootNote = keySignature.split(' ')[0] || "G♭"
  const scaleNotes = getMajorScaleNotes(rootNote)
  
  // Map scale notes to our keyboard keys (considering enharmonics)
  const keysInScale = new Set<string>()
  
  // Map enharmonic equivalents
  scaleNotes.forEach(note => {
    keysInScale.add(note)
    // Add enharmonic equivalents
    if (note === 'F#') keysInScale.add('Gb')
    if (note === 'G#') keysInScale.add('Ab')
    if (note === 'A#') keysInScale.add('Bb')
    if (note === 'C#') keysInScale.add('Db')
    if (note === 'D#') keysInScale.add('Eb')
    if (note === 'B') keysInScale.add('Cb')
  })
  
  // Check if a key is in the scale
  const isKeyInScale = (keyName: string): boolean => {
    // Direct match
    if (keysInScale.has(keyName)) return true
    // Check enharmonic equivalents
    const enharmonicMap: Record<string, string> = {
      'C#': 'Db', 'Db': 'C#',
      'D#': 'Eb', 'Eb': 'D#',
      'F#': 'Gb', 'Gb': 'F#',
      'G#': 'Ab', 'Ab': 'G#',
      'A#': 'Bb', 'Bb': 'A#',
      'B': 'Cb', 'Cb': 'B'
    }
    const equivalent = enharmonicMap[keyName]
    return equivalent ? keysInScale.has(equivalent) : false
  }
  const octaves = 1
  const whiteKeysPerOctave = 7 // C, D, E, F, G, A, B
  const blackKeysPerOctave = 5 // C#, D#, F#, G#, A#
  
  const totalWhiteKeys = octaves * whiteKeysPerOctave
  const totalBlackKeys = octaves * blackKeysPerOctave
  
  // Pattern for black keys in an octave: C#, D#, (gap), F#, G#, A#
  // Positions relative to white keys: after C, after D, after F, after G, after A
  const blackKeyPositions = [0, 1, 3, 4, 5] // Relative to white key indices in octave
  
  // White key names: C, D, E, F, G, A, B
  const whiteKeyNames = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
  // Black key names: C#, D#, F#, G#, A#
  const blackKeyNames = ['C#', 'D#', 'F#', 'G#', 'A#']
  
  return (
    <div className={`relative ${className || ""}`}>
      {/* White keys container */}
      <div className="flex relative">
        {Array.from({ length: totalWhiteKeys }).map((_, i) => {
          const octaveIndex = Math.floor(i / whiteKeysPerOctave)
          const keyInOctave = i % whiteKeysPerOctave
          const keyName = whiteKeyNames[keyInOctave]
          
          return (
            <div
              key={`white-${i}`}
              className={`flex-shrink-0 relative border ${
                isKeyInScale(keyName) 
                  ? 'bg-blue-200 border-blue-400' 
                  : 'bg-white border-gray-300'
              }`}
              style={{
                width: `${100 / totalWhiteKeys}%`,
                height: '120px',
              }}
            >
              <div className={`absolute bottom-2 left-1/2 transform -translate-x-1/2 font-semibold text-sm ${
                isKeyInScale(keyName) ? 'text-blue-900' : 'text-gray-800'
              }`}>
                {keyName}
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Black keys container - positioned absolutely over white keys */}
      <div className="absolute top-0 left-0 w-full h-[70px] flex pointer-events-none">
        {Array.from({ length: totalBlackKeys }).map((_, i) => {
          const octaveIndex = Math.floor(i / blackKeysPerOctave)
          const blackKeyInOctave = i % blackKeysPerOctave
          const whiteKeyOffset = blackKeyPositions[blackKeyInOctave]
          const keyName = blackKeyNames[blackKeyInOctave]
          
          // Calculate position: octave offset + white key offset
          const whiteKeyIndex = octaveIndex * whiteKeysPerOctave + whiteKeyOffset
          const whiteKeyWidth = 100 / totalWhiteKeys
          
          // Position black key: starts at 50% of the white key, extends to 50% of next
          // This makes it "half on C and half on D" as requested
          const leftPosition = (whiteKeyIndex * whiteKeyWidth) + (whiteKeyWidth * 0.5)
          const blackKeyWidth = whiteKeyWidth * 0.65 // Slightly wider to ensure it spans properly
          
          return (
            <div
              key={`black-${i}`}
              className={`pointer-events-auto relative border ${
                isKeyInScale(keyName)
                  ? 'bg-blue-600 border-blue-700'
                  : 'bg-black border-gray-800'
              }`}
              style={{
                position: 'absolute',
                left: `${leftPosition}%`,
                width: `${blackKeyWidth}%`,
                height: '100%',
                zIndex: 10,
              }}
            >
              <div className={`absolute bottom-1 left-1/2 transform -translate-x-1/2 font-semibold text-xs ${
                isKeyInScale(keyName) ? 'text-blue-100' : 'text-white'
              }`}>
                {keyName}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

