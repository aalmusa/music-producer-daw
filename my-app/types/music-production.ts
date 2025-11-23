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
