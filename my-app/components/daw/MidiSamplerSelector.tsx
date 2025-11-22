'use client';

import { AudioFile, audioLibrary } from '@/lib/audioLibrary';
import { useState } from 'react';

interface MidiSamplerSelectorProps {
  trackName: string;
  currentSamplerUrl?: string;
  onSelectSample: (audioFile: AudioFile | null) => void;
}

export default function MidiSamplerSelector({
  trackName,
  currentSamplerUrl,
  onSelectSample,
}: MidiSamplerSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentSample = audioLibrary.find((f) => f.path === currentSamplerUrl);

  return (
    <div className='p-4 border-b border-slate-700'>
      <h3 className='text-sm font-semibold text-slate-100 mb-3'>
        Sample Instrument
      </h3>

      <div className='space-y-2'>
        {currentSample ? (
          <>
            <div className='bg-slate-800 border border-slate-700 rounded p-3'>
              <p className='text-xs text-slate-400'>Current Sample</p>
              <p className='text-sm font-medium text-slate-100 mt-1'>
                {currentSample.name}
              </p>
              <p className='text-xs text-slate-500 mt-1'>
                {currentSample.description}
              </p>
            </div>

            <div className='flex gap-2'>
              <button
                onClick={() => setIsOpen(true)}
                className='flex-1 px-3 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors'
              >
                Change Sample
              </button>
              <button
                onClick={() => onSelectSample(null)}
                className='flex-1 px-3 py-2 text-xs bg-red-900/20 hover:bg-red-900/30 text-red-400 rounded transition-colors'
              >
                Remove
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={() => setIsOpen(true)}
            className='w-full px-3 py-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors'
          >
            + Attach Sample
          </button>
        )}
      </div>

      {/* Sample Selection Dropdown */}
      {isOpen && (
        <>
          <div
            className='fixed inset-0 z-40'
            onClick={() => setIsOpen(false)}
          />
          <div className='absolute z-50 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-xl'>
            <div className='p-3 border-b border-slate-700'>
              <p className='text-sm font-semibold text-slate-100'>
                Select Sample
              </p>
            </div>

            <div className='max-h-64 overflow-y-auto'>
              {audioLibrary.map((file) => (
                <button
                  key={file.id}
                  onClick={() => {
                    onSelectSample(file);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-slate-800 transition-colors border-b border-slate-800 last:border-b-0 ${
                    currentSamplerUrl === file.path ? 'bg-emerald-600/20' : ''
                  }`}
                >
                  <p className='text-sm font-medium text-slate-100'>
                    {file.name}
                  </p>
                  <p className='text-xs text-slate-500'>{file.description}</p>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
