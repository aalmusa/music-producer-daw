// components/daw/Mixer.tsx

import { Track } from '@/lib/midiTypes';
import { useEffect, useRef, useState } from 'react';

interface MixerProps {
  tracks: Track[];
  masterVolume: number;
  onTrackVolumeChange: (trackId: string, volume: number) => void;
  onMasterVolumeChange: (volume: number) => void;
  isMinimized?: boolean;
  onToggleMinimize?: (minimized: boolean) => void;
}

export default function Mixer({
  tracks,
  masterVolume,
  onTrackVolumeChange,
  onMasterVolumeChange,
  isMinimized = false,
  onToggleMinimize,
}: MixerProps) {
  const handleToggle = () => {
    const newState = !isMinimized;
    onToggleMinimize?.(newState);
  };

  return (
    <div className='h-full flex flex-col'>
      <div className='h-8 flex items-center justify-between px-3 border-b border-slate-800 text-xs text-slate-400'>
        <span>Mixer</span>
        <button
          onClick={handleToggle}
          className='px-2 py-0.5 hover:bg-slate-800 rounded transition-colors'
          title={isMinimized ? 'Expand mixer' : 'Minimize mixer'}
        >
          {isMinimized ? '▲' : '▼'}
        </button>
      </div>

      {!isMinimized && (
        <div className='flex-1 overflow-x-auto overflow-y-hidden'>
          <div className='flex gap-4 px-4 py-2 min-w-min'>
            {/* Master fader - now first on the left */}
            <ChannelStrip
              name='Master Volume'
              volume={masterVolume}
              color='bg-red-500'
              onVolumeChange={onMasterVolumeChange}
              isMaster
            />

            {/* Divider */}
            <div className='w-px bg-slate-700 mx-2 self-stretch' />

            {/* Individual track faders */}
            {tracks.map((track) => (
              <ChannelStrip
                key={track.id}
                name={track.name}
                volume={track.volume}
              color={track.color}
              onVolumeChange={(vol) => onTrackVolumeChange(track.id, vol)}
            />
          ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ChannelStripProps {
  name: string;
  volume: number; // 0 to 1
  color: string;
  onVolumeChange: (volume: number) => void;
  isMaster?: boolean;
}

function ChannelStrip({
  name,
  volume,
  color,
  onVolumeChange,
  isMaster = false,
}: ChannelStripProps) {
  const [isDragging, setIsDragging] = useState(false);
  const faderRef = useRef<HTMLDivElement>(null);

  // Convert volume (0-1) to decibels for display
  const volumeToDb = (vol: number): string => {
    if (vol === 0) return '-∞';
    const db = (vol - 1) * 24;
    return db.toFixed(1);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updateVolume(e.clientY);
  };

  const updateVolume = (clientY: number) => {
    if (!faderRef.current) return;

    const rect = faderRef.current.getBoundingClientRect();
    const relativeY = rect.bottom - clientY;
    const height = rect.height;

    // Calculate volume (0 to 1), clamped
    const newVolume = Math.max(0, Math.min(1, relativeY / height));

    onVolumeChange(newVolume);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      updateVolume(e.clientY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      className={`${
        isMaster ? 'w-28' : 'w-24'
      } flex flex-col items-center text-xs text-slate-300`}
    >
      {/* Fader track */}
      <div
        ref={faderRef}
        className='w-8 h-32 rounded bg-slate-800 border border-slate-700 flex items-end overflow-hidden relative cursor-ns-resize'
        onMouseDown={handleMouseDown}
      >
        {/* Volume fill */}
        <div
          className={`w-full ${color} transition-all`}
          style={{ height: `${volume * 100}%` }}
        />

        {/* Fader knob */}
        <div
          className='absolute left-0 right-0 h-3 bg-slate-200 border border-slate-400 rounded-sm shadow-lg'
          style={{ bottom: `calc(${volume * 100}% - 6px)` }}
        />
      </div>

      {/* dB display */}
      <div className='mt-2 text-[10px] text-slate-400 font-mono min-w-[3rem] text-center'>
        {volumeToDb(volume)} dB
      </div>

      {/* Track name */}
      <div
        className={`mt-1 px-1 ${
          isMaster ? 'text-sm font-semibold' : 'text-xs'
        } text-center truncate w-full text-slate-100`}
        title={name}
      >
        {name}
      </div>
    </div>
  );
}
