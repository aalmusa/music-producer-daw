'use client';

import { AudioFile, audioLibrary } from '@/lib/audioLibrary';
import { useState } from 'react';

interface AudioFilePickerProps {
  isOpen: boolean;
  onSelectFile: (audioFile: AudioFile) => void;
  onClose: () => void;
}

export default function AudioFilePicker({
  isOpen,
  onSelectFile,
  onClose,
}: AudioFilePickerProps) {
  const [selectedCategory, setSelectedCategory] = useState<
    'drums' | 'percussion' | 'loop' | 'sample' | 'other' | 'all'
  >('all');

  const filteredFiles =
    selectedCategory === 'all'
      ? audioLibrary
      : audioLibrary.filter((f) => f.category === selectedCategory);

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'drums', label: 'Drums' },
    { id: 'percussion', label: 'Percussion' },
    { id: 'loop', label: 'Loops' },
    { id: 'sample', label: 'Samples' },
    { id: 'other', label: 'Other' },
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className='fixed inset-0 bg-black/50 z-40' onClick={onClose} />

      {/* Dialog */}
      <div className='fixed inset-0 z-50 flex items-center justify-center'>
        <div className='bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-96 flex flex-col'>
          {/* Header */}
          <div className='p-6 border-b border-slate-700'>
            <h2 className='text-lg font-semibold text-slate-100'>
              Select Audio File
            </h2>
            <p className='text-sm text-slate-400 mt-1'>
              Choose an audio file for this track
            </p>
          </div>

          {/* Category Filter */}
          <div className='px-6 pt-4 border-b border-slate-700'>
            <div className='flex gap-2 flex-wrap'>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() =>
                    setSelectedCategory(
                      cat.id as
                        | 'drums'
                        | 'percussion'
                        | 'loop'
                        | 'sample'
                        | 'other'
                        | 'all'
                    )
                  }
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* File List */}
          <div className='flex-1 overflow-auto p-4'>
            {filteredFiles.length === 0 ? (
              <div className='text-center text-slate-400 py-8'>
                No audio files in this category
              </div>
            ) : (
              <div className='space-y-2'>
                {filteredFiles.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => onSelectFile(file)}
                    className='w-full p-4 border border-slate-700 rounded-lg hover:border-emerald-500 hover:bg-slate-800/50 transition-all text-left group'
                  >
                    <div className='flex items-start justify-between'>
                      <div className='flex-1'>
                        <h3 className='font-medium text-slate-100 group-hover:text-emerald-400'>
                          {file.name}
                        </h3>
                        <p className='text-sm text-slate-400 mt-1'>
                          {file.description}
                        </p>
                        <p className='text-xs text-slate-500 mt-2'>
                          📁 {file.filename}
                        </p>
                      </div>
                      <div className='text-xs bg-slate-800 px-2 py-1 rounded ml-4 flex-shrink-0'>
                        {file.category}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
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
