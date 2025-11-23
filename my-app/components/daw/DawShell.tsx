'use client';

import {
  initAudio,
  removeAllAudioLoopPlayers,
  removeMidiTrack,
  setBpm as setAudioEngineBpm,
  setAudioLoopMute,
  setAudioLoopVolume,
  setMasterVolume,
  setTrackMute,
  setTrackVolume,
  toggleMetronome,
  updateMidiParts,
} from '@/lib/audioEngine';
import { AudioFile } from '@/lib/audioLibrary';
import { createAudioClip, createEmptyMidiClip, Track } from '@/lib/midiTypes';
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

  // Master volume state (0 to 1)
  const [masterVolume, setMasterVolumeState] = useState(1);

  // Metronome state
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);

  // Track height state - shared between TrackList and Timeline
  const [trackHeight, setTrackHeight] = useState(96);

  // Track data - Start with empty tracks for AI to populate
  const [tracks, setTracks] = useState<Track[]>([]);

  // Initialize MIDI parts on mount
  useEffect(() => {
    tracks.forEach((track) => {
      if (
        track.type === 'midi' &&
        track.midiClips &&
        track.instrumentMode !== null
      ) {
        // Only initialize if the track has a mode selected
        const samplerUrl =
          track.instrumentMode === 'sampler'
            ? track.samplerAudioUrl
            : undefined;
        const synthPreset =
          track.instrumentMode === 'synth' ? track.synthPreset : undefined;
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
              instrumentMode: null, // Start with no mode selected
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
              const synthPreset =
                track.instrumentMode === 'synth'
                  ? track.synthPreset
                  : undefined;
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

  const handleMasterVolumeChange = useCallback((volume: number) => {
    setMasterVolumeState(volume);
    setMasterVolume(volume);
  }, []);

  const handleMetronomeToggle = useCallback((enabled: boolean) => {
    setMetronomeEnabled(enabled);
  }, []);

  const handleToggleMetronomeFromAI = useCallback(async () => {
    await initAudio(); // Ensure audio is initialized
    const newState = toggleMetronome();
    setMetronomeEnabled(newState);
    return newState;
  }, []);

  // Helper function to find tracks by pattern (case-insensitive partial match)
  const findTracksByPattern = useCallback(
    (pattern: string) => {
      const lowerPattern = pattern.toLowerCase();
      return tracks.filter((track) =>
        track.name.toLowerCase().includes(lowerPattern)
      );
    },
    [tracks]
  );

  // Handle AI assistant actions
  const handleAIAssistantActions = useCallback(
    async (response: DAWAssistantResponse) => {
      if (!response.success || response.actions.length === 0) return;

      for (const action of response.actions) {
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

          case 'mute_tracks': {
            // Mute tracks by pattern, ID, or name
            let tracksToMute: Track[] = [];

            if (action.trackPattern) {
              tracksToMute = findTracksByPattern(action.trackPattern);
            } else if (action.trackId) {
              const track = tracks.find((t) => t.id === action.trackId);
              if (track) tracksToMute = [track];
            } else if (action.trackName) {
              const track = tracks.find((t) => t.name === action.trackName);
              if (track) tracksToMute = [track];
            }

            tracksToMute.forEach((track) => {
              if (!track.muted) {
                handleToggleMute(track.id);
              }
            });

            if (tracksToMute.length > 0) {
              console.log(
                `✓ Muted ${tracksToMute.length} track(s): ${tracksToMute
                  .map((t) => t.name)
                  .join(', ')}`
              );
            }
            break;
          }

          case 'unmute_tracks': {
            // Unmute tracks by pattern, ID, or name
            let tracksToUnmute: Track[] = [];

            if (action.trackPattern) {
              tracksToUnmute = findTracksByPattern(action.trackPattern);
            } else if (action.trackId) {
              const track = tracks.find((t) => t.id === action.trackId);
              if (track) tracksToUnmute = [track];
            } else if (action.trackName) {
              const track = tracks.find((t) => t.name === action.trackName);
              if (track) tracksToUnmute = [track];
            }

            tracksToUnmute.forEach((track) => {
              if (track.muted) {
                handleToggleMute(track.id);
              }
            });

            if (tracksToUnmute.length > 0) {
              console.log(
                `✓ Unmuted ${tracksToUnmute.length} track(s): ${tracksToUnmute
                  .map((t) => t.name)
                  .join(', ')}`
              );
            }
            break;
          }

          case 'solo_tracks': {
            // Solo tracks by pattern, ID, or name
            let tracksToSolo: Track[] = [];

            if (action.trackPattern) {
              tracksToSolo = findTracksByPattern(action.trackPattern);
            } else if (action.trackId) {
              const track = tracks.find((t) => t.id === action.trackId);
              if (track) tracksToSolo = [track];
            } else if (action.trackName) {
              const track = tracks.find((t) => t.name === action.trackName);
              if (track) tracksToSolo = [track];
            }

            tracksToSolo.forEach((track) => {
              if (!track.solo) {
                handleToggleSolo(track.id);
              }
            });

            if (tracksToSolo.length > 0) {
              console.log(
                `✓ Soloed ${tracksToSolo.length} track(s): ${tracksToSolo
                  .map((t) => t.name)
                  .join(', ')}`
              );
            }
            break;
          }

          case 'unsolo_tracks': {
            // Unsolo tracks by pattern, ID, or name
            let tracksToUnsolo: Track[] = [];

            if (action.trackPattern) {
              tracksToUnsolo = findTracksByPattern(action.trackPattern);
            } else if (action.trackId) {
              const track = tracks.find((t) => t.id === action.trackId);
              if (track) tracksToUnsolo = [track];
            } else if (action.trackName) {
              const track = tracks.find((t) => t.name === action.trackName);
              if (track) tracksToUnsolo = [track];
            }

            tracksToUnsolo.forEach((track) => {
              if (track.solo) {
                handleToggleSolo(track.id);
              }
            });

            if (tracksToUnsolo.length > 0) {
              console.log(
                `✓ Unsoloed ${tracksToUnsolo.length} track(s): ${tracksToUnsolo
                  .map((t) => t.name)
                  .join(', ')}`
              );
            }
            break;
          }

          case 'toggle_metronome': {
            const newState = await handleToggleMetronomeFromAI();
            console.log(`✓ Metronome ${newState ? 'enabled' : 'disabled'}`);
            break;
          }

          case 'none':
            // No action needed, just conversation
            break;

          default:
            console.warn('Unknown action type:', action.type);
        }
      }
    },
    [
      tracks,
      handleDeleteTrack,
      handleVolumeChange,
      handleBpmChange,
      handleAttachSampleToMidiTrack,
      handleToggleMute,
      handleToggleSolo,
      handleToggleMetronomeFromAI,
      findTracksByPattern,
    ]
  );

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
          if (
            track.id === trackId &&
            track.type === 'midi' &&
            track.instrumentMode === 'synth'
          ) {
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
    <main className='h-screen flex flex-col bg-slate-900 text-slate-100 overflow-hidden'>
      {/* Top transport bar */}
      <header className='h-16 border-b border-slate-800 flex items-center px-4 shrink-0'>
        <TransportBar
          bpm={bpm}
          onBpmChange={handleBpmChange}
          metronomeEnabled={metronomeEnabled}
          onMetronomeToggle={handleMetronomeToggle}
        />
      </header>

      {/* Middle content: tracks + timeline + right sidebar */}
      <section className='flex flex-1 overflow-hidden min-h-0'>
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
              metronomeEnabled,
            }}
            onActionsReceived={handleAIAssistantActions}
          />
        </aside>
      </section>

      {/* Bottom mixer - made a bit taller */}
      <footer className='h-52 border-t border-slate-800 bg-slate-950 shrink-0'>
        <Mixer
          tracks={tracks}
          masterVolume={masterVolume}
          onTrackVolumeChange={handleVolumeChange}
          onMasterVolumeChange={handleMasterVolumeChange}
        />
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
