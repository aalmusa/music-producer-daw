export interface ElevenLabsMusicResponse {
  json: {
    compositionPlan: {
      positiveGlobalStyles: string[];
      negativeGlobalStyles: string[];
      sections: Array<{
        start: number;
        end: number;
        style: string;
      }>;
    };
    songMetadata: {
      title: string;
      description: string;
      genres: string[];
      languages: string[];
      isExplicit: boolean;
    };
  };
  audio: Buffer;
  filename: string;
}

export interface MusicGenerationRequest {
  prompt: string;
  musicLengthMs?: number;
}

export interface MusicGenerationAPIResponse {
  success: boolean;
  audioUrl?: string;
  metadata?: {
    title: string;
    description: string;
    genres: string[];
    isExplicit: boolean;
  };
  compositionPlan?: {
    positiveGlobalStyles: string[];
    negativeGlobalStyles: string[];
  };
}
