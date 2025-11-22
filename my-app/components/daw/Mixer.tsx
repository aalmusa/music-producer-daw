// components/daw/Mixer.tsx

import { Track } from '@/lib/midiTypes';

interface MixerProps {
  tracks: Track[];
}

export default function Mixer({ tracks }: MixerProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="h-8 flex items-center px-3 border-b border-slate-800 text-xs text-slate-400">
        Mixer
      </div>

      <div className="flex-1 flex gap-4 px-4 py-2 overflow-x-auto">
        {tracks.map(track => (
          <div
            key={track.id}
            className="w-20 flex flex-col items-center text-xs text-slate-300"
          >
            <div className="flex-1 flex flex-col items-center justify-end">
              <div className="w-8 h-24 rounded bg-slate-800 border border-slate-700 flex items-end overflow-hidden">
                <div className="w-full h-10 bg-emerald-500" />
              </div>
              <div className="mt-1 text-[10px] text-slate-400">0 dB</div>
            </div>

            <div className="mt-2 text-[10px] text-center truncate w-full">
              {track.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
