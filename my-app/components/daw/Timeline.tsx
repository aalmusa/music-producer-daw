'use client';

import { getLoopProgress, LOOP_BARS, updateMidiParts } from '@/lib/audioEngine';
import { createEmptyMidiClip, MidiClipData, Track } from '@/lib/midiTypes';
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
  const [editingClipId, setEditingClipId] = useState<string | null>(null);

  // Update MIDI clip for a track
  const handleUpdateMidiClip = (
    trackId: string,
    clipId: string,
    clipData: MidiClipData
  ) => {
    setTracks((prev) =>
      prev.map((track) => {
        if (track.id !== trackId) return track;

        const updatedClips = (track.midiClips || []).map((clip) =>
          clip.id === clipId ? clipData : clip
        );

        // Update the audio engine with ALL clips for this track, preserving sampler
        updateMidiParts(trackId, updatedClips, track.samplerAudioUrl);

        return { ...track, midiClips: updatedClips };
      })
    );
  };

  // Move clip to new position
  const handleMoveClip = (
    trackId: string,
    clipId: string,
    newStartBar: number
  ) => {
    setTracks((prev) =>
      prev.map((track) => {
        if (track.id !== trackId) return track;

        const updatedClips = (track.midiClips || []).map((clip) =>
          clip.id === clipId ? { ...clip, startBar: newStartBar } : clip
        );

        // Update the audio engine with repositioned clips, preserving sampler
        updateMidiParts(trackId, updatedClips, track.samplerAudioUrl ?? undefined);

        return { ...track, midiClips: updatedClips };
      })
    );
  };

  // Add new MIDI clip to track
  const handleAddClip = (trackId: string, startBar: number = 0) => {
    const newClip = createEmptyMidiClip(4, startBar);

    setTracks((prev) =>
      prev.map((track) => {
        if (track.id !== trackId) return track;

        const existingClips = track.midiClips || [];
        const updatedClips = [...existingClips, newClip];

        // Update audio engine, preserving sampler
        updateMidiParts(track.id, updatedClips, track.samplerAudioUrl ?? undefined);

        return { ...track, midiClips: updatedClips };
      })
    );

    // Open editor for new clip
    setEditingTrackId(trackId);
    setEditingClipId(newClip.id);
    setPianoRollOpen(true);
  };

  // Delete MIDI clip
  const handleDeleteClip = (trackId: string, clipId: string) => {
    setTracks((prev) =>
      prev.map((track) => {
        if (track.id !== trackId) return track;

        const updatedClips = (track.midiClips || []).filter(
          (clip) => clip.id !== clipId
        );

        // Update audio engine, preserving sampler
        updateMidiParts(track.id, updatedClips, track.samplerAudioUrl ?? undefined);

        return { ...track, midiClips: updatedClips };
      })
    );
  };

  // Get all empty 4-bar slots for a track
  const getEmptySlots = (trackId: string): number[] => {
    const track = tracks.find((t) => t.id === trackId);
    const emptySlots: number[] = [];

    // Get occupied ranges
    const occupiedRanges =
      track?.midiClips?.map((clip) => ({
        start: clip.startBar,
        end: clip.startBar + clip.bars,
      })) || [];

    // Check each 4-bar slot
    for (let bar = 0; bar < measureCount; bar += 4) {
      const slotEnd = bar + 4;
      const isOccupied = occupiedRanges.some(
        (range) =>
          (bar >= range.start && bar < range.end) ||
          (slotEnd > range.start && slotEnd <= range.end) ||
          (bar < range.start && slotEnd > range.start)
      );

      if (!isOccupied && slotEnd <= measureCount) {
        emptySlots.push(bar);
      }
    }

    return emptySlots;
  };

  // Open piano roll for a clip
  const handleOpenPianoRoll = (trackId: string, clipId: string) => {
    setEditingTrackId(trackId);
    setEditingClipId(clipId);
    setPianoRollOpen(true);
  };

  // Close piano roll
  const handleClosePianoRoll = () => {
    setPianoRollOpen(false);
    setEditingTrackId(null);
    setEditingClipId(null);
  };

  // Get the clip being edited
  const editingTrack = tracks.find((t) => t.id === editingTrackId);
  const editingClip = editingTrack?.midiClips?.find(
    (c) => c.id === editingClipId
  );

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
      <div className='timeline-container'>
        {tracks.map((track) => (
          <div
            key={track.id}
            className='relative border-b border-slate-800'
            style={{ height: trackHeight }}
          >
            {/* Vertical grid for measures */}
            <div className='absolute inset-0 flex pointer-events-none'>
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
            <div className='relative h-full flex items-center'>
              {track.type === 'audio' && track.audioUrl ? (
                <div className='px-2 w-full'>
                  <WaveformTrack fileUrl={track.audioUrl} label={track.name} />
                </div>
              ) : track.type === 'midi' ? (
                <>
                  {/* Render empty slot buttons */}
                  {getEmptySlots(track.id).map((startBar) => {
                    const slotLeftPercent = (startBar / measureCount) * 100;
                    const slotWidthPercent = (4 / measureCount) * 100;

                    return (
                      <button
                        key={`empty-${startBar}`}
                        className='absolute h-12 rounded border-2 border-dashed border-slate-700/50 bg-slate-800/20 hover:bg-slate-800/40 hover:border-slate-600/70 flex items-center justify-center text-slate-600 hover:text-slate-400 transition-all cursor-pointer group'
                        style={{
                          left: `${slotLeftPercent}%`,
                          width: `${slotWidthPercent}%`,
                        }}
                        onClick={() => handleAddClip(track.id, startBar)}
                      >
                        <svg
                          className='w-6 h-6 opacity-50 group-hover:opacity-100 transition-opacity'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M12 4v16m8-8H4'
                          />
                        </svg>
                      </button>
                    );
                  })}

                  {/* Render all MIDI clips */}
                  {track.midiClips?.map((clip) => (
                    <MidiClip
                      key={clip.id}
                      clipData={clip}
                      totalBars={measureCount}
                      onOpenEditor={() =>
                        handleOpenPianoRoll(track.id, clip.id)
                      }
                      onMove={(newStartBar) =>
                        handleMoveClip(track.id, clip.id, newStartBar)
                      }
                      onDelete={() => handleDeleteClip(track.id, clip.id)}
                    />
                  ))}
                </>
              ) : null}
            </div>

            {/* Resize handle at the bottom edge of the track row */}
            <div
              className='absolute bottom-0 left-0 right-0 h-1 cursor-row-resize bg-transparent hover:bg-emerald-500/60 z-30'
              onMouseDown={startResizeTracks}
            />
          </div>
        ))}
      </div>

      {/* Playhead line */}
      <div
        className='pointer-events-none absolute top-12 bottom-0 w-px bg-emerald-400 z-40'
        style={{ left: `${playheadProgress * 100}%` }}
      />

      {/* Piano Roll Modal */}
      {editingTrack && editingClip && (
        <PianoRollModal
          isOpen={pianoRollOpen}
          onClose={handleClosePianoRoll}
          trackId={editingTrack.id}
          trackName={editingTrack.name}
          trackColor={editingTrack.color}
          clipData={editingClip}
          onUpdateClip={(clipData) =>
            handleUpdateMidiClip(editingTrack.id, editingClip.id, clipData)
          }
        />
      )}
    </div>
  );
}
