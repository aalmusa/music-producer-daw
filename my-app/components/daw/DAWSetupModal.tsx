'use client';

import { useSongSpec } from '@/lib/song-spec-context';
import {
  DAWAssistantRequest,
  DAWAssistantResponse,
} from '@/types/music-production';
import { Music, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/button';

interface DAWSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSetupComplete: (response: DAWAssistantResponse) => void;
  dawState: DAWAssistantRequest['dawState'];
}

export default function DAWSetupModal({
  isOpen,
  onClose,
  onSetupComplete,
  dawState,
}: DAWSetupModalProps) {
  const { songSpec } = useSongSpec();
  const [isSettingUp, setIsSettingUp] = useState(false);

  if (!isOpen || !songSpec) return null;

  // Extract BPM, Key, and Instruments from song spec
  const bpm = songSpec.bpm ?? songSpec.aggregate?.bpm ?? null;
  const key = songSpec.key ?? songSpec.aggregate?.key ?? null;
  const scale = songSpec.scale ?? songSpec.aggregate?.scale ?? '';
  const instruments =
    Array.isArray(songSpec.instruments) && songSpec.instruments.length > 0
      ? songSpec.instruments
      : [];

  // Don't show modal if we don't have the required information
  if (!bpm || !key || instruments.length === 0) {
    return null;
  }

  const handleSetup = async () => {
    setIsSettingUp(true);

    try {
      // Build a prompt for the DAW assistant to set up BPM and create tracks
      const instrumentsList = instruments.join(', ');
      const prompt = `Set up the DAW with BPM ${bpm}, key ${key}${
        scale ? ` ${scale}` : ''
      }, and create tracks for these instruments: ${instrumentsList}. Set the BPM first, then create a track for each instrument.`;

      const requestBody: DAWAssistantRequest = {
        message: prompt,
        dawState,
      };

      const response = await fetch('/api/daw-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to set up DAW');
      }

      const data: DAWAssistantResponse = await response.json();
      onSetupComplete(data);
      onClose();
    } catch (error) {
      console.error('Error setting up DAW:', error);
      alert('Failed to set up DAW. Please try again.');
    } finally {
      setIsSettingUp(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className='fixed inset-0 bg-black/70 z-50 backdrop-blur-sm'
        onClick={onClose}
      />

      {/* Modal */}
      <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
        <div className='bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-w-md w-full mx-4'>
          {/* Header */}
          <div className='p-6 border-b border-slate-700 flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center'>
                <Music className='h-5 w-5 text-emerald-400' />
              </div>
              <div>
                <h2 className='text-lg font-semibold text-slate-100'>
                  Set Up Your DAW
                </h2>
                <p className='text-sm text-slate-400 mt-0.5'>
                  Configure based on your song context
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className='text-slate-400 hover:text-slate-200 transition-colors p-1 rounded hover:bg-slate-800'
              aria-label='Close'
            >
              <X className='h-5 w-5' />
            </button>
          </div>

          {/* Content */}
          <div className='p-6 space-y-4'>
            <div className='space-y-3'>
              {/* BPM */}
              <div className='flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700'>
                <div>
                  <p className='text-sm text-slate-400'>BPM</p>
                  <p className='text-lg font-semibold text-slate-100'>{bpm}</p>
                </div>
              </div>

              {/* Key */}
              <div className='flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700'>
                <div>
                  <p className='text-sm text-slate-400'>Key</p>
                  <p className='text-lg font-semibold text-slate-100'>
                    {key}
                    {scale && (
                      <span className='text-slate-400 ml-1'>{scale}</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Instruments */}
              <div className='p-3 bg-slate-800/50 rounded-lg border border-slate-700'>
                <p className='text-sm text-slate-400 mb-2'>Instruments</p>
                <div className='flex flex-wrap gap-2'>
                  {instruments.map((instrument, index) => (
                    <span
                      key={index}
                      className='px-3 py-1.5 bg-emerald-500/20 text-emerald-300 rounded-md text-sm font-medium border border-emerald-500/30'
                    >
                      {instrument}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className='pt-2'>
              <p className='text-xs text-slate-500'>
                Click &quot;Set Up&quot; to automatically configure the BPM and
                create tracks for each instrument.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className='p-4 border-t border-slate-700 flex justify-end gap-3'>
            <Button
              variant='outline'
              onClick={onClose}
              disabled={isSettingUp}
              className='border-slate-700 bg-transparent text-slate-300 hover:text-slate-100 hover:bg-slate-800'
            >
              Skip
            </Button>
            <Button
              onClick={handleSetup}
              disabled={isSettingUp}
              className='bg-emerald-600 hover:bg-emerald-700 text-white'
            >
              {isSettingUp ? 'Setting up...' : 'Set Up'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
