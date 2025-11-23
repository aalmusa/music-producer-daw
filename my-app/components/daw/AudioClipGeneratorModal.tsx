'use client';

import { useState } from 'react';
import * as Tone from 'tone';

interface AudioClipGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackId: string;
  clipId?: string; // If provided, we're replacing; if not, we're adding
  startBar: number;
  onClipGenerated: (audioUrl: string, clipName: string) => void;
}

export default function AudioClipGeneratorModal({
  isOpen,
  onClose,
  trackId,
  clipId,
  startBar,
  onClipGenerated,
}: AudioClipGeneratorModalProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewPlayer, setPreviewPlayer] = useState<Tone.Player | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a description for the audio clip');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedAudioUrl(null);

    try {
      // Calculate duration for 4 bars at current BPM
      const transport = Tone.getTransport();
      const fourBarsDurationSeconds = transport.toSeconds('4m');
      const musicLengthMs = fourBarsDurationSeconds * 1000;

      const response = await fetch('/api/elevenlabs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          musicLengthMs,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate audio');
      }

      const data = await response.json();

      if (data.success && data.audioUrl) {
        setGeneratedAudioUrl(data.audioUrl);
        console.log('✓ Audio generated successfully');
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      console.error('Error generating audio:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate audio');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreview = async () => {
    if (!generatedAudioUrl) return;

    // Stop existing preview if playing
    if (previewPlayer) {
      previewPlayer.stop();
      previewPlayer.dispose();
      setPreviewPlayer(null);
      setIsPlaying(false);
      return;
    }

    try {
      // Create a new player for preview (not synced to transport)
      const player = new Tone.Player({
        url: generatedAudioUrl,
        onload: () => {
          player.start();
          setIsPlaying(true);
          console.log('✓ Preview started');
        },
        onstop: () => {
          setIsPlaying(false);
          setPreviewPlayer(null);
        },
      }).toDestination();

      setPreviewPlayer(player);
    } catch (err) {
      console.error('Error previewing audio:', err);
      setError('Failed to preview audio');
    }
  };

  const handleAccept = () => {
    if (!generatedAudioUrl) return;

    // Stop preview if playing
    if (previewPlayer) {
      previewPlayer.stop();
      previewPlayer.dispose();
      setPreviewPlayer(null);
    }

    // Generate a clip name from the prompt
    const clipName = prompt.slice(0, 30) + (prompt.length > 30 ? '...' : '');

    // Call the callback with the generated audio
    onClipGenerated(generatedAudioUrl, clipName);

    // Close the modal
    handleClose();
  };

  const handleClose = () => {
    // Stop and cleanup preview player
    if (previewPlayer) {
      previewPlayer.stop();
      previewPlayer.dispose();
      setPreviewPlayer(null);
    }

    // Reset state
    setPrompt('');
    setGeneratedAudioUrl(null);
    setIsPlaying(false);
    setError(null);

    onClose();
  };

  if (!isOpen) return null;

  const isReplacing = !!clipId;

  return (
    <>
      {/* Backdrop */}
      <div
        className='fixed inset-0 bg-black/70 z-50'
        onClick={handleClose}
      />

      {/* Modal */}
      <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
        <div
          className='bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-w-2xl w-full mx-4'
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className='p-6 border-b border-slate-700'>
            <h2 className='text-xl font-semibold text-slate-100'>
              {isReplacing ? 'Replace Audio Clip' : 'Generate Audio Clip'}
            </h2>
            <p className='text-sm text-slate-400 mt-1'>
              AI-powered 4-bar audio generation • Bar {startBar + 1}-
              {startBar + 4}
            </p>
          </div>

          {/* Content */}
          <div className='p-6 space-y-4'>
            {/* Prompt Input */}
            <div>
              <label className='block text-sm font-medium text-slate-300 mb-2'>
                Describe the audio you want to generate
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder='e.g., "upbeat electronic drums with hi-hats and snare", "deep bass line with sub bass", "ambient atmospheric pad"'
                className='w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none'
                rows={4}
                disabled={isGenerating}
              />
            </div>

            {/* Error Display */}
            {error && (
              <div className='p-4 bg-red-900/20 border border-red-700 rounded-lg'>
                <p className='text-sm text-red-400'>{error}</p>
              </div>
            )}

            {/* Generate Button */}
            {!generatedAudioUrl && (
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className='w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2'
              >
                {isGenerating ? (
                  <>
                    <svg
                      className='animate-spin h-5 w-5'
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
                    Generating Audio...
                  </>
                ) : (
                  <>
                    <svg
                      className='w-5 h-5'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M13 10V3L4 14h7v7l9-11h-7z'
                      />
                    </svg>
                    Generate Audio
                  </>
                )}
              </button>
            )}

            {/* Preview & Accept Section */}
            {generatedAudioUrl && (
              <div className='space-y-4 p-4 bg-slate-800 rounded-lg border border-slate-700'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <div className='w-2 h-2 bg-emerald-500 rounded-full animate-pulse' />
                    <span className='text-sm font-medium text-slate-300'>
                      Audio Generated Successfully
                    </span>
                  </div>
                </div>

                <div className='flex gap-3'>
                  {/* Preview Button */}
                  <button
                    onClick={handlePreview}
                    className='flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2'
                  >
                    {isPlaying ? (
                      <>
                        <svg
                          className='w-5 h-5'
                          fill='currentColor'
                          viewBox='0 0 24 24'
                        >
                          <path d='M6 4h4v16H6V4zm8 0h4v16h-4V4z' />
                        </svg>
                        Stop Preview
                      </>
                    ) : (
                      <>
                        <svg
                          className='w-5 h-5'
                          fill='currentColor'
                          viewBox='0 0 24 24'
                        >
                          <path d='M8 5v14l11-7z' />
                        </svg>
                        Preview Audio
                      </>
                    )}
                  </button>

                  {/* Accept Button */}
                  <button
                    onClick={handleAccept}
                    className='flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2'
                  >
                    <svg
                      className='w-5 h-5'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M5 13l4 4L19 7'
                      />
                    </svg>
                    {isReplacing ? 'Replace Clip' : 'Add to Track'}
                  </button>
                </div>

                {/* Generate Another */}
                <button
                  onClick={() => {
                    setGeneratedAudioUrl(null);
                    if (previewPlayer) {
                      previewPlayer.stop();
                      previewPlayer.dispose();
                      setPreviewPlayer(null);
                    }
                  }}
                  className='w-full px-4 py-2 text-sm text-slate-400 hover:text-slate-300 transition-colors'
                >
                  Generate Different Audio
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className='p-6 border-t border-slate-700 flex justify-end'>
            <button
              onClick={handleClose}
              className='px-4 py-2 text-sm text-slate-300 hover:text-slate-100 transition-colors'
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

