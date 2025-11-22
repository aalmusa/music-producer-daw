'use client';

import { saveFile } from '@/lib/storage';
import type {
  InstrumentLoop,
  MusicProductionRequest,
  MusicProductionResponse,
  SongContext,
} from '@/types/music-production';
import { useRef, useState } from 'react';

export default function DAWAssistantPage() {
  // Song Context State
  const [songContext, setSongContext] = useState<SongContext>({
    genre: 'Electronic',
    mood: 'energetic',
    tempo: 128,
    key: 'C minor',
    timeSignature: '4/4',
    description: '',
  });

  // UI State
  const [userRequest, setUserRequest] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentResponse, setCurrentResponse] =
    useState<MusicProductionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatedLoops, setGeneratedLoops] = useState<InstrumentLoop[]>([]);

  const audioRefs = useRef<{ [key: number]: HTMLAudioElement | null }>({});

  const handleGenerateLoop = async () => {
    if (!userRequest.trim()) return;

    setLoading(true);
    setError(null);
    setCurrentResponse(null);

    try {
      const requestBody: MusicProductionRequest = {
        songContext,
        userRequest,
      };

      const res = await fetch('/api/music-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = (await res.json()) as MusicProductionResponse;

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate music');
      }

      setCurrentResponse(data);

      // Add the loop to our collection
      if (data.loop) {
        const loopWithOrder = {
          ...data.loop,
          order: generatedLoops.length,
        };
        setGeneratedLoops((prev) => [...prev, loopWithOrder]);

        // Auto-save to library
        try {
          await saveFile({
            name: `${data.loop.instrument} - ${data.loop.metadata.title}`,
            type: 'audio',
            data: data.loop.audioUrl.split(',')[1], // Remove data:audio/mpeg;base64, prefix
            metadata: {
              tempo: songContext.tempo,
              key: songContext.key,
              timeSignature: songContext.timeSignature,
              genre: songContext.genre,
              description: data.loop.metadata.description,
              duration: data.loop.bars,
              instrument: data.loop.instrument,
            },
            tags: [songContext.genre, data.loop.instrument, songContext.mood],
          });
          console.log('✅ Saved to library');
        } catch (error) {
          console.error('Failed to save to library:', error);
        }
      }

      // Clear the user request for the next one
      setUserRequest('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLoop = (index: number) => {
    setGeneratedLoops((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePlayLoop = (index: number) => {
    const audio = audioRefs.current[index];
    if (audio) {
      audio.currentTime = 0;
      audio.play();
    }
  };

  const quickRequests = [
    'Add a bass line',
    'Create a piano melody',
    'Add some drums',
    'Include a synth pad',
    'Add a guitar riff',
    'Create string section',
  ];

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8'>
      <div className='max-w-7xl mx-auto'>
        {/* Header */}
        <div className='text-center mb-8'>
          <h1 className='text-5xl font-bold text-white mb-3'>
            🎹 AI Music Production Assistant
          </h1>
          <p className='text-gray-300 text-lg'>
            Your intelligent DAW companion for creating music loops
          </p>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {/* Left Column: Song Context */}
          <div className='lg:col-span-1 space-y-6'>
            <div className='bg-gray-800/90 backdrop-blur rounded-lg shadow-xl p-6'>
              <h2 className='text-2xl font-semibold text-white mb-4 flex items-center gap-2'>
                <span>🎵</span> Song Context
              </h2>

              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>
                    Genre
                  </label>
                  <input
                    type='text'
                    value={songContext.genre}
                    onChange={(e) =>
                      setSongContext({ ...songContext, genre: e.target.value })
                    }
                    className='w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none'
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>
                    Mood
                  </label>
                  <input
                    type='text'
                    value={songContext.mood}
                    onChange={(e) =>
                      setSongContext({ ...songContext, mood: e.target.value })
                    }
                    className='w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none'
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>
                    Tempo: {songContext.tempo} BPM
                  </label>
                  <input
                    type='range'
                    min='60'
                    max='200'
                    step='1'
                    value={songContext.tempo}
                    onChange={(e) =>
                      setSongContext({
                        ...songContext,
                        tempo: Number(e.target.value),
                      })
                    }
                    className='w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500'
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>
                    Key
                  </label>
                  <select
                    value={songContext.key}
                    onChange={(e) =>
                      setSongContext({ ...songContext, key: e.target.value })
                    }
                    className='w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none'
                  >
                    {[
                      'C major',
                      'C minor',
                      'D major',
                      'D minor',
                      'E major',
                      'E minor',
                      'F major',
                      'F minor',
                      'G major',
                      'G minor',
                      'A major',
                      'A minor',
                      'B major',
                      'B minor',
                    ].map((key) => (
                      <option key={key} value={key}>
                        {key}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>
                    Time Signature
                  </label>
                  <select
                    value={songContext.timeSignature}
                    onChange={(e) =>
                      setSongContext({
                        ...songContext,
                        timeSignature: e.target.value,
                      })
                    }
                    className='w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none'
                  >
                    {['4/4', '3/4', '6/8', '5/4', '7/8'].map((sig) => (
                      <option key={sig} value={sig}>
                        {sig}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>
                    Description (optional)
                  </label>
                  <textarea
                    value={songContext.description}
                    onChange={(e) =>
                      setSongContext({
                        ...songContext,
                        description: e.target.value,
                      })
                    }
                    placeholder='Additional context about your song...'
                    className='w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none'
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Assistant Interaction & Results */}
          <div className='lg:col-span-2 space-y-6'>
            {/* Assistant Chat */}
            <div className='bg-gray-800/90 backdrop-blur rounded-lg shadow-xl p-6'>
              <h2 className='text-2xl font-semibold text-white mb-4 flex items-center gap-2'>
                <span>🤖</span> AI Assistant
              </h2>

              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>
                    What would you like to add to your track?
                  </label>
                  <textarea
                    value={userRequest}
                    onChange={(e) => setUserRequest(e.target.value)}
                    placeholder='e.g., "Add a melodic bass line that complements the mood"'
                    className='w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none'
                    rows={3}
                  />
                </div>

                {/* Quick Request Buttons */}
                <div className='flex flex-wrap gap-2'>
                  {quickRequests.map((request, index) => (
                    <button
                      key={index}
                      onClick={() => setUserRequest(request)}
                      className='px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-full transition-colors duration-200'
                    >
                      {request}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleGenerateLoop}
                  disabled={loading || !userRequest.trim()}
                  className='w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 disabled:cursor-not-allowed'
                >
                  {loading ? (
                    <span className='flex items-center justify-center gap-2'>
                      <svg
                        className='animate-spin h-5 w-5 text-white'
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
                      Generating 4-Bar Loop...
                    </span>
                  ) : (
                    '🎵 Generate Loop'
                  )}
                </button>
              </div>

              {/* Error Display */}
              {error && (
                <div className='mt-4 bg-red-900/50 border border-red-500 rounded-lg p-4'>
                  <h3 className='text-red-400 font-semibold mb-1'>Error</h3>
                  <p className='text-red-300 text-sm'>{error}</p>
                </div>
              )}

              {/* Current Response */}
              {currentResponse && currentResponse.success && (
                <div className='mt-4 bg-green-900/30 border border-green-500 rounded-lg p-4'>
                  <h3 className='text-green-400 font-semibold mb-2 flex items-center gap-2'>
                    <span>✨</span> Agent Reasoning
                  </h3>
                  <p className='text-gray-300 text-sm mb-2'>
                    <strong>Instrument:</strong> {currentResponse.instrument}
                  </p>
                  <p className='text-gray-300 text-sm'>
                    {currentResponse.reasoning}
                  </p>
                </div>
              )}
            </div>

            {/* Generated Loops */}
            <div className='bg-gray-800/90 backdrop-blur rounded-lg shadow-xl p-6'>
              <h2 className='text-2xl font-semibold text-white mb-4 flex items-center gap-2'>
                <span>🎼</span> Generated Loops ({generatedLoops.length})
              </h2>

              {generatedLoops.length === 0 ? (
                <div className='text-center py-12 text-gray-400'>
                  <p className='text-lg mb-2'>No loops generated yet</p>
                  <p className='text-sm'>
                    Ask the AI assistant to create your first instrument loop!
                  </p>
                </div>
              ) : (
                <div className='space-y-4'>
                  {generatedLoops.map((loop, index) => (
                    <div
                      key={index}
                      className='bg-gray-700/50 rounded-lg p-4 border border-gray-600'
                    >
                      <div className='flex items-start justify-between mb-3'>
                        <div className='flex-1'>
                          <h3 className='text-lg font-semibold text-white mb-1'>
                            {loop.instrument} - Track {index + 1}
                          </h3>
                          <p className='text-gray-400 text-sm mb-2'>
                            {loop.metadata.title}
                          </p>
                          <p className='text-gray-500 text-xs'>
                            {loop.metadata.description}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteLoop(index)}
                          className='ml-4 p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200'
                          title='Delete loop'
                        >
                          🗑️
                        </button>
                      </div>

                      <audio
                        ref={(el) => (audioRefs.current[index] = el)}
                        controls
                        className='w-full mb-3'
                        style={{
                          filter: 'invert(1) hue-rotate(180deg)',
                          borderRadius: '0.5rem',
                        }}
                      >
                        <source src={loop.audioUrl} type='audio/mpeg' />
                        Your browser does not support the audio element.
                      </audio>

                      <div className='flex gap-2'>
                        <button
                          onClick={() => handlePlayLoop(index)}
                          className='flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200'
                        >
                          ▶️ Play
                        </button>
                        <a
                          href={loop.audioUrl}
                          download={`${loop.instrument}-loop-${index + 1}.mp3`}
                          className='flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg text-center transition-colors duration-200'
                        >
                          💾 Download
                        </a>
                      </div>

                      <details className='mt-3'>
                        <summary className='cursor-pointer text-sm text-gray-400 hover:text-gray-300'>
                          View Prompt
                        </summary>
                        <p className='mt-2 text-xs text-gray-500 bg-gray-800 p-2 rounded'>
                          {loop.prompt}
                        </p>
                      </details>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
