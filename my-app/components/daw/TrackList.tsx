// components/daw/TrackList.tsx
'use client';

import { audioLibrary } from '@/lib/audioLibrary';
import { Track } from '@/lib/midiTypes';
import { useState } from 'react';

interface TrackListProps {
  tracks: Track[];
  onToggleMute?: (trackId: string) => void;
  onToggleSolo?: (trackId: string) => void;
  onAddTrack?: () => void;
  onDeleteTrack?: (trackId: string) => void;
  onAttachSample?: (trackId: string, audioPath: string | null) => void;
  onRenameTrack?: (trackId: string, newName: string) => void;
}

export default function TrackList({
  tracks,
  onToggleMute,
  onToggleSolo,
  onAddTrack,
  onDeleteTrack,
  onAttachSample,
  onRenameTrack,
}: TrackListProps) {
  const [expandedTrackId, setExpandedTrackId] = useState<string | null>(null);
  const [samplerDropdownOpen, setSamplerDropdownOpen] = useState<string | null>(
    null
  );
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleStartRename = (trackId: string, currentName: string) => {
    setEditingTrackId(trackId);
    setEditingName(currentName);
  };

  const handleFinishRename = (trackId: string) => {
    if (editingName.trim() && editingName !== tracks.find(t => t.id === trackId)?.name) {
      onRenameTrack?.(trackId, editingName.trim());
    }
    setEditingTrackId(null);
    setEditingName('');
  };

  const handleCancelRename = () => {
    setEditingTrackId(null);
    setEditingName('');
  };

  return (
    <div className='h-full flex flex-col'>
      {/* Header */}
      <div className='h-10 flex items-center px-3 border-b border-slate-800 text-xs text-slate-400'>
        Tracks
      </div>

      {/* Tracks */}
      <div className='flex-1 overflow-auto'>
        {tracks.map((track) => {
          const isExpanded = expandedTrackId === track.id;
          const currentSample = audioLibrary.find(
            (f) => f.path === track.samplerAudioUrl
          );

          return (
            <div key={track.id} className='border-b border-slate-800'>
              {/* Track Header */}
              <div className='h-16 flex items-center px-3 text-sm'>
                <div className={`w-2 h-8 rounded-full mr-2 ${track.color}`} />
                <div className='flex flex-col flex-1 min-w-0'>
                  <div className='flex items-center gap-2'>
                    {editingTrackId === track.id ? (
                      <input
                        type='text'
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => handleFinishRename(track.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleFinishRename(track.id);
                          } else if (e.key === 'Escape') {
                            handleCancelRename();
                          }
                        }}
                        autoFocus
                        className='font-medium text-slate-100 bg-slate-800 border border-emerald-500 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 min-w-0 flex-1'
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span
                        className='font-medium text-slate-100 truncate cursor-pointer hover:text-emerald-400 transition-colors'
                        onClick={() => handleStartRename(track.id, track.name)}
                        title='Click to rename'
                      >
                        {track.name}
                      </span>
                    )}
                    <span className='text-[8px] text-slate-500 uppercase'>
                      {track.type}
                    </span>
                    {track.type === 'midi' && currentSample && (
                      <span className='text-[8px] bg-emerald-600/30 text-emerald-300 px-1.5 py-0.5 rounded'>
                        {currentSample.name}
                      </span>
                    )}
                  </div>
                  <div className='flex gap-1 mt-1 text-[10px] text-slate-400'>
                    <button
                      className={`px-1 py-0.5 rounded ${
                        track.muted ? 'bg-red-600 text-white' : 'bg-slate-800'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleMute?.(track.id);
                      }}
                      title='Mute'
                    >
                      M
                    </button>
                    <button
                      className={`px-1 py-0.5 rounded ${
                        track.solo ? 'bg-yellow-600 text-white' : 'bg-slate-800'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSolo?.(track.id);
                      }}
                      title='Solo'
                    >
                      S
                    </button>

                    {/* Sampler dropdown toggle for MIDI tracks */}
                    {track.type === 'midi' && (
                      <button
                        className='px-1 py-0.5 rounded bg-slate-800 hover:bg-blue-600 transition-colors ml-auto'
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedTrackId(
                            isExpanded ? null : track.id
                          );
                          setSamplerDropdownOpen(null);
                        }}
                        title='Sampler options'
                      >
                        {isExpanded ? '▼' : '▶'}
                      </button>
                    )}

                    <button
                      className='px-1 py-0.5 rounded bg-slate-800 hover:bg-red-600 transition-colors ml-auto'
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTrack?.(track.id);
                      }}
                      title='Delete track'
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Options */}
              {isExpanded && track.type === 'midi' && (
                <div className='bg-slate-900 border-t border-slate-700 p-3 space-y-2'>
                  {/* Sampler Selector */}
                  <div className='relative'>
                    <button
                      onClick={() =>
                        setSamplerDropdownOpen(
                          samplerDropdownOpen === track.id ? null : track.id
                        )
                      }
                      className='w-full px-2 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-left flex items-center justify-between'
                    >
                      <span>
                        {currentSample
                          ? `Sample: ${currentSample.name}`
                          : 'Attach Sample...'}
                      </span>
                      <span className='text-[10px]'>
                        {samplerDropdownOpen === track.id ? '▲' : '▼'}
                      </span>
                    </button>

                    {/* Dropdown Menu */}
                    {samplerDropdownOpen === track.id && (
                      <>
                        <div
                          className='fixed inset-0 z-30'
                          onClick={() => setSamplerDropdownOpen(null)}
                        />
                        <div className='absolute z-40 top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded shadow-lg max-h-48 overflow-y-auto'>
                          {/* Remove sample option */}
                          {currentSample && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onAttachSample?.(track.id, null);
                                setSamplerDropdownOpen(null);
                              }}
                              className='w-full text-left px-3 py-2 text-xs hover:bg-slate-700 text-red-400 border-b border-slate-700'
                            >
                              ✕ Remove Sample
                            </button>
                          )}

                          {/* Audio samples */}
                          {audioLibrary.map((file) => (
                            <button
                              key={file.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onAttachSample?.(track.id, file.path);
                                setSamplerDropdownOpen(null);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-700 transition-colors ${
                                track.samplerAudioUrl === file.path
                                  ? 'bg-emerald-600/20 text-emerald-300 font-medium'
                                  : 'text-slate-300'
                              }`}
                            >
                              ♪ {file.name} - {file.description}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add track button */}
      <button 
        onClick={() => onAddTrack?.()}
        className='h-10 text-xs text-slate-300 border-t border-slate-800 hover:bg-slate-800 transition-colors'
      >
        + Add track
      </button>
    </div>
  );
}
