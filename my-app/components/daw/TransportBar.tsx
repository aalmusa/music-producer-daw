"use client";

import { useEffect, useState } from "react";
import {
  initAudio,
  startTransport,
  stopTransport,
  setBpm,
  getTransportPosition,
  toggleMetronome,
  isMetronomeEnabled,
} from "@/lib/audioEngine";

export default function TransportBar() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpmState] = useState(120);
  const [position, setPosition] = useState("0.0.0");
  const [metronomeOn, setMetronomeOn] = useState(false);

  // Update position while playing
  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    let frameId: number;

    const update = () => {
      const pos = getTransportPosition();
      // Keep only bars.beats.sixteenths
      const parts = pos.split(".");
      const formatted = parts.slice(0, 3).join(".");
      setPosition(formatted);
      frameId = requestAnimationFrame(update);
    };

    update();

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

  const handleBpmChange = (value: number) => {
    setBpmState(value);
    setBpm(value);
  };

  const handleToggleMetronome = async () => {
    await initAudio();
    const enabled = toggleMetronome();
    setMetronomeOn(enabled);
  };

  return (
    <div className="flex items-center gap-4 w-full">
      {/* Left side: logo or title */}
      <div className="font-semibold tracking-wide text-sm uppercase text-slate-300">
        My Web DAW
      </div>

      {/* Transport buttons */}
      <div className="flex items-center gap-2">
        <button
          className="px-3 py-1 rounded bg-green-500 text-slate-900 text-sm"
          onClick={isPlaying ? handleStop : handlePlay}
        >
          {isPlaying ? "Stop" : "Play"}
        </button>
      </div>

      {/* Time display */}
      <div className="ml-4 flex items-center gap-2 text-xs">
        <span className="text-slate-400">Position</span>
        <span className="px-2 py-1 rounded bg-slate-800 font-mono text-slate-100">
          {position}
        </span>
      </div>

      {/* BPM input */}
      <div className="ml-4 flex items-center gap-2 text-xs">
        <span className="text-slate-400">BPM</span>
        <input
          type="number"
          value={bpm}
          onChange={(e) => handleBpmChange(Number(e.target.value))}
          className="w-16 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-100 text-xs"
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side quick buttons, placeholders for now */}
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <button
          className={`px-2 py-1 rounded border transition-colors ${
            metronomeOn
              ? "border-green-500 bg-green-500 bg-opacity-20 text-green-300"
              : "border-slate-700 hover:bg-slate-800"
          }`}
          onClick={handleToggleMetronome}
        >
          🔔 Metronome
        </button>
        <button className="px-2 py-1 rounded border border-slate-700 hover:bg-slate-800">
          Loop
        </button>
      </div>
    </div>
  );
}
