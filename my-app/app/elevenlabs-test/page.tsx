'use client';

import type { MusicGenerationAPIResponse } from '@/types/elevenlabs';
import { useRef, useState } from 'react';

export default function ElevenLabsTestPage() {
  const [prompt, setPrompt] = useState('');
  const [musicLengthMs, setMusicLengthMs] = useState(10000);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<MusicGenerationAPIResponse | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleGenerateMusic = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch('/api/elevenlabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          musicLengthMs,
        }),
      });

      const data = (await res.json()) as MusicGenerationAPIResponse;

      if (!res.ok) {
        throw new Error(
          'error' in data ? String(data) : 'Failed to generate music'
        );
      }

      setResponse(data);

      // Auto-play the audio when it loads
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play();
        }
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8'>
      <div className='max-w-4xl mx-auto'>
        <h1 className='text-4xl font-bold text-white mb-8'>
          ElevenLabs Music Generation Test
        </h1>

        <div className='bg-gray-800 rounded-lg shadow-xl p-6 mb-6'>
          <div className='space-y-4'>
            <div>
              <label
                htmlFor='prompt'
                className='block text-sm font-medium text-gray-300 mb-2'
              >
                Music Prompt
              </label>
              <textarea
                id='prompt'
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder='Describe the music you want to generate...'
                className='w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none'
                rows={4}
              />
            </div>

            <div>
              <label
                htmlFor='length'
                className='block text-sm font-medium text-gray-300 mb-2'
              >
                Music Length (ms): {musicLengthMs}ms ({musicLengthMs / 1000}s)
              </label>
              <input
                id='length'
                type='range'
                min='5000'
                max='60000'
                step='1000'
                value={musicLengthMs}
                onChange={(e) => setMusicLengthMs(Number(e.target.value))}
                className='w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500'
              />
              <div className='flex justify-between text-xs text-gray-400 mt-1'>
                <span>5s</span>
                <span>60s</span>
              </div>
            </div>

            <button
              onClick={handleGenerateMusic}
              disabled={loading || !prompt}
              className='w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 disabled:cursor-not-allowed'
            >
              {loading ? (
                <span className='flex items-center justify-center'>
                  <svg
                    className='animate-spin -ml-1 mr-3 h-5 w-5 text-white'
                    xmlns='http://www.w3.org/2000/svg'
                    fill='none'
                    viewBox='0 0 24 24'
                  >
                    <circle
                      className='opacity-25'
                      cx='12'
                      cy='12'
                      r='10'
                      stroke='currentColor'
                      strokeWidth='4'
                    ></circle>
                    <path
                      className='opacity-75'
                      fill='currentColor'
                      d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                    ></path>
                  </svg>
                  Generating Music...
                </span>
              ) : (
                'Generate Music'
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className='bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6'>
            <h2 className='text-red-400 font-semibold mb-2'>Error</h2>
            <p className='text-red-300'>{error}</p>
          </div>
        )}

        {response && response.audioUrl && (
          <div className='bg-gray-800 rounded-lg shadow-xl p-6 mb-6'>
            <h2 className='text-2xl font-semibold text-white mb-4'>
              Generated Music
            </h2>

            {/* Metadata */}
            {response.metadata && (
              <div className='bg-gray-700 rounded-lg p-4 mb-4'>
                <h3 className='text-lg font-semibold text-white mb-2'>
                  {response.metadata.title}
                </h3>
                <p className='text-gray-300 text-sm mb-3'>
                  {response.metadata.description}
                </p>
                {response.metadata.genres.length > 0 && (
                  <div className='flex flex-wrap gap-2'>
                    {response.metadata.genres.map((genre, index) => (
                      <span
                        key={index}
                        className='px-3 py-1 bg-blue-600 text-white text-xs rounded-full'
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Audio Player */}
            <div className='space-y-4'>
              <audio
                ref={audioRef}
                controls
                className='w-full'
                style={{
                  filter: 'invert(1) hue-rotate(180deg)',
                  borderRadius: '0.5rem',
                }}
              >
                <source src={response.audioUrl} type='audio/mpeg' />
                Your browser does not support the audio element.
              </audio>

              <div className='flex gap-2'>
                <a
                  href={response.audioUrl}
                  download={`music-${Date.now()}.mp3`}
                  className='flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg text-center transition-colors duration-200'
                >
                  Download MP3
                </a>
                <button
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.currentTime = 0;
                      audioRef.current.play();
                    }
                  }}
                  className='flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200'
                >
                  Replay
                </button>
              </div>
            </div>

            {/* Composition Plan Details */}
            {response.compositionPlan && (
              <details className='mt-4 bg-gray-700 rounded-lg p-4'>
                <summary className='cursor-pointer text-white font-semibold'>
                  Composition Details
                </summary>
                <div className='mt-3 space-y-3'>
                  {response.compositionPlan.positiveGlobalStyles.length > 0 && (
                    <div>
                      <h4 className='text-sm font-semibold text-gray-300 mb-1'>
                        Positive Styles:
                      </h4>
                      <div className='flex flex-wrap gap-1'>
                        {response.compositionPlan.positiveGlobalStyles.map(
                          (style, index) => (
                            <span
                              key={index}
                              className='px-2 py-1 bg-green-700 text-white text-xs rounded'
                            >
                              {style}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  )}
                  {response.compositionPlan.negativeGlobalStyles.length > 0 && (
                    <div>
                      <h4 className='text-sm font-semibold text-gray-300 mb-1'>
                        Negative Styles:
                      </h4>
                      <div className='flex flex-wrap gap-1'>
                        {response.compositionPlan.negativeGlobalStyles.map(
                          (style, index) => (
                            <span
                              key={index}
                              className='px-2 py-1 bg-red-700 text-white text-xs rounded'
                            >
                              {style}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        )}

        {/* Example Prompts */}
        <div className='mt-8 bg-gray-800 rounded-lg shadow-xl p-6'>
          <h2 className='text-xl font-semibold text-white mb-4'>
            Example Prompts
          </h2>
          <div className='space-y-2'>
            {[
              'Upbeat electronic dance music with energetic beats',
              'Calm ambient piano music for relaxation',
              'Epic orchestral soundtrack with dramatic strings',
              'Lo-fi hip hop beats for studying',
              'Funky bass-driven groove with retro vibes',
            ].map((examplePrompt, index) => (
              <button
                key={index}
                onClick={() => setPrompt(examplePrompt)}
                className='block w-full text-left px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors duration-200'
              >
                {examplePrompt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
