'use client';

import { useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import type WaveSurfer from 'wavesurfer.js';

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
  const [includeChords, setIncludeChords] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(
    null
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewPlayer, setPreviewPlayer] = useState<Tone.Player | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enhancedPrompt, setEnhancedPrompt] = useState<string | null>(null);

  // Waveform and trim controls
  const waveformContainerRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [trimStart, setTrimStart] = useState(0); // In seconds
  const [trimEnd, setTrimEnd] = useState(0); // In seconds
  const [audioDuration, setAudioDuration] = useState(0); // Total duration

  // Load waveform when audio is generated
  useEffect(() => {
    if (!generatedAudioUrl || !waveformContainerRef.current) return;

    let isCancelled = false;

    async function loadWaveform() {
      const WaveSurfer = (await import('wavesurfer.js')).default;
      const RegionsPlugin = (
        await import('wavesurfer.js/dist/plugins/regions.js')
      ).default;

      if (isCancelled || !waveformContainerRef.current) return;

      // Destroy existing wavesurfer
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }

      const ws = WaveSurfer.create({
        container: waveformContainerRef.current,
        waveColor: '#64748b',
        progressColor: '#22c55e',
        cursorColor: '#e5e7eb',
        height: 120,
        barWidth: 2,
        barGap: 1,
        interact: true,
      });

      // Add regions plugin for trim markers
      const regions = ws.registerPlugin(RegionsPlugin.create());

      ws.on('ready', () => {
        if (!isCancelled) {
          const duration = ws.getDuration();
          setAudioDuration(duration);
          setTrimStart(0);
          setTrimEnd(duration);

          // Add region to show trimmed area
          regions.addRegion({
            start: 0,
            end: duration,
            color: 'rgba(34, 197, 94, 0.2)', // emerald with transparency
            drag: false,
            resize: true,
          });

          // Update trim values when region is resized
          regions.on('region-updated', (region) => {
            setTrimStart(region.start);
            setTrimEnd(region.end);
          });
        }
      });

      ws.on('interaction', () => {
        ws.play();
      });

      ws.load(generatedAudioUrl!);
      wavesurferRef.current = ws;
    }

    loadWaveform();

    return () => {
      isCancelled = true;
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
    };
  }, [generatedAudioUrl]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a description for the audio clip');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedAudioUrl(null);
    setEnhancedPrompt(null);

    try {
      // Calculate duration for 4 bars at current BPM
      const transport = Tone.getTransport();
      const fourBarsDurationSeconds = transport.toSeconds('4m');
      const musicLengthMs = Math.round(fourBarsDurationSeconds * 1000); // Round to integer
      const bpm = transport.bpm.value;

      // Step 1: Use LangChain agent to enhance the prompt
      console.log('Step 1: Enhancing prompt with LangChain agent...');
      const agentResponse = await fetch('/api/audio-loop-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userPrompt: prompt,
          includeChords,
          bpm,
          trackType: 'audio',
        }),
      });

      if (!agentResponse.ok) {
        throw new Error('Failed to enhance prompt');
      }

      const agentData = await agentResponse.json();
      const finalPrompt = agentData.enhancedPrompt || prompt;
      setEnhancedPrompt(finalPrompt);

      console.log('✓ Enhanced prompt:', finalPrompt);

      // Step 2: Generate audio with ElevenLabs using enhanced prompt
      console.log('Step 2: Generating audio with ElevenLabs...');
      const response = await fetch('/api/elevenlabs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: finalPrompt,
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
    if (!wavesurferRef.current) return;

    // Toggle play/pause
    if (isPlaying) {
      wavesurferRef.current.pause();
      setIsPlaying(false);
    } else {
      // Play from trim start position
      wavesurferRef.current.setTime(trimStart);
      wavesurferRef.current.play();
      setIsPlaying(true);

      // Stop at trim end
      const checkPosition = () => {
        if (
          wavesurferRef.current &&
          wavesurferRef.current.getCurrentTime() >= trimEnd
        ) {
          wavesurferRef.current.pause();
          setIsPlaying(false);
        } else if (isPlaying) {
          requestAnimationFrame(checkPosition);
        }
      };
      checkPosition();
    }
  };

  const trimAudio = async (
    audioUrl: string,
    start: number,
    end: number
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const AudioContextClass =
        window.AudioContext ||
        (window as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextClass) {
        reject(new Error('AudioContext not supported'));
        return;
      }
      const audioContext = new AudioContextClass();

      // Convert base64 to array buffer
      fetch(audioUrl)
        .then((response) => response.arrayBuffer())
        .then((arrayBuffer) => audioContext.decodeAudioData(arrayBuffer))
        .then((audioBuffer) => {
          const sampleRate = audioBuffer.sampleRate;
          const startSample = Math.floor(start * sampleRate);
          const endSample = Math.floor(end * sampleRate);
          const trimmedLength = endSample - startSample;

          // Create new buffer for trimmed audio
          const trimmedBuffer = audioContext.createBuffer(
            audioBuffer.numberOfChannels,
            trimmedLength,
            sampleRate
          );

          // Copy trimmed portion
          for (
            let channel = 0;
            channel < audioBuffer.numberOfChannels;
            channel++
          ) {
            const sourceData = audioBuffer.getChannelData(channel);
            const trimmedData = trimmedBuffer.getChannelData(channel);
            for (let i = 0; i < trimmedLength; i++) {
              trimmedData[i] = sourceData[startSample + i];
            }
          }

          // Convert buffer to WAV format
          const wavData = audioBufferToWav(trimmedBuffer);
          const blob = new Blob([wavData], { type: 'audio/wav' });
          const trimmedUrl = URL.createObjectURL(blob);
          resolve(trimmedUrl);
        })
        .catch(reject);
    });
  };

  const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
    const length = buffer.length * buffer.numberOfChannels * 2 + 44;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);
    const channels: Float32Array[] = [];
    let offset = 0;
    let pos = 0;

    // Write WAV header
    const setUint16 = (data: number) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };
    const setUint32 = (data: number) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    // RIFF identifier
    setUint32(0x46464952);
    // file length
    setUint32(length - 8);
    // RIFF type
    setUint32(0x45564157);
    // format chunk identifier
    setUint32(0x20746d66);
    // format chunk length
    setUint32(16);
    // sample format (raw)
    setUint16(1);
    // channel count
    setUint16(buffer.numberOfChannels);
    // sample rate
    setUint32(buffer.sampleRate);
    // byte rate
    setUint32(buffer.sampleRate * buffer.numberOfChannels * 2);
    // block align
    setUint16(buffer.numberOfChannels * 2);
    // bits per sample
    setUint16(16);
    // data chunk identifier
    setUint32(0x61746164);
    // data chunk length
    setUint32(length - pos - 4);

    // Write audio data
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < buffer.numberOfChannels; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return arrayBuffer;
  };

  const handleAccept = async () => {
    if (!generatedAudioUrl) return;

    try {
      // Stop preview if playing
      if (wavesurferRef.current && isPlaying) {
        wavesurferRef.current.pause();
        setIsPlaying(false);
      }

      // Generate a clip name from the prompt
      const clipName = prompt.slice(0, 30) + (prompt.length > 30 ? '...' : '');

      // Trim the audio if needed
      let finalAudioUrl = generatedAudioUrl;
      if (trimStart > 0 || trimEnd < audioDuration) {
        console.log(`Trimming audio: ${trimStart}s to ${trimEnd}s`);
        finalAudioUrl = await trimAudio(generatedAudioUrl, trimStart, trimEnd);
      }

      // Call the callback with the (possibly trimmed) audio
      onClipGenerated(finalAudioUrl, clipName);

      // Close the modal
      handleClose();
    } catch (err) {
      console.error('Error accepting audio:', err);
      setError('Failed to process audio');
    }
  };

  const handleClose = () => {
    // Stop and cleanup wavesurfer
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }

    // Stop and cleanup preview player
    if (previewPlayer) {
      previewPlayer.stop();
      previewPlayer.dispose();
      setPreviewPlayer(null);
    }

    // Reset state
    setPrompt('');
    setIncludeChords(false);
    setGeneratedAudioUrl(null);
    setIsPlaying(false);
    setError(null);
    setEnhancedPrompt(null);
    setTrimStart(0);
    setTrimEnd(0);
    setAudioDuration(0);

    onClose();
  };

  if (!isOpen) return null;

  const isReplacing = !!clipId;

  return (
    <>
      {/* Backdrop */}
      <div className='fixed inset-0 bg-black/70 z-50' onClick={handleClose} />

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

            {/* Chord Toggle */}
            <div className='flex items-center justify-between p-4 bg-slate-800 rounded-lg border border-slate-700'>
              <div className='flex-1'>
                <label className='block text-sm font-medium text-slate-300'>
                  Include Chords
                </label>
                <p className='text-xs text-slate-500 mt-1'>
                  Enable for harmonic content, disable for rhythm-only or
                  single-note patterns
                </p>
              </div>
              <button
                type='button'
                onClick={() => setIncludeChords(!includeChords)}
                disabled={isGenerating}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                  includeChords ? 'bg-emerald-600' : 'bg-slate-700'
                } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    includeChords ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Enhanced Prompt Display (if available) */}
            {enhancedPrompt && (
              <div className='p-4 bg-blue-900/20 border border-blue-700 rounded-lg'>
                <div className='flex items-start gap-2'>
                  <svg
                    className='w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                    />
                  </svg>
                  <div className='flex-1'>
                    <p className='text-xs font-medium text-blue-300 mb-1'>
                      AI Enhanced Prompt:
                    </p>
                    <p className='text-xs text-blue-200'>{enhancedPrompt}</p>
                  </div>
                </div>
              </div>
            )}

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

                {/* Waveform Display */}
                <div className='space-y-2'>
                  <label className='block text-xs font-medium text-slate-400'>
                    Waveform Preview (Drag edges to trim)
                  </label>
                  <div
                    ref={waveformContainerRef}
                    className='bg-slate-900 rounded-lg border border-slate-700 overflow-hidden'
                  />

                  {/* Trim Info */}
                  <div className='flex justify-between text-xs text-slate-400'>
                    <span>Start: {trimStart.toFixed(2)}s</span>
                    <span>Duration: {(trimEnd - trimStart).toFixed(2)}s</span>
                    <span>End: {trimEnd.toFixed(2)}s</span>
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
