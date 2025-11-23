'use client';

import {
  removeAllAudioLoopPlayers,
  removeMidiTrack,
  setBpm as setAudioEngineBpm,
  setAudioLoopMute,
  setAudioLoopVolume,
  setTrackMute,
  setTrackVolume,
  updateMidiParts,
} from '@/lib/audioEngine';
import { AudioFile } from '@/lib/audioLibrary';
import {
  Track,
  createAudioClip,
  createDemoMidiClip,
  createEmptyMidiClip,
} from '@/lib/midiTypes';
import { DAWAssistantResponse } from '@/types/music-production';
import { useCallback, useEffect, useState } from 'react';
import AIAssistant from './AIAssistant';
import AudioFilePicker from './AudioFilePicker';
import Mixer from './Mixer';
import Timeline from './Timeline';
import TrackList from './TrackList';
import TrackTypeDialog from './TrackTypeDialog';
import TransportBar from './TransportBar';

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

export default function DawShell() {
  // Right sidebar width in pixels, resizable by user
  const [rightWidth, setRightWidth] = useState(320);
  const [isResizingRight, setIsResizingRight] = useState(false);

  // Track type selection dialog state
  const [isTrackDialogOpen, setIsTrackDialogOpen] = useState(false);

  // Audio file picker state
  const [isAudioPickerOpen, setIsAudioPickerOpen] = useState(false);

  // BPM state
  const [bpm, setBpm] = useState(120);

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
      if (track.type === 'midi' && track.midiClips) {
        updateMidiParts(track.id, track.midiClips);
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
        name: `${trackType === 'midi' ? 'Synth' : 'Audio'} ${trackNumber}`,
        color: trackColors[colorIndex],
        type: trackType,
        muted: false,
        solo: false,
        volume: 1,
        ...(trackType === 'midi'
          ? { midiClip: createEmptyMidiClip() }
          : { audioUrl: undefined }),
      };

      setTracks((prev) => [...prev, newTrack]);

      // Initialize MIDI part if it's a MIDI track
      if (trackType === 'midi' && newTrack.midiClips) {
        updateMidiParts(newTrack.id, newTrack.midiClips);
      }

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
              updateMidiParts(trackId, track.midiClips, audioPath ?? undefined);
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

  const handleVolumeChange = useCallback((trackId: string, volume: number) => {
    setTracks((prev) =>
      prev.map((track) => {
        if (track.id === trackId) {
          // Update audio engine volume
          if (track.type === 'midi') {
            setTrackVolume(trackId, volume);
          } else if (track.type === 'audio') {
            setAudioLoopVolume(trackId, volume);
          }
          return { ...track, volume };
        }
        return track;
      })
    );
  }, []);

  const handleBpmChange = useCallback((newBpm: number) => {
    setBpm(newBpm);
    setAudioEngineBpm(newBpm);
  }, []);

  // Handle AI assistant actions
  const handleAIAssistantActions = useCallback(
    (response: DAWAssistantResponse) => {
      if (!response.success || response.actions.length === 0) return;

      response.actions.forEach((action) => {
        switch (action.type) {
          case 'create_track':
            if (action.trackType) {
              const trackNumber = tracks.length + 1;
              const colorIndex = tracks.length % trackColors.length;
              const trackName =
                action.trackName ||
                `${
                  action.trackType === 'midi' ? 'Synth' : 'Audio'
                } ${trackNumber}`;

              const newTrack: Track = {
                id: crypto.randomUUID(),
                name: trackName,
                color: trackColors[colorIndex],
                type: action.trackType,
                muted: false,
                solo: false,
                volume: 1,
                ...(action.trackType === 'midi'
                  ? { midiClips: [createEmptyMidiClip()] }
                  : { audioClips: [] }),
              };

              setTracks((prev) => [...prev, newTrack]);

              // Initialize MIDI part if it's a MIDI track
              if (action.trackType === 'midi' && newTrack.midiClips) {
                updateMidiParts(newTrack.id, newTrack.midiClips);
              }

              console.log(`✓ Created ${action.trackType} track: ${trackName}`);
            }
            break;

          case 'delete_track':
            const trackToDelete = tracks.find(
              (t) => t.id === action.trackId || t.name === action.trackName
            );
            if (trackToDelete) {
              handleDeleteTrack(trackToDelete.id);
              console.log(`✓ Deleted track: ${trackToDelete.name}`);
            }
            break;

          case 'adjust_volume':
            const trackToAdjust = tracks.find(
              (t) => t.id === action.trackId || t.name === action.trackName
            );
            if (trackToAdjust && action.volume !== undefined) {
              handleVolumeChange(trackToAdjust.id, action.volume);
              console.log(
                `✓ Adjusted volume for ${trackToAdjust.name}: ${action.volume}`
              );
            }
            break;

          case 'adjust_bpm':
            if (action.bpm) {
              handleBpmChange(action.bpm);
              console.log(`✓ Set BPM to ${action.bpm}`);
            }
            break;

          case 'select_instrument':
            const trackForInstrument = tracks.find(
              (t) => t.id === action.trackId || t.name === action.trackName
            );
            if (trackForInstrument && action.instrumentPath) {
              handleAttachSampleToMidiTrack(
                trackForInstrument.id,
                action.instrumentPath
              );
              console.log(
                `✓ Set instrument for ${trackForInstrument.name}: ${action.instrumentPath}`
              );
            }
            break;

          case 'none':
            // No action needed, just conversation
            break;

          default:
            console.warn('Unknown action type:', action.type);
        }
      });
    },
    [
      tracks,
      handleDeleteTrack,
      handleVolumeChange,
      handleBpmChange,
      handleAttachSampleToMidiTrack,
    ]
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
    <main className='h-screen flex flex-col bg-slate-900 text-slate-100 overflow-hidden'>
      {/* Top transport bar */}
      <header className='h-16 border-b border-slate-800 flex items-center px-4 shrink-0'>
        <TransportBar bpm={bpm} onBpmChange={handleBpmChange} />
      </header>

      {/* Middle content: tracks + timeline + right sidebar */}
      <section className='flex flex-1 overflow-hidden min-h-0'>
        {/* Left: track list and timeline */}
        <div className='flex flex-1 overflow-hidden'>
          {/* Track list column */}
          <aside className='w-60 border-right border-slate-800 bg-slate-950 border-r'>
            <TrackList
              tracks={tracks}
              onToggleMute={handleToggleMute}
              onToggleSolo={handleToggleSolo}
              onAddTrack={handleAddTrackClick}
              onDeleteTrack={handleDeleteTrack}
              onAttachSample={handleAttachSampleToMidiTrack}
            />
          </aside>

          {/* Timeline area */}
          <div className='flex-1 overflow-auto relative bg-slate-900'>
            <Timeline tracks={tracks} setTracks={setTracks} />
          </div>
        </div>

        {/* Drag handle between middle and right */}
        <div
          onMouseDown={handleRightMouseDown}
          className='w-1 cursor-col-resize bg-slate-800 hover:bg-emerald-500 transition-colors'
        />

        {/* Right sidebar with dynamic width - AI Assistant */}
        <aside
          className='border-l border-slate-800 bg-slate-950'
          style={{ width: rightWidth }}
        >
          <AIAssistant
            dawState={{
              tracks: tracks.map((t) => ({
                id: t.id,
                name: t.name,
                type: t.type,
                volume: t.volume,
                muted: t.muted,
                solo: t.solo,
                samplerAudioUrl: t.samplerAudioUrl ?? undefined,
              })),
              bpm,
            }}
            onActionsReceived={handleAIAssistantActions}
          />
        </aside>
      </section>

      {/* Bottom mixer - made a bit taller */}
      <footer className='h-52 border-t border-slate-800 bg-slate-950 shrink-0'>
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
