"use client"

import * as React from "react"
import { getScaleNotes, type ScaleType } from "@/lib/musical-scales"

interface PianoKeyboardProps {
  className?: string
  keySignature?: string // e.g., "G♭ Major", "C Major", "A Minor"
}

export function PianoKeyboard({ className, keySignature = "G♭ Major" }: PianoKeyboardProps) {
  // Extract root note and scale type from key signature (e.g., "G♭ Major" -> root: "G♭", scale: "Major")
  const parts = keySignature.split(' ')
  const rootNote = parts[0] || "G♭"
  const scaleTypeString = parts.slice(1).join(' ').toLowerCase() || "major"
  
  // Determine scale type
  const scaleType: ScaleType = scaleTypeString.includes('minor') ? 'minor' : 'major'
  
  // Get scale notes from the comprehensive scale database
  const scaleNotes = React.useMemo(() => {
    return getScaleNotes(rootNote, scaleType)
  }, [rootNote, scaleType])
  
  // Map scale notes to our keyboard keys (considering enharmonics)
  const keysInScale = React.useMemo(() => {
    const keys = new Set<string>()
    
    // Comprehensive enharmonic mapping
    const enharmonicMap: Record<string, string[]> = {
      'C#': ['Db'],
      'Db': ['C#'],
      'D#': ['Eb'],
      'Eb': ['D#'],
      'F#': ['Gb'],
      'Gb': ['F#'],
      'G#': ['Ab'],
      'Ab': ['G#'],
      'A#': ['Bb'],
      'Bb': ['A#'],
      'B': ['Cb'],
      'Cb': ['B'],
      'E#': ['F'],
      'F': ['E#'],
      'B#': ['C'],
      'C': ['B#'],
      'E': ['Fb'],
      'Fb': ['E'],
    }
    
    // Add all scale notes and their enharmonic equivalents
    scaleNotes.forEach(note => {
      keys.add(note)
      // Add enharmonic equivalents
      if (enharmonicMap[note]) {
        enharmonicMap[note].forEach(eq => keys.add(eq))
      }
    })
    
    return keys
  }, [scaleNotes])
  
  // Check if a key is in the scale
  const isKeyInScale = (keyName: string): boolean => {
    // Direct match
    if (keysInScale.has(keyName)) return true
    
    // Check enharmonic equivalents
    const enharmonicMap: Record<string, string[]> = {
      'C#': ['Db'],
      'Db': ['C#'],
      'D#': ['Eb'],
      'Eb': ['D#'],
      'F#': ['Gb'],
      'Gb': ['F#'],
      'G#': ['Ab'],
      'Ab': ['G#'],
      'A#': ['Bb'],
      'Bb': ['A#'],
      'B': ['Cb'],
      'Cb': ['B'],
      'E#': ['F'],
      'F': ['E#'],
      'B#': ['C'],
      'C': ['B#'],
      'E': ['Fb'],
      'Fb': ['E'],
    }
    
    const equivalents = enharmonicMap[keyName]
    if (equivalents) {
      return equivalents.some(eq => keysInScale.has(eq))
    }
    
    return false
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

