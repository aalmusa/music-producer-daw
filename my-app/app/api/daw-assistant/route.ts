import type {
  DAWAction,
  DAWAssistantRequest,
  DAWAssistantResponse,
} from '@/types/music-production';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loadSongSpec, type SongSpec } from '../context/SongSpecStore';
import { audioLibrary, getAudioFileById } from '@/lib/audioLibrary';

// Initialize the LLM with function calling
// Lower temperature for more deterministic tool calling behavior
const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-2.5-flash',
  apiKey: process.env.GOOGLE_API_KEY,
  temperature: 0.3, // Lower temperature for more consistent tool usage
});

/**
 * Normalizes track names to professional, standard names
 * Only cleans up unnecessary words, but preserves user intent
 */
function normalizeTrackName(
  trackName: string,
  useDefaults: boolean = true
): string {
  const name = trackName.trim();

  // If name is already specific and custom, just clean it up minimally
  if (!useDefaults) {
    // Just ensure proper capitalization
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  // Remove common suffixes/prefixes that are redundant
  let cleanedName = name
    .replace(/\s+(track|channel)\s*$/i, '') // Remove redundant "track" or "channel"
    .replace(/^(the|a|an)\s+/i, '') // Remove articles
    .trim();

  // Ensure proper capitalization
  if (cleanedName) {
    cleanedName = cleanedName.charAt(0).toUpperCase() + cleanedName.slice(1);
  } else {
    cleanedName = name; // Fallback to original if cleaning removed everything
  }

  return cleanedName;
}

// Define tools for the DAW assistant
const createTrackWithInstrumentTool = new DynamicStructuredTool({
  name: 'create_track_with_instrument',
  description:
    'Create a new MIDI track and configure it with a specific instrument. Use this when the user wants a track with a specific instrument like piano, bass, hi-hat, etc. Respect custom names if user specifies them (e.g., "Dark Piano", "Sub Bass", "Riff 1"), otherwise use clean defaults like "Piano", "Bass", "Guitar".',
  schema: z.object({
    trackName: z
      .string()
      .describe(
        'Track name - use clean defaults like "Piano", "Bass", "Guitar", OR use the custom name if user specifies one (e.g., "Dark Piano", "Bass 1", "Lead Synth"). Avoid redundant words like "Track" or "Channel".'
      ),
    instrument: z
      .enum([
        // Synth instruments
        'piano', 'bass', 'lead', 'pad', 'bells', 'pluck',
        // Sampler instruments - instruments
        'guitar', 'trumpet',
        // Sampler instruments - house drums
        'house-clap', 'house-hihat', 'house-kick',
        // Sampler instruments - rap drums
        '808', 'rap-clap', 'rap-hat', 'rap-kick',
        // Sampler instruments - rock drums
        'rock-hat', 'rock-kick', 'rock-open-hat', 'rock-snare',
        // Generic drum names (defaults)
        'hihat', 'clap', 'kick', 'snare', 'open-hat',
      ])
      .describe(
        'Instrument type. Synth: piano, bass, lead (guitar), pad, bells, pluck (strings). Sampler instruments: guitar, trumpet, house-clap, house-hihat, house-kick, 808, rap-clap, rap-hat, rap-kick, rock-hat, rock-kick, rock-open-hat, rock-snare. Generic: hihat, clap, kick, snare, open-hat (defaults to house/rock styles).'
      ),
  }),
  func: async ({ trackName, instrument }) => {
    // Clean up the track name (just remove redundant words, preserve user intent)
    const normalizedName = normalizeTrackName(trackName);

    // This is a placeholder - the actual execution happens in the frontend
    // We return metadata that will be converted to actions
    return JSON.stringify({
      success: true,
      trackName: normalizedName,
      instrument,
      actions: generateActionsForInstrument(normalizedName, instrument),
    });
  },
});

const createEmptyTrackTool = new DynamicStructuredTool({
  name: 'create_empty_track',
  description:
    'Create a new MIDI track without configuring an instrument. Use this when you want to ask the user what instrument they want.',
  schema: z.object({
    trackName: z.string().describe('Name for the track'),
  }),
  func: async ({ trackName }) => {
    const normalizedName = normalizeTrackName(trackName);
    return JSON.stringify({
      success: true,
      trackName: normalizedName,
      actions: [
        {
          type: 'create_track',
          trackType: 'midi',
          trackName: normalizedName,
          reasoning: 'Creating empty MIDI track for user to configure',
        },
      ],
    });
  },
});

const createAudioTrackTool = new DynamicStructuredTool({
  name: 'create_audio_track',
  description:
    'Create a new audio track for audio files/loops. Use this when the user wants an audio track or when suggesting tracks that would benefit from audio samples (drums, vocals, recorded instruments, etc.). Respect custom names if user specifies them, otherwise use clean defaults.',
  schema: z.object({
    trackName: z
      .string()
      .describe(
        'Track name - use clean defaults like "Drums", "Vocals", "Guitar", "Percussion", "FX", OR use the custom name if user specifies one. Avoid redundant words like "Track".'
      ),
  }),
  func: async ({ trackName }) => {
    const normalizedName = normalizeTrackName(trackName);
    return JSON.stringify({
      success: true,
      trackName: normalizedName,
      actions: [
        {
          type: 'create_track',
          trackType: 'audio',
          trackName: normalizedName,
          reasoning: `Creating audio track for ${normalizedName}`,
        },
      ],
    });
  },
});

type TrackType = 'midi' | 'audio';

interface TrackTemplate {
  type: TrackType;
  name: string;
  instrument?: string;
  synthPreset?: string;
  role: 'core' | 'percussion' | 'melody' | 'harmony' | 'fx' | 'vocal';
  tags?: string[]; // e.g. ["electronic", "hip-hop"]
}

const BASE_TEMPLATES: TrackTemplate[] = [
  // --- CORE RHYTHM ---
  { type: 'audio', name: 'Kick Drum', role: 'core', tags: ['all'] },
  { type: 'audio', name: 'Snare Drum', role: 'core', tags: ['all'] }, // Renamed to distinct from Clap
  {
    type: 'audio',
    name: 'Clap',
    role: 'core',
    tags: ['pop', 'hip-hop', 'electronic'],
  },
  {
    type: 'audio',
    name: 'Drum Overheads',
    role: 'core',
    tags: ['rock', 'pop'],
  },
  {
    type: 'midi',
    name: 'Electronic Drum Kit',
    instrument: 'drums',
    role: 'core',
    tags: ['electronic', 'hip-hop'],
  },

  // --- BASS ---
  {
    type: 'midi',
    name: 'Sub Bass',
    instrument: 'bass',
    synthPreset: 'sub-bass',
    role: 'core',
    tags: ['hip-hop', 'electronic'],
  },
  {
    type: 'midi',
    name: 'Reese Bass',
    instrument: 'bass',
    synthPreset: 'reese',
    role: 'core',
    tags: ['electronic'],
  },
  {
    type: 'midi',
    name: 'Plucked Bass',
    instrument: 'bass',
    synthPreset: 'slap-bass',
    role: 'core',
    tags: ['pop', 'funk'],
  },
  {
    type: 'midi',
    name: 'Synth Bass',
    instrument: 'bass',
    synthPreset: 'analog-bass',
    role: 'core',
    tags: ['all'],
  },

  // --- PERCUSSION ---
  {
    type: 'midi',
    name: 'Closed Hi-hat',
    instrument: 'hihat',
    synthPreset: 'tight-hat',
    role: 'percussion',
    tags: ['electronic', 'hip-hop', 'pop'],
  },
  {
    type: 'midi',
    name: 'Open Hi-hat',
    instrument: 'hihat',
    synthPreset: 'open-hat',
    role: 'percussion',
    tags: ['electronic', 'hip-hop'],
  },
  {
    type: 'midi',
    name: 'Shaker',
    instrument: 'percussion',
    synthPreset: 'shaker',
    role: 'percussion',
    tags: ['pop', 'house'],
  },
  {
    type: 'audio',
    name: 'Top Loop',
    role: 'percussion',
    tags: ['electronic', 'house'],
  },
  {
    type: 'audio',
    name: 'Foley Textures',
    role: 'percussion',
    tags: ['ambient', 'lo-fi'],
  },

  // --- HARMONY ---
  {
    type: 'midi',
    name: 'Grand Piano',
    instrument: 'piano',
    synthPreset: 'grand-piano',
    role: 'harmony',
    tags: ['pop', 'ballad'],
  },
  {
    type: 'midi',
    name: 'Electric Keys',
    instrument: 'keys',
    synthPreset: 'rhodes',
    role: 'harmony',
    tags: ['hip-hop', 'rnb', 'pop'],
  },
  {
    type: 'midi',
    name: 'Super Saw Chords',
    instrument: 'synth',
    synthPreset: 'super-saw',
    role: 'harmony',
    tags: ['electronic', 'edm'],
  },
  {
    type: 'midi',
    name: 'Warm Pad',
    instrument: 'pad',
    synthPreset: 'warm-pad',
    role: 'harmony',
    tags: ['electronic', 'ambient', 'pop'],
  },
  {
    type: 'midi',
    name: 'Acoustic Guitar',
    instrument: 'guitar',
    synthPreset: 'nylon',
    role: 'harmony',
    tags: ['pop', 'lo-fi'],
  },

  // --- MELODY ---
  {
    type: 'midi',
    name: 'Lead Synth',
    instrument: 'lead',
    synthPreset: 'bright-lead',
    role: 'melody',
    tags: ['electronic', 'pop'],
  },
  {
    type: 'midi',
    name: 'Pluck Melody',
    instrument: 'pluck',
    synthPreset: 'short-pluck',
    role: 'melody',
    tags: ['electronic', 'pop', 'house'],
  },
  {
    type: 'midi',
    name: 'Arpeggiator',
    instrument: 'arp',
    synthPreset: 'sync-arp',
    role: 'melody',
    tags: ['electronic'],
  },
  {
    type: 'midi',
    name: 'Brass Stabs',
    instrument: 'brass',
    synthPreset: 'synth-brass',
    role: 'melody',
    tags: ['hip-hop', 'trap', 'pop'],
  },
  {
    type: 'midi',
    name: 'Bell / Mallet',
    instrument: 'bells',
    synthPreset: 'soft-bell',
    role: 'melody',
    tags: ['ambient', 'electronic', 'hip-hop'],
  },

  // --- FX / VOCALS ---
  {
    type: 'audio',
    name: 'Riser / Sweep',
    role: 'fx',
    tags: ['electronic', 'pop'],
  },
  {
    type: 'audio',
    name: 'Impact',
    role: 'fx',
    tags: ['electronic', 'cinematic'],
  },
  {
    type: 'audio',
    name: 'Vocal Chops',
    role: 'melody',
    tags: ['electronic', 'pop'],
  },
  {
    type: 'audio',
    name: 'Vinyl Crackle',
    role: 'fx',
    tags: ['lo-fi', 'hip-hop'],
  },
];

function scoreTemplateForGenre(t: TrackTemplate, genre?: string): number {
  if (!genre) return 1; // neutral

  const g = genre.toLowerCase();
  const genreKey =
    g.includes('hip-hop') || g.includes('rap')
      ? 'hip-hop'
      : g.includes('edm') || g.includes('electronic')
      ? 'electronic'
      : g.includes('ambient')
      ? 'ambient'
      : g.includes('pop')
      ? 'pop'
      : 'all';

  if (!t.tags || t.tags.includes('all')) return 1;

  if (t.tags.includes(genreKey)) return 2; // prefer these
  return 0.3; // still allowed but lower priority
}

// Helper to shuffle array (Fisher-Yates)
function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length,
    randomIndex;
  while (currentIndex != 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }
  return array;
}

function pickTracks({
  genre,
  includeAudio,
  trackCount,
}: {
  genre?: string;
  includeAudio: boolean;
  trackCount: number;
}): TrackTemplate[] {
  // 1. Filter by Type (Audio/MIDI)
  let validPool = BASE_TEMPLATES.filter((t) =>
    includeAudio ? true : t.type === 'midi'
  );

  // 2. Score and Shuffle
  // We attach a score, then SHUFFLE so that ties are broken randomly
  let candidates = validPool.map((t) => ({
    template: t,
    score: scoreTemplateForGenre(t, genre),
    // Add a tiny random jitter to the score to prevent strict alphabetical sorting issues
    randomizer: Math.random(),
  }));

  // Sort by Score (High to Low), then by Randomizer
  candidates.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return b.randomizer - a.randomizer;
  });

  const selected: TrackTemplate[] = [];
  const seenNames = new Set<string>();

  const addTrack = (t: TrackTemplate) => {
    if (!seenNames.has(t.name)) {
      selected.push(t);
      seenNames.add(t.name);
    }
  };

  // 3. Fulfill Essential ROLES (Not specific track names)
  // instead of forcing "Kick", we look for the highest scoring "core" item

  // A. Ensure at least one Rhythm/Core
  const rhythm = candidates.find((c) => c.template.role === 'core');
  if (rhythm) addTrack(rhythm.template);

  // B. Ensure at least one Bass (specifically instrument: bass or name includes bass)
  const bass = candidates.find(
    (c) =>
      !seenNames.has(c.template.name) &&
      (c.template.instrument === 'bass' ||
        c.template.name.toLowerCase().includes('bass'))
  );
  if (bass) addTrack(bass.template);

  // C. Ensure at least one Melody or Harmony
  const melodic = candidates.find(
    (c) =>
      !seenNames.has(c.template.name) &&
      (c.template.role === 'melody' || c.template.role === 'harmony')
  );
  if (melodic) addTrack(melodic.template);

  // 4. Fill the rest based on Score + Random Shuffle
  // We re-shuffle the candidates array slightly to ensure we don't just pick top-down linearly every time
  // if the scores are close.
  const remainingSlots = Math.max(trackCount - selected.length, 0);

  // Filter out what we already picked
  let poolToPickFrom = candidates.filter(
    (c) => !seenNames.has(c.template.name)
  );

  // If we want audio/midi balance, we can apply logic here,
  // otherwise just pick top scorers from the shuffled list
  for (const c of poolToPickFrom) {
    if (selected.length >= trackCount) break;
    addTrack(c.template);
  }

  // 5. Final Shuffle of the Output (optional, so they aren't listed in importance order)
  return shuffle(selected);
}

const suggestComprehensiveTracksTool = new DynamicStructuredTool({
  name: 'suggest_comprehensive_tracks',
  description:
    'Generate a comprehensive list of 5-8 varied track suggestions for a music project. Use this when the user asks for track ideas, suggestions, or what tracks to create. This includes a mix of MIDI tracks with different synth presets and audio tracks.',
  schema: z.object({
    genre: z
      .string()
      .optional()
      .describe(
        'Music genre or style (e.g., "electronic", "hip-hop", "pop", "ambient")'
      ),
    includeAudio: z
      .boolean()
      .default(true)
      .describe('Whether to include audio track suggestions'),
    trackCount: z
      .number()
      .min(8)
      .max(15)
      .default(5)
      .describe('Number of tracks to suggest (5-8, default 5)'),
  }),
  func: async ({ genre, includeAudio = true, trackCount = 5 }) => {
    const selected = pickTracks({ genre, includeAudio, trackCount });

    const actions: DAWAction[] = [];

    for (const t of selected) {
      if (t.type === 'audio') {
        actions.push({
          type: 'create_track',
          trackType: 'audio',
          trackName: t.name,
          reasoning: `Suggested audio track: ${t.name}`,
        });
      } else {
        const instrument = t.instrument || 'piano';
        const midiActions = generateActionsForInstrument(t.name, instrument);
        actions.push(...midiActions);
      }
    }

    return JSON.stringify({
      success: true,
      suggestions: selected,
      actions,
      message: `Here’s a structured setup with ${
        selected.length
      } tracks, balanced between MIDI and audio and tuned for ${
        genre || 'a general modern production'
      }.`,
    });
  },
});

const adjustBpmTool = new DynamicStructuredTool({
  name: 'adjust_bpm',
  description: 'Change the project tempo/BPM',
  schema: z.object({
    bpm: z.number().min(40).max(240).describe('New BPM value (40-240)'),
  }),
  func: async ({ bpm }) => {
    return JSON.stringify({
      success: true,
      actions: [
        {
          type: 'adjust_bpm',
          bpm,
          reasoning: `Setting BPM to ${bpm}`,
        },
      ],
    });
  },
});

const adjustVolumeTool = new DynamicStructuredTool({
  name: 'adjust_volume',
  description: 'Adjust the volume of a specific track',
  schema: z.object({
    trackName: z.string().describe('Name of the track to adjust'),
    volume: z
      .number()
      .min(0)
      .max(1)
      .describe('Volume level from 0 to 1 (0% to 100%)'),
  }),
  func: async ({ trackName, volume }) => {
    return JSON.stringify({
      success: true,
      actions: [
        {
          type: 'adjust_volume',
          trackName,
          volume,
          reasoning: `Adjusting ${trackName} volume to ${Math.round(
            volume * 100
          )}%`,
        },
      ],
    });
  },
});

const deleteTrackTool = new DynamicStructuredTool({
  name: 'delete_track',
  description: 'Delete an existing track',
  schema: z.object({
    trackName: z.string().describe('Name of the track to delete'),
  }),
  func: async ({ trackName }) => {
    return JSON.stringify({
      success: true,
      actions: [
        {
          type: 'delete_track',
          trackName,
          reasoning: `Deleting track ${trackName}`,
        },
      ],
    });
  },
});

const renameTrackTool = new DynamicStructuredTool({
  name: 'rename_track',
  description:
    "Rename an existing track. Use this when the user wants to change a track's name.",
  schema: z.object({
    trackName: z.string().describe('Current name of the track to rename'),
    newTrackName: z.string().describe('New name for the track'),
  }),
  func: async ({ trackName, newTrackName }) => {
    const normalizedNewName = normalizeTrackName(newTrackName);
    return JSON.stringify({
      success: true,
      actions: [
        {
          type: 'rename_track',
          trackName,
          newTrackName: normalizedNewName,
          reasoning: `Renaming track "${trackName}" to "${normalizedNewName}"`,
        },
      ],
    });
  },
});

const muteTracksTool = new DynamicStructuredTool({
  name: 'mute_tracks',
  description: 'Mute one or more tracks by name or pattern',
  schema: z.object({
    pattern: z
      .string()
      .describe(
        'Track name or pattern to match (e.g., "drum" matches all drum tracks)'
      ),
  }),
  func: async ({ pattern }) => {
    return JSON.stringify({
      success: true,
      actions: [
        {
          type: 'mute_tracks',
          trackPattern: pattern,
          reasoning: `Muting tracks matching "${pattern}"`,
        },
      ],
    });
  },
});

const unmuteTracksTool = new DynamicStructuredTool({
  name: 'unmute_tracks',
  description: 'Unmute one or more tracks by name or pattern',
  schema: z.object({
    pattern: z.string().describe('Track name or pattern to match'),
  }),
  func: async ({ pattern }) => {
    return JSON.stringify({
      success: true,
      actions: [
        {
          type: 'unmute_tracks',
          trackPattern: pattern,
          reasoning: `Unmuting tracks matching "${pattern}"`,
        },
      ],
    });
  },
});

const toggleMetronomeTool = new DynamicStructuredTool({
  name: 'toggle_metronome',
  description: 'Turn the metronome on or off',
  schema: z.object({
    enabled: z.boolean().describe('True to turn on, false to turn off'),
  }),
  func: async ({ enabled }) => {
    return JSON.stringify({
      success: true,
      actions: [
        {
          type: 'toggle_metronome',
          metronomeEnabled: enabled,
          reasoning: `${enabled ? 'Enabling' : 'Disabling'} metronome`,
        },
      ],
    });
  },
});

/**
 * Maps instrument names to audio library sample IDs
 * Returns the sample ID if found, or null if it should use synth instead
 */
function getSampleIdForInstrument(instrument: string): string | null {
  const lowerInstrument = instrument.toLowerCase();
  
  // Map instrument names to sample IDs from audio library
  const instrumentToSampleMap: Record<string, string> = {
    // Instruments
    'bass': 'bass',
    'guitar': 'guitar',
    'piano': 'piano',
    'trumpet': 'trumpet',
    // House drums
    'house-clap': 'house-clap',
    'house-hihat': 'house-hihat',
    'house-hi-hat': 'house-hihat',
    'house-kick': 'house-kick',
    // Rap drums
    '808': 'rap-808',
    'rap-808': 'rap-808',
    'rap-clap': 'rap-clap',
    'rap-hat': 'rap-hat',
    'rap-hihat': 'rap-hat',
    'rap-hi-hat': 'rap-hat',
    'rap-kick': 'rap-kick',
    // Rock drums
    'rock-hat': 'rock-hat',
    'rock-hihat': 'rock-hat',
    'rock-hi-hat': 'rock-hat',
    'rock-kick': 'rock-kick',
    'rock-open-hat': 'rock-open-hat',
    'rock-open-hihat': 'rock-open-hat',
    'rock-snare': 'rock-snare',
    // Generic drum names (default to house style)
    'hihat': 'house-hihat',
    'hi-hat': 'house-hihat',
    'clap': 'house-clap',
    'kick': 'house-kick',
    'snare': 'rock-snare',
    'open-hat': 'rock-open-hat',
    'open-hihat': 'rock-open-hat',
  };

  return instrumentToSampleMap[lowerInstrument] || null;
}

/**
 * Helper function to generate actions for a specific instrument
 * Now supports all samples from the audio library
 */
function generateActionsForInstrument(
  trackName: string,
  instrument: string
): DAWAction[] {
  const actions: DAWAction[] = [];

  // Create track
  actions.push({
    type: 'create_track',
    trackType: 'midi',
    trackName,
    reasoning: `Creating MIDI track for ${instrument}`,
  });

  // Check if this instrument should use a sampler sample
  const sampleId = getSampleIdForInstrument(instrument);
  
  if (sampleId) {
    // Use sampler with audio file from library
    const audioFile = getAudioFileById(sampleId);
    if (audioFile) {
      actions.push({
        type: 'set_instrument_mode',
        trackName,
        instrumentMode: 'sampler',
        reasoning: `Setting ${trackName} to sampler mode`,
      });

      actions.push({
        type: 'select_instrument',
        trackName,
        instrumentPath: audioFile.path,
        reasoning: `Loading ${audioFile.name} sample`,
      });
    } else {
      // Fallback: if sample not found, use synth
      console.warn(`Sample not found for instrument: ${instrument}, using synth instead`);
      actions.push({
        type: 'set_instrument_mode',
        trackName,
        instrumentMode: 'synth',
        reasoning: `Setting ${trackName} to synth mode`,
      });

      actions.push({
        type: 'set_synth_preset',
        trackName,
        synthPreset: instrument,
        reasoning: `Applying ${instrument} preset`,
      });
    }
  } else {
    // Use synth for instruments not in sample library
    actions.push({
      type: 'set_instrument_mode',
      trackName,
      instrumentMode: 'synth',
      reasoning: `Setting ${trackName} to synth mode`,
    });

    actions.push({
      type: 'set_synth_preset',
      trackName,
      synthPreset: instrument,
      reasoning: `Applying ${instrument} preset`,
    });
  }

  return actions;
}

const tools = [
  createTrackWithInstrumentTool,
  createEmptyTrackTool,
  createAudioTrackTool,
  suggestComprehensiveTracksTool,
  adjustBpmTool,
  adjustVolumeTool,
  deleteTrackTool,
  renameTrackTool,
  muteTracksTool,
  unmuteTracksTool,
  toggleMetronomeTool,
];

/**
 * Detect if user message is requesting an action (vs just asking a question)
 */
function isActionRequest(message: string): boolean {
  const lowerMessage = message.toLowerCase();

  // Exclude question/suggestion requests
  const questionKeywords = [
    'what',
    'suggest',
    'ideas',
    'recommend',
    'should i',
    'what should',
    'give me ideas',
    'what tracks',
    'list',
    'show me',
  ];

  // If it's clearly a question/suggestion request, don't treat as action
  if (questionKeywords.some((keyword) => lowerMessage.includes(keyword))) {
    return false;
  }

  const actionKeywords = [
    'create',
    'add',
    'make',
    'set',
    'adjust',
    'change',
    'delete',
    'remove',
    'mute',
    'unmute',
    'solo',
    'turn on',
    'turn off',
    'enable',
    'disable',
    'build',
    'generate',
    'put',
    'place',
  ];
  return actionKeywords.some((keyword) => lowerMessage.includes(keyword));
}

// Helper function to format song context for prompts
function formatSongContext(spec: SongSpec): string {
  const bpm = spec.bpm ?? spec.aggregate?.bpm ?? 'not set';
  const key = spec.key ?? spec.aggregate?.key ?? 'not set';
  const scale = spec.scale ?? spec.aggregate?.scale ?? '';
  const genre = spec.genre ?? 'not set';
  const mood = Array.isArray(spec.mood)
    ? spec.mood.join(', ')
    : spec.mood ?? 'not set';
  const instruments =
    Array.isArray(spec.instruments) && spec.instruments.length > 0
      ? spec.instruments.join(', ')
      : 'not set';
  const chords =
    spec.chordProgression && Array.isArray(spec.chordProgression.global)
      ? spec.chordProgression.global.join(' → ')
      : 'not set';

  return `
**Song Context (Overall Vision):**
- Genre: ${genre}
- Mood: ${mood}
- BPM: ${bpm}
- Key: ${key}${scale ? ` ${scale}` : ''}
- Instruments: ${instruments}
- Chord Progression: ${chords}
`;
}

/**
 * DAW Assistant Agent with Tool Calling
 *
 * This agent helps users with their DAW workflow by:
 * - Creating and deleting tracks (MIDI and audio)
 * - Adjusting track volumes
 * - Setting BPM
 * - Selecting instruments for MIDI tracks
 * - Providing creative suggestions for what to do next
 */
async function dawAssistantAgent(
  message: string,
  dawState: DAWAssistantRequest['dawState'],
  userContext?: string,
  songContext?: SongSpec,
  retryCount = 0
): Promise<DAWAssistantResponse> {
  try {
    // Build the system prompt with current DAW state
    const isAction = isActionRequest(message);
    const actionEmphasis = isAction
      ? `\n⚠️ CRITICAL: The user is requesting an ACTION. You MUST call the appropriate tool(s) to perform the action. DO NOT just describe what you will do - actually call the tool(s) now!\n`
      : '';

    const songContextText = songContext ? formatSongContext(songContext) : '';
    const systemPrompt = `You are an expert music production assistant integrated into a Digital Audio Workstation (DAW). 
Your primary job is to PERFORM ACTIONS when users request them, not just describe what you would do.

${songContextText}
${actionEmphasis}

**CRITICAL RULES:**
1. When a user requests an action (create, add, make, set, adjust, delete, mute, etc.), you MUST call the appropriate tool(s) immediately
2. DO NOT respond with text like "I'll create a track" - instead, CALL THE TOOL to actually create it
3. Only provide conversational responses when the user is asking questions or seeking advice
4. If you're unsure which tool to use, choose the most appropriate one based on the user's intent

**Current DAW State:**
- BPM: ${dawState.bpm}
- Metronome: ${dawState.metronomeEnabled ? 'ON' : 'OFF'}
- Number of tracks: ${dawState.tracks.length}
${
  dawState.tracks.length > 0
    ? `- Tracks:\n${dawState.tracks
        .map((t) => {
          let trackInfo = `  • ${t.name} (${t.type.toUpperCase()}) - Volume: ${(
            t.volume * 100
          ).toFixed(0)}%, ${t.muted ? 'MUTED' : 'ACTIVE'}${
            t.solo ? ', SOLO' : ''
          }`;
          if (t.type === 'midi') {
            if (t.instrumentMode === 'synth' && t.synthPreset) {
              trackInfo += ` - Synth: ${t.synthPreset}`;
            } else if (t.instrumentMode === 'sampler' && t.samplerAudioUrl) {
              trackInfo += ` - Sampler: ${t.samplerAudioUrl}`;
            } else if (t.instrumentMode === null) {
              trackInfo += ` - ⚠️ NO INSTRUMENT SET`;
            }
          }
          return trackInfo;
        })
        .join('\n')}`
    : '- No tracks yet'
}

${userContext ? `**User Context:** ${userContext}` : ''}

**Available Tools (USE THESE TO PERFORM ACTIONS):**
- create_track_with_instrument: Create a MIDI track with a specific instrument. Supports both synth instruments (piano, bass, lead, pad, bells, pluck) and sampler instruments (guitar, trumpet, and all drum samples). USE THIS when user wants a track with a specific instrument.
- create_empty_track: Create an empty MIDI track (when you want to ask user what instrument they want)
- create_audio_track: Create an audio track for audio files/loops. USE THIS when user wants an audio track or for drums, vocals, recorded instruments.
- suggest_comprehensive_tracks: Generate a comprehensive list of 5-8 varied track suggestions. USE THIS when user asks for track ideas, suggestions, or "what tracks should I create". This creates a full, varied track setup with different synth presets AND audio tracks.
- adjust_bpm: Change the project tempo. USE THIS when user asks to change BPM or tempo.
- adjust_volume: Adjust volume of a specific track. USE THIS when user wants to change track volume.
- delete_track: Delete a track. USE THIS when user wants to remove a track.
- rename_track: Rename an existing track. USE THIS when user wants to change a track's name (e.g., "rename Piano to Dark Piano"). Can be called MULTIPLE times in one response to rename multiple tracks. When user asks to rename tracks but doesn't specify new names, suggest descriptive names based on the track's instrument/purpose.
- mute_tracks: Mute tracks by pattern. USE THIS when user wants to mute tracks.
- unmute_tracks: Unmute tracks by pattern. USE THIS when user wants to unmute tracks.
- toggle_metronome: Turn metronome on/off. USE THIS when user wants to enable/disable metronome.

**Instrument Mapping & Track Naming:**

**Synth Instruments (use synthesized sounds):**
- Piano, Keyboard → instrument: "piano"
- Bass, Sub Bass → instrument: "bass"
- Guitar (lead), Lead Guitar → instrument: "lead"
- Pad, Atmosphere, Synth Pad → instrument: "pad"
- Bells, Chimes → instrument: "bells"
- Strings, Pluck, Arp → instrument: "pluck"

**Sampler Instruments (use audio samples from library):**
- Guitar (acoustic/electric) → instrument: "guitar"
- Trumpet, Brass → instrument: "trumpet"
- 808, 808 Bass → instrument: "808"
- Hi-hat, Hi Hat, Hihat → instrument: "hihat" (defaults to house style)
- Clap, Claps → instrument: "clap" (defaults to house style)
- Kick, Kick Drum → instrument: "kick" (defaults to house style)
- Snare, Snare Drum → instrument: "snare" (defaults to rock style)
- Open Hi-hat, Open Hat → instrument: "open-hat" (defaults to rock style)

**Genre-Specific Drum Samples:**
- House Drums: "house-clap", "house-hihat", "house-kick"
- Rap/Hip-Hop Drums: "808", "rap-clap", "rap-hat", "rap-kick"
- Rock Drums: "rock-hat", "rock-kick", "rock-open-hat", "rock-snare"

**Note:** When user requests generic drum names (hihat, clap, kick, snare), use the generic instrument names which will default to appropriate styles. For specific genres, use the genre-specific names (house-, rap-, rock-).

**Track Naming Guidelines:**
- DEFAULT: Use clean names like "Piano", "Bass", "Guitar", "Drums", "Vocals", "Pad" etc.
- USER PREFERENCE: If user specifies a custom name, USE IT! Examples:
  * User: "Create a piano track called Evening Keys" → trackName: "Evening Keys"
  * User: "Add a bass named Sub Bass" → trackName: "Sub Bass"
  * User: "Create a lead guitar called Riff 1" → trackName: "Riff 1"
- FLEXIBILITY: Respect the user's naming choice. They might want:
  * Numbered variations: "Bass 1", "Bass 2"
  * Descriptive names: "Dark Piano", "Aggressive Bass"
  * Generic defaults: "Piano", "Bass", "Guitar"
- AVOID: Redundant words like "Track" or "Channel" (e.g., "Piano Track" → "Piano")

**Examples of CORRECT behavior:**
- User: "Create a piano track" → trackName="Piano", instrument="piano"
- User: "Add a bass track" → trackName="Bass", instrument="bass"
- User: "Add a guitar" → trackName="Guitar", instrument="guitar" (uses sampler sample)
- User: "Add a lead guitar" → trackName="Lead Guitar", instrument="lead" (uses synth)
- User: "Create a piano called Dark Piano" → trackName="Dark Piano", instrument="piano"
- User: "Add a bass named Sub Bass" → trackName="Sub Bass", instrument="bass"
- User: "Create drums called Beat 1" → trackName="Beat 1"
- User: "Rename Piano to Dark Piano" → You MUST call rename_track with trackName="Piano", newTrackName="Dark Piano"
- User: "Change the bass track name to Sub Bass" → You MUST call rename_track with trackName="Bass", newTrackName="Sub Bass"
- User: "Rename all tracks so I understand what they do" → You MUST call rename_track MULTIPLE times with descriptive names based on instruments (e.g., Piano → "Melody Piano", Bass → "Sub Bass", Guitar → "Lead Guitar", etc.)
- User: "Make the track names more descriptive" → You MUST call rename_track for each track with clearer names
- User: "Change track names to show their purpose" → You MUST call rename_track multiple times with purpose-based names
- User: "Set BPM to 128" → You MUST call adjust_bpm with bpm=128
- User: "Make a drum track" → You MUST call create_track_with_instrument (use "kick" for kick, "hihat" for hi-hat, "clap" for clap, "snare" for snare)
- User: "Add a trumpet" → trackName="Trumpet", instrument="trumpet" (uses sampler sample)
- User: "Add an 808" → trackName="808", instrument="808" (uses rap 808 sample)
- User: "What tracks should I create?" → You MUST call suggest_comprehensive_tracks (creates 5-8 varied tracks)
- User: "Give me track ideas" → You MUST call suggest_comprehensive_tracks (creates 5-8 varied tracks)
- User: "Suggest some tracks" → You MUST call suggest_comprehensive_tracks (creates 5-8 varied tracks)

**Examples of INCORRECT behavior (DO NOT DO THIS):**
- User: "Create a piano track" → ❌ WRONG: "I'll create a piano track for you" (without calling tool)
- User: "Add a bass track" → ❌ WRONG: "Sure, I can add a bass track" (without calling tool)
- User: "Create a piano track" → ❌ WRONG: trackName="Piano Track" (redundant "Track" - just use "Piano")
- User: "Add drums" → ❌ WRONG: trackName="Drum Track" (redundant "Track" - just use "Drums")

**Guidelines:**
- When user requests specific instruments, use create_track_with_instrument tool multiple times (once per track)
- When user asks for track ideas, suggestions, or "what tracks should I create", ALWAYS use suggest_comprehensive_tracks tool to generate 8-12 varied tracks
- The suggest_comprehensive_tracks tool should create a MIX of:
  * MIDI tracks with DIFFERENT synth presets (piano, bass, lead, pad, bells, pluck) - NOT all the same!
  * Audio tracks (drums, vocals, recorded instruments)
  * Variety is key - don't suggest 4 similar tracks, suggest 5-8 with different instruments and types
- For house beats, typically use: kick (bass), bass, hihat, clap, and set BPM to 120-128
- Be conversational in your text response AFTER calling tools, but ALWAYS call tools first for action requests
- If user doesn't specify instrument, use create_empty_track and ask them what they want
- When suggesting tracks, always aim for comprehensive variety: different synth types, audio tracks, percussion, melodic elements
- **IMPORTANT FOR RENAMING**: When user asks to rename tracks but doesn't specify new names (e.g., "rename tracks so I understand them", "make names descriptive"), YOU MUST:
  1. Look at the current track list in dawState
  2. Call rename_track tool MULTIPLE times (once per track)
  3. Give each track a descriptive name based on its instrument/type (e.g., "Piano" → "Melody Piano", "Bass" → "Sub Bass", "Guitar" → "Lead Guitar", "Drums" → "Drum Kit")
  4. Be creative and descriptive - help the user understand each track's purpose

**Track Suggestion Examples:**
- User: "What tracks should I create?" → Call suggest_comprehensive_tracks (creates 5-8 varied tracks)
- User: "Give me track ideas" → Call suggest_comprehensive_tracks (creates 5-8 varied tracks)
- User: "Suggest some tracks" → Call suggest_comprehensive_tracks (creates 5-8varied tracks)
- User: "What should I add?" → Call suggest_comprehensive_tracks (creates 5-8 varied tracks)

Now help the user with their request. Remember: ACTIONS REQUIRE TOOL CALLS!`;

    // Bind tools to the LLM
    const llmWithTools = llm.bindTools(tools);

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(message),
    ];

    console.log('🎵 DAW Assistant with tools analyzing request...');
    const response = await llmWithTools.invoke(messages);

    // Extract tool calls and text response
    const toolCalls = response.tool_calls || [];

    // Handle content properly - it might be a string or array
    let textResponse = '';
    if (typeof response.content === 'string') {
      textResponse = response.content;
    } else if (Array.isArray(response.content)) {
      // If it's an array, join text parts
      textResponse = response.content
        .filter((item) => typeof item === 'string' || item.type === 'text')
        .map((item) => (typeof item === 'string' ? item : item.text || ''))
        .join(' ');
    } else {
      textResponse = String(response.content || '');
    }

    console.log('🎹 Tool calls:', toolCalls.length);
    console.log('💬 Response:', textResponse.substring(0, 200));

    let allActions: DAWAction[] = [];
    let finalMessage = textResponse;
    let suggestions: string[] = [];

    // If we got tool calls, process them (preferred path)
    if (toolCalls.length > 0) {
      console.log('✅ Processing tool calls...');
      for (const toolCall of toolCalls) {
        try {
          const tool = tools.find((t) => t.name === toolCall.name);
          if (tool) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = await tool.func(toolCall.args as any);
            const parsed = JSON.parse(result);
            if (parsed.actions) {
              allActions.push(...parsed.actions);
            }
          }
        } catch (error) {
          console.error('Error executing tool:', toolCall.name, error);
        }
      }

      suggestions = [
        'Create more tracks',
        'Adjust the BPM',
        'Get mixing suggestions',
      ];
    } else if (textResponse.includes('{') && textResponse.includes('actions')) {
      // Fallback: LLM generated JSON response instead of tool calls
      console.log('⚠️ No tool calls, trying to parse JSON fallback...');
      try {
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log('🎹 DAW Assistant Decision:', parsed);

          if (parsed.actions && Array.isArray(parsed.actions)) {
            allActions = parsed.actions;
            finalMessage = parsed.message || textResponse;
            suggestions = parsed.suggestions || [
              'Create more tracks',
              'Adjust the BPM',
              'Get mixing suggestions',
            ];
            console.log(
              '✅ Parsed fallback JSON with',
              allActions.length,
              'actions'
            );
          }
        }
      } catch (parseError) {
        console.error('Failed to parse fallback JSON:', parseError);
        finalMessage =
          "I understood your request but couldn't format the response properly. Please try again.";
      }
    } else {
      // No tool calls and no JSON fallback
      // Check if this was an action request - if so, retry with stronger prompt
      if (isActionRequest(message) && retryCount === 0) {
        console.log(
          '⚠️ Action requested but no tools called. Retrying with stronger prompt...'
        );
        // Retry with a more explicit prompt
        const retryPrompt = `${message}\n\nIMPORTANT: You must call the appropriate tool(s) to perform this action. Do not just describe what you will do - actually call the tool(s) now.`;
        return dawAssistantAgent(
          retryPrompt,
          dawState,
          userContext,
          songContext,
          1
        );
      }

      // Pure conversational response with no actions
      suggestions = [
        'Create more tracks',
        'Adjust the BPM',
        'Get mixing suggestions',
      ];
    }

    console.log('✅ Final action count:', allActions.length);

    return {
      success: true,
      message:
        finalMessage ||
        "I'm here to help with your DAW! You can ask me to create tracks, adjust settings, or get suggestions.",
      actions: allActions,
      suggestions,
    };
  } catch (error) {
    console.error('❌ DAW Assistant agent error:', error);
    return {
      success: false,
      message: 'Sorry, I encountered an error processing your request.',
      actions: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DAWAssistantRequest & {
      songId?: string;
    };
    const { message, dawState, userContext, songId = 'default' } = body;

    // Validate required fields
    if (!message || !dawState) {
      return NextResponse.json(
        { error: 'Missing required fields: message or dawState' },
        { status: 400 }
      );
    }

    // Fetch song context
    const songContext = await loadSongSpec(songId);

    // Run the agent
    const result = await dawAssistantAgent(
      message,
      dawState,
      userContext,
      songContext
    );

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Failed to process DAW assistant request' },
      { status: 500 }
    );
  }
}
