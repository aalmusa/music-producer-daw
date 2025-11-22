'use client';

import { LOOP_BARS, getLoopProgress, updateMidiPart } from '@/lib/audioEngine';
import { Track } from '@/lib/midiTypes';
import { useEffect, useRef, useState } from 'react';
import MidiClip from './MidiClip';
import PianoRollModal from './PianoRollModal';
import WaveformTrack from './WaveformTrack';

interface TimelineProps {
  tracks: Track[];
  setTracks: React.Dispatch<React.SetStateAction<Track[]>>;
}

export default function Timeline({ tracks, setTracks }: TimelineProps) {
  const measureCount = LOOP_BARS;

  const [playheadProgress, setPlayheadProgress] = useState(0);
  const [trackHeight, setTrackHeight] = useState(96);

  // Piano roll modal state
  const [pianoRollOpen, setPianoRollOpen] = useState(false);
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);

  // Update MIDI clip for a track
  const handleUpdateMidiClip = (
    trackId: string,
    clipData: Track['midiClip']
  ) => {
    setTracks((prev) =>
      prev.map((track) =>
        track.id === trackId ? { ...track, midiClip: clipData } : track
      )
    );

    // Update the audio engine
    updateMidiPart(trackId, clipData ?? null);
  };

  // Open piano roll for a track
  const handleOpenPianoRoll = (trackId: string) => {
    setEditingTrackId(trackId);
    setPianoRollOpen(true);
  };

  // Close piano roll
  const handleClosePianoRoll = () => {
    setPianoRollOpen(false);
    setEditingTrackId(null);
  };

  // Get the track being edited
  const editingTrack = tracks.find((t) => t.id === editingTrackId);

  const [isResizingTracks, setIsResizingTracks] = useState(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(96);

  // Update playhead from Tone transport
  useEffect(() => {
    let frameId: number;

    const update = () => {
      const p = getLoopProgress();
      setPlayheadProgress(p);
      frameId = requestAnimationFrame(update);
    };

    update();

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, []);

  // Handle mouse move for track height resizing
  useEffect(() => {
    if (!isResizingTracks) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientY - startYRef.current;
      const newHeight = Math.min(
        160,
        Math.max(64, startHeightRef.current + delta)
      );
      setTrackHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizingTracks(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingTracks]);

  const startResizeTracks = (e: React.MouseEvent<HTMLDivElement>) => {
    startYRef.current = e.clientY;
    startHeightRef.current = trackHeight;
    setIsResizingTracks(true);
  };

  return (
    <div className='h-full w-full relative'>
      {/* Time ruler at the top */}
      <div className='h-12 border-b border-slate-800 bg-slate-950/80 sticky top-0 z-10 flex text-[10px] text-slate-400'>
        {Array.from({ length: measureCount }).map((_, i) => (
          <div
            key={i}
            className='flex-1 border-r border-slate-800 flex items-center justify-center'
          >
            {i + 1}
          </div>
        ))}
      </div>

      {/* Track lanes */}
      <div>
        {tracks.map((track) => (
          <div
            key={track.id}
            className='relative border-b border-slate-800'
            style={{ height: trackHeight }}
          >
            {/* Vertical grid for measures */}
            <div className='absolute inset-0 flex'>
              {Array.from({ length: measureCount }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 border-r border-slate-900 ${
                    i % 4 === 0 ? 'bg-slate-900' : 'bg-slate-900/80'
                  }`}
                />
              ))}
            </div>

            {/* Content: Audio or MIDI clips */}
            <div className='relative h-full flex items-center px-2 overflow-auto'>
              {track.type === 'audio' && track.audioUrl ? (
                <WaveformTrack fileUrl={track.audioUrl} label={track.name} />
              ) : track.type === 'midi' && track.midiClip ? (
                <MidiClip
                  clipData={track.midiClip}
                  onOpenEditor={() => handleOpenPianoRoll(track.id)}
                />
              ) : (
                <button
                  className='h-12 w-48 rounded bg-slate-700/60 border border-slate-600/40 text-xs flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:border-slate-600 hover:text-slate-300 transition-all cursor-pointer'
                  onClick={() => handleOpenPianoRoll(track.id)}
                >
                  + Add MIDI Clip
                </button>
              )}
            </div>

            {/* Resize handle at the bottom edge of the track row */}
            <div
              className='absolute bottom-0 left-0 right-0 h-1 cursor-row-resize bg-transparent hover:bg-emerald-500/60'
              onMouseDown={startResizeTracks}
            />
          </div>
        ))}
      </div>

      {/* Playhead line */}
      <div
        className='pointer-events-none absolute top-12 bottom-0 w-px bg-emerald-400'
        style={{ left: `${playheadProgress * 100}%` }}
      />

      {/* Piano Roll Modal */}
      {editingTrack && editingTrack.midiClip && (
        <PianoRollModal
          isOpen={pianoRollOpen}
          onClose={handleClosePianoRoll}
          trackId={editingTrack.id}
          trackName={editingTrack.name}
          trackColor={editingTrack.color}
          clipData={editingTrack.midiClip}
          onUpdateClip={(clipData) =>
            handleUpdateMidiClip(editingTrack.id, clipData)
          }
        />
      )}
    </div>
  );
}
