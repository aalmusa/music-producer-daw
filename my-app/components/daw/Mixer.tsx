// components/daw/Mixer.tsx

import { Track } from '@/lib/midiTypes';
import { useEffect, useRef, useState } from 'react';

interface MixerProps {
  tracks: Track[];
  masterVolume: number;
  onTrackVolumeChange: (trackId: string, volume: number) => void;
  onMasterVolumeChange: (volume: number) => void;
}

export default function Mixer({
  tracks,
  masterVolume,
  onTrackVolumeChange,
  onMasterVolumeChange,
}: MixerProps) {
  return (
    <div className='h-full flex flex-col'>
      <div className='h-8 flex items-center px-3 border-b border-slate-800 text-xs text-slate-400'>
        Mixer
      </div>

      <div className='flex-1 flex gap-4 px-4 py-2 overflow-x-auto'>
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

        {/* Divider */}
        <div className='w-px bg-slate-700 mx-2 self-stretch' />

        {/* Master fader */}
        <ChannelStrip
          name='Master'
          volume={masterVolume}
          color='bg-red-500'
          onVolumeChange={onMasterVolumeChange}
          isMaster
        />
      </div>
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
        isMaster ? 'w-24' : 'w-20'
      } flex flex-col items-center text-xs text-slate-300`}
    >
      <div className='flex-1 flex flex-col items-center justify-end pb-2'>
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
      </div>

      {/* Track name */}
      <div
        className={`mt-1 ${
          isMaster ? 'text-xs font-semibold' : 'text-[10px]'
        } text-center truncate w-full`}
      >
        {name}
      </div>
    </div>
  );
}
