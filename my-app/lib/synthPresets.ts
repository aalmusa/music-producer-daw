// lib/synthPresets.ts
import * as Tone from 'tone';

export type SynthPresetName = 
  | 'piano'
  | 'bass'
  | 'lead'
  | 'pad'
  | 'bells'
  | 'pluck';

export interface EffectsChain {
  reverb?: {
    wet: number;
    decay: number;
    preDelay: number;
  };
  delay?: {
    wet: number;
    delayTime: string;
    feedback: number;
  };
  chorus?: {
    wet: number;
    frequency: number;
    delayTime: number;
    depth: number;
  };
  distortion?: {
    wet: number;
    distortion: number;
  };
  compressor?: {
    threshold: number;
    ratio: number;
    attack: number;
    release: number;
  };
  eq?: {
    low: number;
    mid: number;
    high: number;
  };
  phaser?: {
    wet: number;
    frequency: number;
    octaves: number;
    baseFrequency: number;
  };
  tremolo?: {
    wet: number;
    frequency: number;
    depth: number;
  };
  vibrato?: {
    wet: number;
    frequency: number;
    depth: number;
  };
}

export interface SynthPreset {
  name: SynthPresetName;
  displayName: string;
  icon: string;
  description: string;
  synthType: 'Synth' | 'FMSynth' | 'AMSynth' | 'MonoSynth' | 'PluckSynth' | 'MetalSynth';
  options: any; // Tone.js synth options
  effects?: EffectsChain; // Effects chain configuration
}

export const synthPresets: Record<SynthPresetName, SynthPreset> = {
  piano: {
    name: 'piano',
    displayName: 'Piano',
    icon: '🎹',
    description: 'Electric piano with FM synthesis',
    synthType: 'FMSynth',
    options: {
      harmonicity: 3,
      modulationIndex: 12.22,
      oscillator: {
        type: 'sine',
      },
      envelope: {
        attack: 0.01,
        decay: 0.2,
        sustain: 0.2,
        release: 1.5,
      },
      modulation: {
        type: 'square',
      },
      modulationEnvelope: {
        attack: 0.2,
        decay: 0.01,
        sustain: 0,
        release: 0.5,
      },
    },
    effects: {
      reverb: {
        wet: 0.3,
        decay: 2.5,
        preDelay: 0.01,
      },
      chorus: {
        wet: 0.4,
        frequency: 1.5,
        delayTime: 3.5,
        depth: 0.7,
      },
      compressor: {
        threshold: -24,
        ratio: 4,
        attack: 0.003,
        release: 0.25,
      },
      eq: {
        low: 0,
        mid: 2,
        high: 3,
      },
      tremolo: {
        wet: 0.15,
        frequency: 4,
        depth: 0.3,
      },
    },
  },
  
  bass: {
    name: 'bass',
    displayName: 'Bass',
    icon: '🎸',
    description: 'Deep bass synth',
    synthType: 'MonoSynth',
    options: {
      oscillator: {
        type: 'square8',
      },
      filter: {
        Q: 1.5,
        type: 'lowpass',
        rolloff: -24,
        frequency: 200, // Tighter low-end control
      },
      envelope: {
        attack: 0.05,
        decay: 0.3,
        sustain: 0.4,
        release: 0.8,
      },
      filterEnvelope: {
        attack: 0.001,
        decay: 0.7,
        sustain: 0.1,
        release: 0.8,
        baseFrequency: 100, // Lower starting frequency
        octaves: 3, // Less sweep range
      },
    },
    effects: {
      distortion: {
        wet: 0.2, // Less distortion
        distortion: 0.3,
      },
      compressor: {
        threshold: -24, // Less compression
        ratio: 6,
        attack: 0.003,
        release: 0.15,
      },
      eq: {
        low: 0, // Remove excessive low boost
        mid: -1,
        high: -6, // Cut more highs to focus on mids
      },
      reverb: {
        wet: 0.05, // Less reverb for tighter bass
        decay: 0.5,
        preDelay: 0.01,
      },
    },
  },

  lead: {
    name: 'lead',
    displayName: 'Lead',
    icon: '⚡',
    description: 'Bright lead synth',
    synthType: 'Synth',
    options: {
      oscillator: {
        type: 'amtriangle',
        harmonicity: 0.5,
        modulationType: 'sine',
      },
      envelope: {
        attackCurve: 'exponential',
        attack: 0.05,
        decay: 0.2,
        sustain: 0.2,
        release: 1.5,
      },
      portamento: 0.05,
    },
    effects: {
      delay: {
        wet: 0.25,
        delayTime: '8n',
        feedback: 0.3,
      },
      reverb: {
        wet: 0.25,
        decay: 1.5,
        preDelay: 0.02,
      },
      phaser: {
        wet: 0.5,
        frequency: 0.5,
        octaves: 3,
        baseFrequency: 350,
      },
      compressor: {
        threshold: -20,
        ratio: 6,
        attack: 0.005,
        release: 0.2,
      },
      eq: {
        low: -3,
        mid: 3,
        high: 5,
      },
    },
  },

  pad: {
    name: 'pad',
    displayName: 'Pad',
    icon: '🌊',
    description: 'Warm atmospheric pad',
    synthType: 'AMSynth',
    options: {
      harmonicity: 2.5,
      oscillator: {
        type: 'fatsawtooth',
      },
      envelope: {
        attack: 0.1,
        decay: 0.2,
        sustain: 0.2,
        release: 0.3,
      },
      modulation: {
        type: 'square',
      },
      modulationEnvelope: {
        attack: 0.5,
        decay: 0.01,
        sustain: 0.6,
        release: 1.5,
      },
    },
    effects: {
      reverb: {
        wet: 0.5,
        decay: 4.0,
        preDelay: 0.05,
      },
      chorus: {
        wet: 0.6,
        frequency: 0.8,
        delayTime: 5,
        depth: 0.8,
      },
      delay: {
        wet: 0.15,
        delayTime: '16n',
        feedback: 0.4,
      },
      compressor: {
        threshold: -18,
        ratio: 3,
        attack: 0.01,
        release: 0.3,
      },
      eq: {
        low: 2,
        mid: 1,
        high: 2,
      },
    },
  },

  bells: {
    name: 'bells',
    displayName: 'Bells',
    icon: '🔔',
    description: 'Bell-like metallic tones',
    synthType: 'FMSynth',
    options: {
      harmonicity: 12,
      modulationIndex: 20,
      oscillator: {
        type: 'sine',
      },
      envelope: {
        attack: 0.001,
        decay: 0.4,
        sustain: 0.1,
        release: 1.4,
      },
      modulation: {
        type: 'sine',
      },
      modulationEnvelope: {
        attack: 0.001,
        decay: 0.2,
        sustain: 0,
        release: 0.5,
      },
    },
    effects: {
      reverb: {
        wet: 0.6,
        decay: 3.5,
        preDelay: 0.02,
      },
      vibrato: {
        wet: 0.3,
        frequency: 5,
        depth: 0.1,
      },
      delay: {
        wet: 0.2,
        delayTime: '16n.',
        feedback: 0.35,
      },
      compressor: {
        threshold: -22,
        ratio: 4,
        attack: 0.001,
        release: 0.15,
      },
      eq: {
        low: -5,
        mid: 0,
        high: 6,
      },
    },
  },

  pluck: {
    name: 'pluck',
    displayName: 'Pluck',
    icon: '🎻',
    description: 'Plucked string sound',
    synthType: 'Synth',
    options: {
      oscillator: {
        type: 'triangle',
      },
      envelope: {
        attack: 0.001,
        decay: 0.3,
        sustain: 0.1,
        release: 1,
      },
    },
    effects: {
      reverb: {
        wet: 0.35,
        decay: 1.8,
        preDelay: 0.015,
      },
      chorus: {
        wet: 0.3,
        frequency: 2,
        delayTime: 2.5,
        depth: 0.5,
      },
      delay: {
        wet: 0.15,
        delayTime: '8n.',
        feedback: 0.25,
      },
      compressor: {
        threshold: -26,
        ratio: 5,
        attack: 0.002,
        release: 0.18,
      },
      eq: {
        low: -2,
        mid: 2,
        high: 4,
      },
    },
  },
};

export const synthPresetList: SynthPreset[] = Object.values(synthPresets);

export function getSynthPreset(name: SynthPresetName): SynthPreset {
  return synthPresets[name];
}
