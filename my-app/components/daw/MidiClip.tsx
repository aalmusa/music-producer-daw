'use client';

import { MidiClipData } from '@/lib/midiTypes';

interface MidiClipProps {
  clipData: MidiClipData;
  onOpenEditor: () => void;
}

export default function MidiClip({ clipData, onOpenEditor }: MidiClipProps) {
  return (
    <button
      className='h-12 w-48 rounded bg-purple-600/80 border border-purple-400/40 text-xs flex flex-col items-center justify-center text-slate-100 hover:bg-purple-600 hover:border-purple-400 transition-all cursor-pointer group'
      onClick={onOpenEditor}
    >
      <div className='font-medium'>MIDI Clip</div>
      <div className='text-[10px] text-purple-200 mt-0.5'>
        {clipData.notes.length} notes • Click to edit
      </div>
    </button>
  );
}
