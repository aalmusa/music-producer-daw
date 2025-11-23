'use client';

import { Track } from '@/lib/midiTypes';

interface TrackTypeDialogProps {
  isOpen: boolean;
  onSelectMidi: () => void;
  onSelectAudio: () => void;
  onClose: () => void;
}

export default function TrackTypeDialog({
  isOpen,
  onSelectMidi,
  onSelectAudio,
  onClose,
}: TrackTypeDialogProps) {
  // Handle audio track selection
  const handleAudioClick = () => {
    // This will trigger the audio file picker in parent
    onSelectAudio();
  };
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className='fixed inset-0 bg-black/50 z-40'
        onClick={onClose}
      />

      {/* Dialog */}
      <div className='fixed inset-0 z-50 flex items-center justify-center'>
        <div className='bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-w-sm w-full mx-4'>
          {/* Header */}
          <div className='p-6 border-b border-slate-700'>
            <h2 className='text-lg font-semibold text-slate-100'>
              Create New Track
            </h2>
            <p className='text-sm text-slate-400 mt-1'>
              Choose the track type you want to add
            </p>
          </div>

          {/* Content */}
          <div className='p-6 space-y-4'>
            {/* MIDI Option */}
            <button
              onClick={onSelectMidi}
              className='w-full p-4 border border-slate-700 rounded-lg hover:border-blue-500 hover:bg-slate-800/50 transition-all text-left group'
            >
              <div className='flex items-start gap-4'>
                <div className='w-10 h-10 rounded bg-blue-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/30'>
                  <span className='text-blue-400 text-lg'>♪</span>
                </div>
                <div className='flex-1'>
                  <h3 className='font-medium text-slate-100'>MIDI Track</h3>
                  <p className='text-sm text-slate-400 mt-1'>
                    For synthesized instruments and note-based composition. Great for melodies, bass, pads, and more.
                  </p>
                </div>
              </div>
            </button>

            {/* Audio Option */}
            <button
              onClick={handleAudioClick}
              className='w-full p-4 border border-slate-700 rounded-lg hover:border-emerald-500 hover:bg-slate-800/50 transition-all text-left group'
            >
              <div className='flex items-start gap-4'>
                <div className='w-10 h-10 rounded bg-emerald-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/30'>
                  <span className='text-emerald-400 text-lg'>♪</span>
                </div>
                <div className='flex-1'>
                  <h3 className='font-medium text-slate-100'>Audio Track</h3>
                  <p className='text-sm text-slate-400 mt-1'>
                    For recording or loading audio files. Perfect for drums, vocals, or pre-recorded samples.
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* Footer */}
          <div className='p-4 border-t border-slate-700 flex justify-end'>
            <button
              onClick={onClose}
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
