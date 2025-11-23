'use client';

import { removeAllAudioLoopPlayers, removeMidiTrack, setAudioLoopMute, setTrackMute,updateMidiParts } from '@/lib/audioEngine';
import { AudioFile } from '@/lib/audioLibrary';
import {
  Track,
  createAudioClip,
  createDemoMidiClip,
  createEmptyMidiClip,
  MidiNote,
  MidiClipData,
} from '@/lib/midiTypes';
import { useCallback, useEffect, useState } from 'react';
import AudioFilePicker from './AudioFilePicker';
import Mixer from './Mixer';
import RightSidebar from './RightSideBar';
import Timeline from './Timeline';
import TrackList from './TrackList';
import TransportBar from './TransportBar';
import TrackTypeDialog from './TrackTypeDialog';

// Helper to create notes with proper structure
function note(pitch: number, start: number, duration: number, velocity: number): MidiNote {
  return {
    id: crypto.randomUUID(),
    pitch,
    start,
    duration,
    velocity,
  };
}

// Helper to create MIDI clips
function clip(id: string, startBar: number, durationBars: number, notes: MidiNote[]): MidiClipData {
  return {
    id,
    startBar,
    bars: durationBars,
    notes,
  };
}

export default function DawShell() {
  // Right sidebar width in pixels, resizable by user
  const [rightWidth, setRightWidth] = useState(320);
  const [isResizingRight, setIsResizingRight] = useState(false);

  // Track type selection dialog state
  const [isTrackDialogOpen, setIsTrackDialogOpen] = useState(false);

  // Audio file picker state
  const [isAudioPickerOpen, setIsAudioPickerOpen] = useState(false);

  // Track height state - shared between TrackList and Timeline
  const [trackHeight, setTrackHeight] = useState(96);

  // Track data - Start with empty tracks
  const [tracks, setTracks] = useState<Track[]>([]);
  // Track data with MIDI support
  const [tracks, setTracks] = useState<Track[]>([
    {
      id: '1',
      name: 'Drums',
      color: 'bg-emerald-500',
      type: 'audio',
      muted: false,
      solo: false,
      volume: 1,
      audioClips: [
        createAudioClip('/audio/demo-loop.wav', 0, 'Demo Loop'),
        createAudioClip('/audio/demo-loop.wav', 8, 'Demo Loop'),
      ],
    },
    {
      id: '2',
      name: 'Bass',
      color: 'bg-blue-500',
      type: 'midi',
      muted: false,
      solo: false,
      volume: 1,
      midiClips: [createDemoMidiClip(0), createEmptyMidiClip(4, 4)],
    },
    {
      id: '3',
      name: 'Keys',
      color: 'bg-purple-500',
      type: 'midi',
      muted: false,
      solo: false,
      volume: 1,
      midiClips: [createEmptyMidiClip(4, 0)],
    },
  ]);

  // Initialize MIDI parts on mount
  useEffect(() => {
    tracks.forEach((track) => {
      if (track.type === 'midi' && track.midiClips && track.instrumentMode !== null) {
        // Only initialize if the track has a mode selected
        const samplerUrl = track.instrumentMode === 'sampler' ? track.samplerAudioUrl : undefined;
        const synthPreset = track.instrumentMode === 'synth' ? track.synthPreset : undefined;
        updateMidiParts(track.id, track.midiClips, samplerUrl, synthPreset);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleMute = useCallback((trackId: string) => {
    setTracks((prev) =>
      prev.map((track) => {
        if (track.id === trackId) {
          const newMuted = !track.muted;
          if (track.type === 'midi') {
            setTrackMute(trackId, newMuted);
          } else if (track.type === 'audio') {
            setAudioLoopMute(trackId, newMuted);
          }
          return { ...track, muted: newMuted };
        }
        return track;
      })
    );
  }, []);

  const handleToggleSolo = useCallback((trackId: string) => {
    setTracks((prev) =>
      prev.map((track) =>
        track.id === trackId ? { ...track, solo: !track.solo } : track
      )
    );
  }, []);

  // Color palette for tracks
  const trackColors = [
    'bg-emerald-500',
    'bg-blue-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-yellow-500',
    'bg-red-500',
    'bg-cyan-500',
    'bg-indigo-500',
  ];

  /**
   * Creates a new track with the specified type.
   * This function can be called by users via dialog or by AI agents programmatically.
   */
  const createTrackOfType = useCallback(
    (trackType: 'midi' | 'audio') => {
      const trackNumber = tracks.length + 1;
      const colorIndex = tracks.length % trackColors.length;

      const newTrack: Track = {
        id: crypto.randomUUID(),
        name: `${trackType === 'midi' ? 'MIDI' : 'Audio'} ${trackNumber}`,
        color: trackColors[colorIndex],
        type: trackType,
        muted: false,
        solo: false,
        volume: 1,
        ...(trackType === 'midi'
          ? { 
              midiClips: [createEmptyMidiClip(4, 0)],
              instrumentMode: null // Start with no mode selected
            }
          : { audioUrl: undefined }),
      };

      setTracks((prev) => [...prev, newTrack]);

      // Don't initialize MIDI parts until user selects a mode
      // if (trackType === 'midi' && newTrack.midiClips) {
      //   updateMidiParts(newTrack.id, newTrack.midiClips);
      // }

      return newTrack;
    },
    [tracks.length]
  );

  // User clicked "Add Track" button - open dialog for selection
  const handleAddTrackClick = useCallback(() => {
    setIsTrackDialogOpen(true);
  }, []);

  // User selected MIDI from dialog
  const handleSelectMidi = useCallback(() => {
    createTrackOfType('midi');
    setIsTrackDialogOpen(false);
  }, [createTrackOfType]);

  // User selected Audio from dialog - show file picker instead of creating immediately
  const handleSelectAudio = useCallback(() => {
    setIsAudioPickerOpen(true);
    // Keep track dialog open in background - will close when user confirms
  }, []);

  // User selected an audio file from the picker
  const handleAudioFileSelected = useCallback(
    (audioFile: AudioFile) => {
      const trackNumber = tracks.length + 1;
      const trackColors = [
        'bg-emerald-500',
        'bg-blue-500',
        'bg-purple-500',
        'bg-pink-500',
        'bg-yellow-500',
        'bg-red-500',
        'bg-cyan-500',
        'bg-indigo-500',
      ];
      const colorIndex = tracks.length % trackColors.length;

      // Create a new audio track with a single clip at bar 0
      const newTrack: Track = {
        id: crypto.randomUUID(),
        name: audioFile.name,
        color: trackColors[colorIndex],
        type: 'audio',
        muted: false,
        solo: false,
        volume: 1,
        audioClips: [createAudioClip(audioFile.path, 0, audioFile.name)],
      };

      setTracks((prev) => [...prev, newTrack]);

      // Close both dialogs
      setIsAudioPickerOpen(false);
      setIsTrackDialogOpen(false);
    },
    [tracks.length]
  );

  // Attach a sample to a MIDI track
  const handleAttachSampleToMidiTrack = useCallback(
    (trackId: string, audioPath: string | null) => {
      setTracks((prev) =>
        prev.map((track) => {
          if (track.id === trackId && track.type === 'midi') {
            // Update the track with the new sampler URL (convert null to undefined)
            const updatedTrack: Track = {
              ...track,
              samplerAudioUrl: audioPath ?? undefined,
            };

            // Update the MIDI part to use the sampler
            if (track.midiClips) {
              const synthPreset = track.instrumentMode === 'synth' ? track.synthPreset : undefined;
              updateMidiParts(
                trackId,
                track.midiClips,
                audioPath ?? undefined,
                synthPreset
              );
            }

            return updatedTrack;
          }
          return track;
        })
      );
    },
    []
  );

  const handleDeleteTrack = useCallback((trackId: string) => {
    setTracks((prev) => {
      const track = prev.find((t) => t.id === trackId);
      
      // Clean up audio engine resources
      if (track?.type === 'midi') {
        removeMidiTrack(trackId);
      } else if (track?.type === 'audio') {
        removeAllAudioLoopPlayers(trackId);
      }
      
      return prev.filter((t) => t.id !== trackId);
    });
  }, []);

  const handleRenameTrack = useCallback((trackId: string, newName: string) => {
    setTracks((prev) =>
      prev.map((track) =>
        track.id === trackId ? { ...track, name: newName } : track
      )
    );
  }, []);

  const handleSetInstrumentMode = useCallback(
    (trackId: string, mode: 'synth' | 'sampler') => {
      setTracks((prev) =>
        prev.map((track) => {
          if (track.id === trackId && track.type === 'midi') {
            const updatedTrack: Track = {
              ...track,
              instrumentMode: mode,
              synthPreset: mode === 'synth' ? 'piano' : undefined, // Default to piano preset
            };

            // Initialize the audio engine with the selected mode
            if (track.midiClips) {
              if (mode === 'synth') {
                // Initialize synth mode with default piano preset
                updateMidiParts(trackId, track.midiClips, undefined, 'piano');
              }
              // For sampler mode, we'll wait for the user to select a sample
            }

            return updatedTrack;
          }
          return track;
        })
      );
    },
    []
  );

  const handleSetSynthPreset = useCallback(
    (trackId: string, presetName: string) => {
      setTracks((prev) =>
        prev.map((track) => {
          if (track.id === trackId && track.type === 'midi' && track.instrumentMode === 'synth') {
            const updatedTrack: Track = {
              ...track,
              synthPreset: presetName,
            };

            // Re-initialize the audio engine with new preset
            if (track.midiClips) {
              updateMidiParts(trackId, track.midiClips, undefined, presetName);
            }

            return updatedTrack;
          }
          return track;
        })
      );
    },
    []
  );

  const handleRightMouseDown = useCallback(() => {
    setIsResizingRight(true);
  }, []);

  useEffect(() => {
    if (!isResizingRight) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Prevent crazy values, clamp between 240 and 480
      const newWidth = Math.min(
        480,
        Math.max(240, window.innerWidth - e.clientX)
      );
      setRightWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizingRight(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingRight]);

  return (
    <main className='min-h-screen flex flex-col bg-slate-900 text-slate-100'>
      {/* Top transport bar */}
      <header className='h-16 border-b border-slate-800 flex items-center px-4'>
        <TransportBar />
      </header>

      {/* Middle content: tracks + timeline + right sidebar */}
      <section className='flex flex-1 overflow-hidden'>
        {/* Left: track list and timeline */}
        <div className='flex flex-1 overflow-hidden'>
          {/* Track list column */}
          <aside className='w-60 border-right border-slate-800 bg-slate-950 border-r'>
            <TrackList
              tracks={tracks}
              trackHeight={trackHeight}
              onToggleMute={handleToggleMute}
              onToggleSolo={handleToggleSolo}
              onAddTrack={handleAddTrackClick}
              onDeleteTrack={handleDeleteTrack}
              onAttachSample={handleAttachSampleToMidiTrack}
              onRenameTrack={handleRenameTrack}
              onSetInstrumentMode={handleSetInstrumentMode}
              onSetSynthPreset={handleSetSynthPreset}
            />
          </aside>

          {/* Timeline area */}
          <div className='flex-1 overflow-auto relative bg-slate-900'>
            <Timeline 
              tracks={tracks} 
              setTracks={setTracks} 
              trackHeight={trackHeight}
              setTrackHeight={setTrackHeight}
            />
          </div>
        </div>

        {/* Drag handle between middle and right */}
        <div
          onMouseDown={handleRightMouseDown}
          className='w-1 cursor-col-resize bg-slate-800 hover:bg-emerald-500 transition-colors'
        />

        {/* Right sidebar with dynamic width */}
        <aside
          className='border-l border-slate-800 bg-slate-950'
          style={{ width: rightWidth }}
        >
          <RightSidebar />
        </aside>
      </section>

      {/* Bottom mixer - made a bit taller */}
      <footer className='h-52 border-t border-slate-800 bg-slate-950'>
        <Mixer tracks={tracks} />
      </footer>

      {/* Track type selection dialog */}
      <TrackTypeDialog
        isOpen={isTrackDialogOpen}
        onSelectMidi={handleSelectMidi}
        onSelectAudio={handleSelectAudio}
        onClose={() => setIsTrackDialogOpen(false)}
      />

      {/* Audio file picker dialog */}
      <AudioFilePicker
        isOpen={isAudioPickerOpen}
        onSelectFile={handleAudioFileSelected}
        onClose={() => setIsAudioPickerOpen(false)}
      />
    </main>
  );
}
