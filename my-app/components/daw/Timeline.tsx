'use client';

import {
  createAudioLoopPlayer,
  getLoopProgress,
  LOOP_BARS,
  removeAudioLoopPlayer,
  setTransportPosition,
  updateMidiParts,
} from '@/lib/audioEngine';
import {
  createAudioClip,
  createEmptyMidiClip,
  MidiClipData,
  Track,
} from '@/lib/midiTypes';
import { useEffect, useRef, useState } from 'react';
import AudioClip from './AudioClip';
import AudioClipGeneratorModal from './AudioClipGeneratorModal';
import AudioClipTrimModal from './AudioClipTrimModal';
import MidiClip from './MidiClip';
import PianoRollModal from './PianoRollModal';

interface TimelineProps {
  tracks: Track[];
  setTracks: React.Dispatch<React.SetStateAction<Track[]>>;
  trackHeight: number;
  setTrackHeight: React.Dispatch<React.SetStateAction<number>>;
  bpm: number;
  metronomeEnabled: boolean;
}

export default function Timeline({
  tracks,
  setTracks,
  trackHeight,
  setTrackHeight,
  bpm,
  metronomeEnabled,
}: TimelineProps) {
  const measureCount = LOOP_BARS;

  const [playheadProgress, setPlayheadProgress] = useState(0);

  // Piano roll modal state
  const [pianoRollOpen, setPianoRollOpen] = useState(false);
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editingClipId, setEditingClipId] = useState<string | null>(null);

  // Audio generator modal state
  const [audioGenModalOpen, setAudioGenModalOpen] = useState(false);
  const [audioGenTrackId, setAudioGenTrackId] = useState<string | null>(null);
  const [audioGenClipId, setAudioGenClipId] = useState<string | null>(null);
  const [audioGenStartBar, setAudioGenStartBar] = useState(0);

  // Audio trim modal state
  const [audioTrimModalOpen, setAudioTrimModalOpen] = useState(false);
  const [trimTrackId, setTrimTrackId] = useState<string | null>(null);
  const [trimClipId, setTrimClipId] = useState<string | null>(null);

  // Track which clips have been initialized to avoid duplicates
  const [initializedClips, setInitializedClips] = useState<Set<string>>(
    new Set()
  );

  // Initialize audio loop players for audio clips
  useEffect(() => {
    const newInitializedClips = new Set(initializedClips);

    tracks.forEach((track) => {
      if (track.type === 'audio' && track.audioClips) {
        track.audioClips.forEach((clip) => {
          const clipKey = `${track.id}:${clip.id}`;

          // Only create player if not already initialized
          if (!initializedClips.has(clipKey)) {
            createAudioLoopPlayer(
              track.id,
              clip.id,
              clip.audioUrl,
              clip.startBar
            )
              .then(() => {
                newInitializedClips.add(clipKey);
                setInitializedClips(new Set(newInitializedClips));
              })
              .catch((error) => {
                console.error(
                  `Failed to create audio player for clip ${clip.id}:`,
                  error
                );
              });
          }
        });
      }
    });
  }, [tracks, initializedClips]);

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
        updateMidiParts(
          trackId,
          updatedClips,
          track.samplerAudioUrl ?? undefined
        );

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
        updateMidiParts(
          track.id,
          updatedClips,
          track.samplerAudioUrl ?? undefined
        );

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
        updateMidiParts(
          track.id,
          updatedClips,
          track.samplerAudioUrl ?? undefined
        );

        return { ...track, midiClips: updatedClips };
      })
    );
  };

  // Move audio clip to new position
  const handleMoveAudioClip = (
    trackId: string,
    clipId: string,
    newStartBar: number
  ) => {
    // Remove old player
    removeAudioLoopPlayer(trackId, clipId);

    // Remove from initialized set so it can be recreated
    const clipKey = `${trackId}:${clipId}`;
    setInitializedClips((prev) => {
      const newSet = new Set(prev);
      newSet.delete(clipKey);
      return newSet;
    });

    setTracks((prev) =>
      prev.map((track) => {
        if (track.id !== trackId) return track;

        const updatedClips = (track.audioClips || []).map((clip) => {
          if (clip.id === clipId) {
            return { ...clip, startBar: newStartBar };
          }
          return clip;
        });

        return { ...track, audioClips: updatedClips };
      })
    );
  };

  // Delete audio clip
  const handleDeleteAudioClip = (trackId: string, clipId: string) => {
    // Remove the audio player
    removeAudioLoopPlayer(trackId, clipId);

    // Remove from initialized clips set
    const clipKey = `${trackId}:${clipId}`;
    setInitializedClips((prev) => {
      const newSet = new Set(prev);
      newSet.delete(clipKey);
      return newSet;
    });

    setTracks((prev) =>
      prev.map((track) => {
        if (track.id !== trackId) return track;

        const updatedClips = (track.audioClips || []).filter(
          (clip) => clip.id !== clipId
        );

        return { ...track, audioClips: updatedClips };
      })
    );
  };

  // Copy/duplicate an audio clip to a new position
  const handleCopyAudioClip = (
    trackId: string,
    clipId: string,
    newStartBar: number
  ) => {
    setTracks((prev) =>
      prev.map((track) => {
        if (track.id !== trackId) return track;

        // Find the clip to copy
        const clipToCopy = track.audioClips?.find((c) => c.id === clipId);
        if (!clipToCopy) return track;

        // Create a new clip with same audio but different ID and position
        const newClip = createAudioClip(
          clipToCopy.audioUrl,
          newStartBar,
          clipToCopy.name
        );

        const existingClips = track.audioClips || [];
        const updatedClips = [...existingClips, newClip];

        return { ...track, audioClips: updatedClips };
      })
    );
  };

  // Copy/duplicate a MIDI clip to a new position
  const handleCopyMidiClip = (
    trackId: string,
    clipId: string,
    newStartBar: number
  ) => {
    setTracks((prev) =>
      prev.map((track) => {
        if (track.id !== trackId) return track;

        // Find the clip to copy
        const clipToCopy = track.midiClips?.find((c) => c.id === clipId);
        if (!clipToCopy) return track;

        // Create a new clip with same MIDI data but different ID and position
        const newClip: MidiClipData = {
          id: crypto.randomUUID(),
          startBar: newStartBar,
          bars: clipToCopy.bars,
          notes: clipToCopy.notes.map(note => ({
            ...note,
            id: crypto.randomUUID(), // Generate new IDs for notes too
          })),
        };

        const existingClips = track.midiClips || [];
        const updatedClips = [...existingClips, newClip];

        // Update the audio engine with ALL clips for this track
        updateMidiParts(trackId, updatedClips, track.samplerAudioUrl);

        return { ...track, midiClips: updatedClips };
      })
    );
  };

  // Duplicate a clip to the next available slot
  const handleDuplicateAudioClip = (trackId: string, clipId: string) => {
    const track = tracks.find((t) => t.id === trackId);
    if (!track) return;

    const clipToDuplicate = track.audioClips?.find((c) => c.id === clipId);
    if (!clipToDuplicate) return;

    // Find next available slot after this clip
    const emptySlots = getEmptySlots(trackId);
    const nextSlot = emptySlots.find((slot) => slot > clipToDuplicate.startBar);

    if (nextSlot !== undefined) {
      handleCopyAudioClip(trackId, clipId, nextSlot);
    } else {
      // No empty slots after this clip
      alert('No empty slots available after this clip');
    }
  };

  // Get all empty 4-bar slots for a track (works for both MIDI and audio)
  const getEmptySlots = (trackId: string): number[] => {
    const track = tracks.find((t) => t.id === trackId);
    const emptySlots: number[] = [];

    // Get occupied ranges from MIDI clips
    const midiOccupiedRanges =
      track?.midiClips?.map((clip) => ({
        start: clip.startBar,
        end: clip.startBar + clip.bars,
      })) || [];

    // Get occupied ranges from audio clips
    const audioOccupiedRanges =
      track?.audioClips?.map((clip) => ({
        start: clip.startBar,
        end: clip.startBar + clip.bars,
      })) || [];

    // Combine all occupied ranges
    const occupiedRanges = [...midiOccupiedRanges, ...audioOccupiedRanges];

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

  // Open audio generator modal for new clip
  const handleOpenAudioGenerator = (trackId: string, startBar: number) => {
    setAudioGenTrackId(trackId);
    setAudioGenClipId(null); // null means adding new
    setAudioGenStartBar(startBar);
    setAudioGenModalOpen(true);
  };

  // Open audio generator modal for replacing existing clip
  const handleReplaceAudioClip = (
    trackId: string,
    clipId: string,
    startBar: number
  ) => {
    setAudioGenTrackId(trackId);
    setAudioGenClipId(clipId); // clipId means replacing
    setAudioGenStartBar(startBar);
    setAudioGenModalOpen(true);
  };

  // Handle generated audio clip (add or replace)
  const handleAudioClipGenerated = (audioUrl: string, clipName: string) => {
    if (!audioGenTrackId) return;

    if (audioGenClipId) {
      // Replace existing clip

      // Remove old player and initialized state BEFORE updating tracks
      removeAudioLoopPlayer(audioGenTrackId, audioGenClipId);
      const clipKey = `${audioGenTrackId}:${audioGenClipId}`;
      setInitializedClips((prev) => {
        const newSet = new Set(prev);
        newSet.delete(clipKey);
        return newSet;
      });

      // Update tracks with new audio
      setTracks((prev) =>
        prev.map((track) => {
          if (track.id !== audioGenTrackId) return track;

          const updatedClips = (track.audioClips || []).map((clip) => {
            if (clip.id === audioGenClipId) {
              // Return updated clip with new audio
              return {
                ...clip,
                audioUrl,
                name: clipName,
              };
            }
            return clip;
          });

          return { ...track, audioClips: updatedClips };
        })
      );
    } else {
      // Add new clip
      const newClip = createAudioClip(audioUrl, audioGenStartBar, clipName);

      setTracks((prev) =>
        prev.map((track) => {
          if (track.id !== audioGenTrackId) return track;

          const existingClips = track.audioClips || [];
          const updatedClips = [...existingClips, newClip];

          return { ...track, audioClips: updatedClips };
        })
      );
    }

    // Close modal
    setAudioGenModalOpen(false);
  };

  // Close audio generator modal
  const handleCloseAudioGenerator = () => {
    setAudioGenModalOpen(false);
    setAudioGenTrackId(null);
    setAudioGenClipId(null);
    setAudioGenStartBar(0);
  };

  // Open trim modal for existing audio clip
  const handleOpenTrimModal = (trackId: string, clipId: string) => {
    setTrimTrackId(trackId);
    setTrimClipId(clipId);
    setAudioTrimModalOpen(true);
  };

  // Handle trim complete
  const handleTrimComplete = (trimmedAudioUrl: string) => {
    if (!trimTrackId || !trimClipId) return;

    // Remove old player
    removeAudioLoopPlayer(trimTrackId, trimClipId);

    // Remove from initialized set
    const clipKey = `${trimTrackId}:${trimClipId}`;
    setInitializedClips((prev) => {
      const newSet = new Set(prev);
      newSet.delete(clipKey);
      return newSet;
    });

    // Update clip with new trimmed audio
    setTracks((prev) =>
      prev.map((track) => {
        if (track.id !== trimTrackId) return track;

        const updatedClips = (track.audioClips || []).map((clip) => {
          if (clip.id === trimClipId) {
            return {
              ...clip,
              audioUrl: trimmedAudioUrl,
            };
          }
          return clip;
        });

        return { ...track, audioClips: updatedClips };
      })
    );

    // Close modal
    setAudioTrimModalOpen(false);
  };

  // Close trim modal
  const handleCloseTrimModal = () => {
    setAudioTrimModalOpen(false);
    setTrimTrackId(null);
    setTrimClipId(null);
  };

  // Get the clip being edited
  const editingTrack = tracks.find((t) => t.id === editingTrackId);
  const editingClip = editingTrack?.midiClips?.find(
    (c) => c.id === editingClipId
  );

  const [isResizingTracks, setIsResizingTracks] = useState(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(96);

  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

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

  // Handle playhead dragging
  useEffect(() => {
    if (!isDraggingPlayhead) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;
      
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const progress = Math.max(0, Math.min(1, x / rect.width));
      
      setTransportPosition(progress);
      setPlayheadProgress(progress);
    };

    const handleMouseUp = () => {
      setIsDraggingPlayhead(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPlayhead]);

  const handlePlayheadMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingPlayhead(true);
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || isDraggingPlayhead) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, x / rect.width));
    
    setTransportPosition(progress);
    setPlayheadProgress(progress);
  };

  return (
    <div className='h-full w-full relative' ref={timelineRef} onClick={handleTimelineClick}>
      {/* Time ruler at the top */}
      <div className='h-12 border-b border-slate-800 bg-slate-950/80 sticky top-0 z-10 flex text-[10px] text-slate-400' onClick={(e) => e.stopPropagation()}>
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
              {track.type === 'audio' ? (
                <>
                  {/* Render empty slot buttons for audio tracks */}
                  {getEmptySlots(track.id).map((startBar) => {
                    const slotLeftPercent = (startBar / measureCount) * 100;
                    const slotWidthPercent = (4 / measureCount) * 100;
                    const hasExistingClips =
                      (track.audioClips?.length ?? 0) > 0;

                    return (
                      <div
                        key={`empty-audio-${startBar}`}
                        className='absolute h-12 rounded border-2 border-dashed border-slate-700/50 bg-slate-800/20 hover:bg-slate-800/40 hover:border-emerald-600/70 transition-all group'
                        style={{
                          left: `${slotLeftPercent}%`,
                          width: `${slotWidthPercent}%`,
                        }}
                      >
                        <div className='h-full flex items-center justify-center gap-2'>
                          {/* Generate button */}
                          <button
                            onClick={() =>
                              handleOpenAudioGenerator(track.id, startBar)
                            }
                            className='flex flex-col items-center text-slate-600 hover:text-emerald-400 transition-colors px-2'
                            title='Generate new audio with AI'
                          >
                            <svg
                              className='w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity'
                              fill='none'
                              stroke='currentColor'
                              viewBox='0 0 24 24'
                            >
                              <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M13 10V3L4 14h7v7l9-11h-7z'
                              />
                            </svg>
                            <span className='text-[9px] mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity'>
                              Generate
                            </span>
                          </button>

                          {/* Copy button - only show if there are existing clips */}
                          {hasExistingClips && (
                            <>
                              <div className='w-px h-6 bg-slate-700/50' />
                              <div className='relative'>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Toggle dropdown - we'll handle this with a popover
                                    const dropdown = e.currentTarget
                                      .nextElementSibling as HTMLElement;
                                    if (dropdown) {
                                      dropdown.classList.toggle('hidden');
                                    }
                                  }}
                                  className='flex flex-col items-center text-slate-600 hover:text-blue-400 transition-colors px-2'
                                  title='Copy existing clip to this slot'
                                >
                                  <svg
                                    className='w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity'
                                    fill='none'
                                    stroke='currentColor'
                                    viewBox='0 0 24 24'
                                  >
                                    <path
                                      strokeLinecap='round'
                                      strokeLinejoin='round'
                                      strokeWidth={2}
                                      d='M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z'
                                    />
                                  </svg>
                                  <span className='text-[9px] mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity'>
                                    Copy
                                  </span>
                                </button>

                                {/* Dropdown menu for selecting which clip to copy */}
                                <div className='hidden absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 min-w-[200px]'>
                                  <div className='p-2'>
                                    <div className='text-[10px] text-slate-400 px-2 py-1 font-medium'>
                                      Select clip to copy:
                                    </div>
                                    {track.audioClips?.map((clip) => (
                                      <button
                                        key={clip.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCopyAudioClip(
                                            track.id,
                                            clip.id,
                                            startBar
                                          );
                                          // Hide dropdown
                                          const dropdown =
                                            e.currentTarget.closest(
                                              '.absolute'
                                            ) as HTMLElement;
                                          if (dropdown) {
                                            dropdown.classList.add('hidden');
                                          }
                                        }}
                                        className='w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 rounded transition-colors'
                                      >
                                        <div className='font-medium'>
                                          {clip.name || 'Audio Clip'}
                                        </div>
                                        <div className='text-[10px] text-slate-500'>
                                          Bar {clip.startBar + 1}-
                                          {clip.startBar + clip.bars}
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Render all audio clips */}
                  {track.audioClips?.map((clip) => (
                    <AudioClip
                      key={clip.id}
                      trackId={track.id}
                      clipData={clip}
                      totalBars={measureCount}
                      onMove={(newStartBar) =>
                        handleMoveAudioClip(track.id, clip.id, newStartBar)
                      }
                      onDelete={() => handleDeleteAudioClip(track.id, clip.id)}
                      onRegenerate={() =>
                        handleReplaceAudioClip(track.id, clip.id, clip.startBar)
                      }
                      onDuplicate={() =>
                        handleDuplicateAudioClip(track.id, clip.id)
                      }
                      onTrim={() => handleOpenTrimModal(track.id, clip.id)}
                    />
                  ))}
                </>
              ) : track.type === 'midi' ? (
                <>
                  {/* Render empty slot buttons for MIDI tracks */}
                  {getEmptySlots(track.id).map((startBar) => {
                    const slotLeftPercent = (startBar / measureCount) * 100;
                    const slotWidthPercent = (4 / measureCount) * 100;
                    const hasExistingClips =
                      (track.midiClips?.length ?? 0) > 0;

                    return (
                      <div
                        key={`empty-midi-${startBar}`}
                        className='absolute h-12 rounded border-2 border-dashed border-slate-700/50 bg-slate-800/20 hover:bg-slate-800/40 hover:border-slate-600/70 transition-all group'
                        style={{
                          left: `${slotLeftPercent}%`,
                          width: `${slotWidthPercent}%`,
                        }}
                      >
                        <div className='h-full flex items-center justify-center gap-2'>
                          {/* Add new clip button */}
                          <button
                            onClick={() => handleAddClip(track.id, startBar)}
                            className='flex flex-col items-center text-slate-600 hover:text-slate-400 transition-colors px-2'
                            title='Add new MIDI clip'
                          >
                            <svg
                              className='w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity'
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
                            <span className='text-[10px] font-medium'>
                              New
                            </span>
                          </button>

                          {/* Copy button with dropdown - only show if clips exist */}
                          {hasExistingClips && (
                            <>
                              <div className='w-px h-8 bg-slate-700/50' />
                              <div className='relative group/copy'>
                                <button
                                  className='flex flex-col items-center text-slate-600 hover:text-emerald-400 transition-colors px-2'
                                  title='Copy existing MIDI clip'
                                >
                                  <svg
                                    className='w-5 h-5 opacity-50 group-hover/copy:opacity-100 transition-opacity'
                                    fill='none'
                                    stroke='currentColor'
                                    viewBox='0 0 24 24'
                                  >
                                    <path
                                      strokeLinecap='round'
                                      strokeLinejoin='round'
                                      strokeWidth={2}
                                      d='M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z'
                                    />
                                  </svg>
                                  <span className='text-[10px] font-medium'>
                                    Copy
                                  </span>
                                </button>

                                {/* Dropdown for selecting which clip to copy */}
                                <div className='absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 rounded shadow-xl py-1 min-w-[140px] opacity-0 group-hover/copy:opacity-100 pointer-events-none group-hover/copy:pointer-events-auto transition-opacity z-50'>
                                  <div className='text-xs text-slate-400 px-3 py-1 font-medium'>
                                    Copy from:
                                  </div>
                                  {track.midiClips?.map((clip) => (
                                    <button
                                      key={clip.id}
                                      onClick={() =>
                                        handleCopyMidiClip(
                                          track.id,
                                          clip.id,
                                          startBar
                                        )
                                      }
                                      className='w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-emerald-500/20 hover:text-emerald-300 transition-colors'
                                    >
                                      Bar {clip.startBar + 1}-
                                      {clip.startBar + clip.bars}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
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
        className='absolute top-12 bottom-0 w-px bg-emerald-400 z-40 cursor-ew-resize group'
        style={{ left: `${playheadProgress * 100}%` }}
        onMouseDown={handlePlayheadMouseDown}
      >
        {/* Draggable handle at the top */}
        <div className='absolute -top-3 left-1/2 -translate-x-1/2 w-3 h-3 bg-emerald-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-ew-resize' />
      </div>

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
          dawState={{
            tracks: tracks.map((t) => ({
              id: t.id,
              name: t.name,
              type: t.type,
              volume: t.volume,
              muted: t.muted,
              solo: t.solo,
              instrumentMode: t.instrumentMode,
              synthPreset: t.synthPreset,
              samplerAudioUrl: t.samplerAudioUrl,
            })),
            bpm,
            metronomeEnabled,
          }}
        />
      )}

      {/* Audio Clip Generator Modal */}
      {audioGenTrackId && (
        <AudioClipGeneratorModal
          isOpen={audioGenModalOpen}
          onClose={handleCloseAudioGenerator}
          trackId={audioGenTrackId}
          clipId={audioGenClipId ?? undefined}
          startBar={audioGenStartBar}
          onClipGenerated={handleAudioClipGenerated}
        />
      )}

      {/* Audio Clip Trim Modal */}
      {trimTrackId &&
        trimClipId &&
        (() => {
          const track = tracks.find((t) => t.id === trimTrackId);
          const clip = track?.audioClips?.find((c) => c.id === trimClipId);

          if (!clip) return null;

          return (
            <AudioClipTrimModal
              isOpen={audioTrimModalOpen}
              onClose={handleCloseTrimModal}
              audioUrl={clip.audioUrl}
              clipName={clip.name || 'Audio Clip'}
              onTrimComplete={handleTrimComplete}
            />
          );
        })()}
    </div>
  );
}
