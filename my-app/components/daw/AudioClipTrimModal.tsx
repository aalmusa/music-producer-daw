'use client';

import { useEffect, useRef, useState } from 'react';
import type WaveSurfer from 'wavesurfer.js';

interface AudioClipTrimModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioUrl: string;
  clipName: string;
  onTrimComplete: (trimmedAudioUrl: string) => void;
}

export default function AudioClipTrimModal({
  isOpen,
  onClose,
  audioUrl,
  clipName,
  onTrimComplete,
}: AudioClipTrimModalProps) {
  const waveformContainerRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load waveform when modal opens
  useEffect(() => {
    if (!isOpen || !audioUrl || !waveformContainerRef.current) return;

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
            color: 'rgba(34, 197, 94, 0.2)',
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

      ws.load(audioUrl);
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
  }, [isOpen, audioUrl]);

  const handlePreview = () => {
    if (!wavesurferRef.current) return;

    if (isPlaying) {
      wavesurferRef.current.pause();
      setIsPlaying(false);
    } else {
      wavesurferRef.current.setTime(trimStart);
      wavesurferRef.current.play();
      setIsPlaying(true);

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

      fetch(audioUrl)
        .then((response) => response.arrayBuffer())
        .then((arrayBuffer) => audioContext.decodeAudioData(arrayBuffer))
        .then((audioBuffer) => {
          const sampleRate = audioBuffer.sampleRate;
          const startSample = Math.floor(start * sampleRate);
          const endSample = Math.floor(end * sampleRate);
          const trimmedLength = endSample - startSample;

          const trimmedBuffer = audioContext.createBuffer(
            audioBuffer.numberOfChannels,
            trimmedLength,
            sampleRate
          );

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

    const setUint16 = (data: number) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };
    const setUint32 = (data: number) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    setUint32(0x46464952);
    setUint32(length - 8);
    setUint32(0x45564157);
    setUint32(0x20746d66);
    setUint32(16);
    setUint16(1);
    setUint16(buffer.numberOfChannels);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * buffer.numberOfChannels * 2);
    setUint16(buffer.numberOfChannels * 2);
    setUint16(16);
    setUint32(0x61746164);
    setUint32(length - pos - 4);

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

  const handleApplyTrim = async () => {
    setIsProcessing(true);

    try {
      if (wavesurferRef.current && isPlaying) {
        wavesurferRef.current.pause();
        setIsPlaying(false);
      }

      let finalAudioUrl = audioUrl;
      if (trimStart > 0 || trimEnd < audioDuration) {
        console.log(`Trimming audio: ${trimStart}s to ${trimEnd}s`);
        finalAudioUrl = await trimAudio(audioUrl, trimStart, trimEnd);
      }

      onTrimComplete(finalAudioUrl);
      handleClose();
    } catch (err) {
      console.error('Error trimming audio:', err);
      alert('Failed to trim audio');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }
    setIsPlaying(false);
    onClose();
  };

  if (!isOpen) return null;

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
              Trim Audio Clip
            </h2>
            <p className='text-sm text-slate-400 mt-1'>{clipName}</p>
          </div>

          {/* Content */}
          <div className='p-6 space-y-4'>
            {/* Waveform Display */}
            <div className='space-y-2'>
              <label className='block text-sm font-medium text-slate-300'>
                Drag edges to trim
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

            {/* Actions */}
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
                    Stop
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
                    Preview
                  </>
                )}
              </button>

              {/* Apply Button */}
              <button
                onClick={handleApplyTrim}
                disabled={isProcessing}
                className='flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2'
              >
                {isProcessing ? (
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
                    Processing...
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
                        d='M5 13l4 4L19 7'
                      />
                    </svg>
                    Apply Trim
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className='p-6 border-t border-slate-700 flex justify-end'>
            <button
              onClick={handleClose}
              disabled={isProcessing}
              className='px-4 py-2 text-sm text-slate-300 hover:text-slate-100 transition-colors disabled:opacity-50'
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

