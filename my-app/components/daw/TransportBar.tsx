"use client";

import { useEffect, useState } from "react";
import {
  initAudio,
  startTransport,
  stopTransport,
  getTransportPosition,
  toggleMetronome,
  isMetronomeEnabled,
  rewindToStart,
  skipForwardBars,
  skipBackBars,
  togglePlayPause,
  isTransportPlaying,
} from "@/lib/audioEngine";

interface TransportBarProps {
  bpm: number;
  onBpmChange: (bpm: number) => void;
  metronomeEnabled: boolean;
  onMetronomeToggle: (enabled: boolean) => void;
}

export default function TransportBar({ bpm, onBpmChange, metronomeEnabled, onMetronomeToggle }: TransportBarProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState("0.0");

  // Sync isPlaying state with actual transport state (for keyboard shortcuts)
  useEffect(() => {
    let frameId: number;

    const syncState = () => {
      const playing = isTransportPlaying();
      setIsPlaying(playing);
      frameId = requestAnimationFrame(syncState);
    };

    syncState();

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, []);

  // Update position while playing - throttled to reduce flickering
  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    let lastUpdate = 0;
    let frameId: number;

    const update = (timestamp: number) => {
      // Only update every 100ms to reduce flickering
      if (timestamp - lastUpdate >= 100) {
        const pos = getTransportPosition();
        // Keep only bars and beats (first two parts)
        const parts = pos.split(":");
        const formatted = parts.slice(0, 2).join(":");
        setPosition(formatted);
        lastUpdate = timestamp;
      }
      frameId = requestAnimationFrame(update);
    };

    frameId = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [isPlaying]);

  const handlePlay = async () => {
    await initAudio();
    startTransport();
    setIsPlaying(true);
  };

  const handleStop = () => {
    stopTransport();
    setIsPlaying(false);
  };

  const handlePlayPause = async () => {
    await initAudio();
    const playing = togglePlayPause();
    setIsPlaying(playing);
  };

  const handleRewind = async () => {
    await initAudio();
    rewindToStart();
  };

  const handleSkipBack = async () => {
    await initAudio();
    skipBackBars(4);
  };

  const handleSkipForward = async () => {
    await initAudio();
    skipForwardBars(4);
  };

  const handleToggleMetronome = async () => {
    await initAudio();
    const enabled = toggleMetronome();
    onMetronomeToggle(enabled);
  };

  return (
    <div className="flex items-center gap-4 w-full">
      {/* Left side: logo or title */}
      <div className="font-semibold tracking-wide text-sm uppercase text-slate-300">
        My Web DAW
      </div>

      {/* Transport buttons */}
      <div className="flex items-center gap-1">
        {/* Rewind to start */}
        <button
          className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
          onClick={handleRewind}
          title="Rewind to start (Home)"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z" />
          </svg>
        </button>

        {/* Skip back 4 bars */}
        <button
          className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
          onClick={handleSkipBack}
          title="Skip back 4 bars (←)"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.5 12l8.5 6V6l-8.5 6zm-6 0l8.5 6V6l-8.5 6z" />
          </svg>
        </button>

        {/* Play/Pause */}
        <button
          className="px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-medium transition-colors"
          onClick={handlePlayPause}
          title="Play/Pause (Space)"
        >
          {isPlaying ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Stop */}
        <button
          className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
          onClick={handleStop}
          title="Stop"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 6h12v12H6z" />
          </svg>
        </button>

        {/* Skip forward 4 bars */}
        <button
          className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
          onClick={handleSkipForward}
          title="Skip forward 4 bars (→)"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
          </svg>
        </button>
      </div>

      {/* Time display */}
      <div className="ml-4 flex items-center gap-2 text-xs">
        <span className="text-slate-400">Position</span>
        <span className="px-2 py-1 rounded bg-slate-800 font-mono text-slate-100 inline-block w-[90px] text-center tabular-nums">
          {position}
        </span>
      </div>

      {/* BPM input with increment/decrement buttons */}
      <div className="ml-4 flex items-center gap-2 text-xs">
        <span className="text-slate-400">BPM</span>
        <div className="flex items-center bg-slate-800 rounded border border-slate-700">
          <button
            onClick={() => onBpmChange(Math.max(20, bpm - 1))}
            className="px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors border-r border-slate-700"
          >
            −
          </button>
          <input
            type="number"
            value={bpm}
            onChange={(e) => onBpmChange(Number(e.target.value))}
            min="20"
            max="300"
            className="w-16 px-2 py-1 bg-transparent text-slate-100 text-xs tabular-nums text-center focus:outline-none"
          />
          <button
            onClick={() => onBpmChange(Math.min(300, bpm + 1))}
            className="px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors border-l border-slate-700"
          >
            +
          </button>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side quick buttons */}
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <button
          className={`px-2 py-1 rounded border transition-colors ${
            metronomeEnabled
              ? "border-green-500 bg-green-500 bg-opacity-20 text-green-300"
              : "border-slate-700 hover:bg-slate-800"
          }`}
          onClick={handleToggleMetronome}
        >
          🔔 Metronome
        </button>
      </div>
    </div>
  );
}
