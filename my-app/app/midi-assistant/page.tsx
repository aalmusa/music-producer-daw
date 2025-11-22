'use client';

import type {
  MidiGenerationContext,
  MidiGenerationRequest,
  MidiGenerationResponse,
  MidiPattern,
} from '@/types/midi';
import { useEffect, useRef, useState } from 'react';

export default function MidiAssistantPage() {
  // Song Context State
  const [songContext, setSongContext] = useState({
    genre: 'Pop',
    mood: 'uplifting',
    tempo: 120,
    key: 'C major',
    timeSignature: '4/4',
  });

  // Chat State
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<MidiGenerationContext>({
    conversationHistory: [],
  });
  const [generatedPatterns, setGeneratedPatterns] = useState<
    Array<{
      pattern: MidiPattern;
      midiData: string;
      timestamp: number;
    }>
  >([]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [context.conversationHistory]);

  // Auto-focus input
  useEffect(() => {
    if (!loading) {
      textareaRef.current?.focus();
    }
  }, [loading]);

  const handleSendMessage = async () => {
    if (!userInput.trim() || loading) return;

    const message = userInput.trim();
    setUserInput('');
    setLoading(true);

    try {
      const requestBody: MidiGenerationRequest = {
        userMessage: message,
        context,
        songContext,
      };

      const res = await fetch('/api/midi-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = (await res.json()) as MidiGenerationResponse;

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to process message');
      }

      // Update context with conversation history
      if (data.updatedContext) {
        setContext(data.updatedContext);
      }

      // If MIDI pattern was generated, save it
      if (data.midiPattern && data.midiFileData) {
        setGeneratedPatterns((prev) => [
          ...prev,
          {
            pattern: data.midiPattern!,
            midiData: data.midiFileData!,
            timestamp: Date.now(),
          },
        ]);
      }
    } catch (err) {
      console.error('Error:', err);
      // Add error message to conversation
      setContext((prev) => ({
        ...prev,
        conversationHistory: [
          ...prev.conversationHistory,
          {
            role: 'assistant',
            content: 'Sorry, I encountered an error. Please try again.',
            timestamp: Date.now(),
          },
        ],
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickQuestion = (question: string) => {
    setUserInput(question);
  };

  const handleDownloadMidi = (midiData: string, index: number) => {
    try {
      // Decode base64 to binary
      const binaryString = atob(midiData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Create blob with proper MIDI type
      const blob = new Blob([bytes], { type: 'audio/midi' });
      const url = URL.createObjectURL(blob);
      
      // Download
      const a = document.createElement('a');
      a.href = url;
      a.download = `midi-pattern-${index + 1}.mid`;
      document.body.appendChild(a); // Required for Firefox
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download MIDI:', error);
      alert('Failed to download MIDI file. Please try again.');
    }
  };

  const handleClearConversation = () => {
    setContext({ conversationHistory: [] });
  };

  const quickStarters = [
    'I want to create a chord progression in C major',
    'Generate a bass line for I-V-vi-IV',
    'Create an arpeggio pattern',
    'Make a melody over Cmaj7 Am7 Dm7 G7',
  ];

  return (
    <div className='min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-8'>
      <div className='max-w-7xl mx-auto'>
        {/* Header */}
        <div className='text-center mb-8'>
          <h1 className='text-5xl font-bold text-white mb-3'>
            🎹 MIDI Pattern Assistant
          </h1>
          <p className='text-gray-300 text-lg'>
            Interactive AI for creating MIDI patterns from chord progressions
          </p>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {/* Left Column: Song Context & Generated Patterns */}
          <div className='lg:col-span-1 space-y-6'>
            {/* Song Context */}
            <div className='bg-gray-800/90 backdrop-blur rounded-lg shadow-xl p-6'>
              <h2 className='text-xl font-semibold text-white mb-4 flex items-center gap-2'>
                <span>🎵</span> Song Context
              </h2>

              <div className='space-y-3'>
                <div>
                  <label className='block text-xs font-medium text-gray-400 mb-1'>
                    Genre
                  </label>
                  <input
                    type='text'
                    value={songContext.genre}
                    onChange={(e) =>
                      setSongContext({ ...songContext, genre: e.target.value })
                    }
                    className='w-full px-3 py-2 text-sm bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none'
                  />
                </div>

                <div>
                  <label className='block text-xs font-medium text-gray-400 mb-1'>
                    Key
                  </label>
                  <select
                    value={songContext.key}
                    onChange={(e) =>
                      setSongContext({ ...songContext, key: e.target.value })
                    }
                    className='w-full px-3 py-2 text-sm bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none'
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
                  <label className='block text-xs font-medium text-gray-400 mb-1'>
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
              </div>
            </div>

            {/* Generated Patterns */}
            <div className='bg-gray-800/90 backdrop-blur rounded-lg shadow-xl p-6'>
              <h2 className='text-xl font-semibold text-white mb-4 flex items-center gap-2'>
                <span>📝</span> Generated Patterns ({generatedPatterns.length})
              </h2>

              {generatedPatterns.length === 0 ? (
                <p className='text-gray-400 text-sm text-center py-4'>
                  No patterns generated yet
                </p>
              ) : (
                <div className='space-y-3'>
                  {generatedPatterns.map((item, index) => (
                    <div
                      key={index}
                      className='bg-gray-700/50 rounded-lg p-4 border border-gray-600'
                    >
                      <div className='flex items-start justify-between mb-2'>
                        <div>
                          <h3 className='text-sm font-semibold text-white'>
                            {item.pattern.name}
                          </h3>
                          <p className='text-xs text-gray-400'>
                            {item.pattern.notes.length} notes •{' '}
                            {item.pattern.lengthInBars} bars
                          </p>
                        </div>
                        <span className='text-xs text-gray-500'>
                          #{index + 1}
                        </span>
                      </div>

                      <button
                        onClick={() => handleDownloadMidi(item.midiData, index)}
                        className='w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors duration-200'
                      >
                        💾 Download MIDI
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Chat Interface */}
          <div className='lg:col-span-2'>
            <div className='bg-gray-800/90 backdrop-blur rounded-lg shadow-xl flex flex-col h-[700px]'>
              {/* Chat Header */}
              <div className='p-6 border-b border-gray-700'>
                <div className='flex items-center justify-between'>
                  <div>
                    <h2 className='text-2xl font-semibold text-white flex items-center gap-2'>
                      <span>💬</span> AI Conversation
                    </h2>
                    <p className='text-sm text-gray-400 mt-1'>
                      Describe your chord progression and desired pattern
                    </p>
                  </div>
                  {context.conversationHistory.length > 0 && (
                    <button
                      onClick={handleClearConversation}
                      className='px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors duration-200'
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Chat Messages */}
              <div className='flex-1 overflow-y-auto p-6 space-y-4'>
                {context.conversationHistory.length === 0 ? (
                  <div className='text-center py-12'>
                    <div className='text-6xl mb-4'>🎼</div>
                    <h3 className='text-xl font-semibold text-white mb-2'>
                      Start a conversation
                    </h3>
                    <p className='text-gray-400 mb-6'>
                      Tell me about the chord progression you want to work with
                    </p>

                    <div className='space-y-2 max-w-md mx-auto'>
                      <p className='text-sm text-gray-500 mb-2'>Try these:</p>
                      {quickStarters.map((starter, index) => (
                        <button
                          key={index}
                          onClick={() => handleQuickQuestion(starter)}
                          className='block w-full text-left px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors duration-200'
                        >
                          {starter}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {context.conversationHistory.map((msg, index) => (
                      <div
                        key={index}
                        className={`flex ${
                          msg.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-4 ${
                            msg.role === 'user'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-700 text-gray-100'
                          }`}
                        >
                          <div className='flex items-start gap-2'>
                            <span className='text-lg'>
                              {msg.role === 'user' ? '👤' : '🤖'}
                            </span>
                            <div className='flex-1'>
                              <p className='text-sm whitespace-pre-wrap'>
                                {msg.content}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </>
                )}
              </div>

              {/* Input Area */}
              <div className='p-6 border-t border-gray-700'>
                <div className='flex gap-2'>
                  <textarea
                    ref={textareaRef}
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder='Type your message... (e.g., "Create a bass line for C-Am-F-G")'
                    className='flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none'
                    rows={2}
                    disabled={loading}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={loading || !userInput.trim()}
                    className='px-6 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-semibold rounded-lg transition-colors duration-200 disabled:cursor-not-allowed'
                  >
                    {loading ? (
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
                    ) : (
                      '📤'
                    )}
                  </button>
                </div>
                <p className='text-xs text-gray-500 mt-2'>
                  Press Enter to send, Shift+Enter for new line
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
