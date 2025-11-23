export interface SongContext {
  genre: string;
  mood: string;
  tempo: number;
  key: string;
  timeSignature: string;
  description?: string;
}

export interface InstrumentLoop {
  instrument: string;
  prompt: string;
  audioUrl: string;
  metadata: {
    title: string;
    description: string;
  };
  bars: number;
  order: number;
}

export interface MusicProductionRequest {
  songContext: SongContext;
  userRequest: string;
}

export interface MusicProductionResponse {
  success: boolean;
  reasoning: string;
  instrument: string;
  prompt: string;
  loop?: InstrumentLoop;
  error?: string;
}

// DAW Assistant Types
export interface DAWState {
  tracks: Array<{
    id: string;
    name: string;
    type: 'audio' | 'midi';
    volume: number;
    muted: boolean;
    solo: boolean;
    samplerAudioUrl?: string;
  }>;
  bpm: number;
  metronomeEnabled: boolean;
}

export interface DAWAssistantRequest {
  message: string;
  dawState: DAWState;
  userContext?: string; // High-level context from another agent (optional for now)
}

export interface DAWAction {
  type: 
    | 'create_track'
    | 'delete_track'
    | 'adjust_volume'
    | 'adjust_bpm'
    | 'select_instrument'
    | 'mute_tracks'
    | 'unmute_tracks'
    | 'solo_tracks'
    | 'unsolo_tracks'
    | 'toggle_metronome'
    | 'none';
  trackId?: string;
  trackIds?: string[]; // For multiple track operations
  trackType?: 'audio' | 'midi';
  trackName?: string;
  trackPattern?: string; // For pattern matching (e.g., "drum", "bass")
  instrumentPath?: string;
  volume?: number;
  bpm?: number;
  muted?: boolean;
  soloed?: boolean;
  metronomeEnabled?: boolean;
  reasoning: string;
}

export interface DAWAssistantResponse {
  success: boolean;
  message: string; // Natural language response to user
  actions: DAWAction[]; // Actions to perform
  suggestions?: string[]; // Ideas for what to do next
  error?: string;
}
