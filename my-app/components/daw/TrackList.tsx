// components/daw/TrackList.tsx
'use client';

import { Track } from '@/lib/midiTypes';

interface TrackListProps {
  tracks: Track[];
  onToggleMute?: (trackId: string) => void;
  onToggleSolo?: (trackId: string) => void;
}

export default function TrackList({
  tracks,
  onToggleMute,
  onToggleSolo,
}: TrackListProps) {
  return (
    <div className='h-full flex flex-col'>
      {/* Header */}
      <div className='h-10 flex items-center px-3 border-b border-slate-800 text-xs text-slate-400'>
        Tracks
      </div>

      {/* Tracks */}
      <div className='flex-1 overflow-auto'>
        {tracks.map((track) => (
          <div
            key={track.id}
            className='h-16 flex items-center px-3 border-b border-slate-800 text-sm'
          >
            <div className={`w-2 h-8 rounded-full mr-2 ${track.color}`} />
            <div className='flex flex-col flex-1'>
              <div className='flex items-center gap-2'>
                <span className='font-medium text-slate-100'>{track.name}</span>
                <span className='text-[8px] text-slate-500 uppercase'>
                  {track.type}
                </span>
              </div>
              <div className='flex gap-1 mt-1 text-[10px] text-slate-400'>
                <button
                  className={`px-1 py-0.5 rounded ${
                    track.muted ? 'bg-red-600 text-white' : 'bg-slate-800'
                  }`}
                  onClick={() => onToggleMute?.(track.id)}
                  title='Mute'
                >
                  M
                </button>
                <button
                  className={`px-1 py-0.5 rounded ${
                    track.solo ? 'bg-yellow-600 text-white' : 'bg-slate-800'
                  }`}
                  onClick={() => onToggleSolo?.(track.id)}
                  title='Solo'
                >
                  S
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add track button */}
      <button className='h-10 text-xs text-slate-300 border-t border-slate-800 hover:bg-slate-900'>
        + Add track
      </button>
    </div>
  );
}
