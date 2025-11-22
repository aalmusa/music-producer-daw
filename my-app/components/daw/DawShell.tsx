'use client';

import { setTrackMute, updateMidiParts } from '@/lib/audioEngine';
import {
  Track,
  createDemoMidiClip,
  createEmptyMidiClip,
} from '@/lib/midiTypes';
import { useCallback, useEffect, useState } from 'react';
import Mixer from './Mixer';
import RightSidebar from './RightSideBar';
import Timeline from './Timeline';
import TrackList from './TrackList';
import TransportBar from './TransportBar';

export default function DawShell() {
  // Right sidebar width in pixels, resizable by user
  const [rightWidth, setRightWidth] = useState(320);
  const [isResizingRight, setIsResizingRight] = useState(false);

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
      audioUrl: '/audio/demo-loop.wav',
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
              onToggleMute={handleToggleMute}
              onToggleSolo={handleToggleSolo}
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
        <Mixer />
      </footer>
    </main>
  );
}
