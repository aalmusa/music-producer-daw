"use client";

import { useEffect, useRef, useState } from "react";
import { LOOP_BARS, getLoopProgress } from "@/lib/audioEngine";
import WaveformTrack from "./WaveformTrack";

export default function Timeline() {
  const tracks = ["Drums", "Bass", "Keys"];
  const measureCount = LOOP_BARS;

  const [playheadProgress, setPlayheadProgress] = useState(0);
  const [trackHeight, setTrackHeight] = useState(96);

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
        Math.max(64, startHeightRef.current + delta),
      );
      setTrackHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizingTracks(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingTracks]);

  const startResizeTracks = (e: React.MouseEvent<HTMLDivElement>) => {
    startYRef.current = e.clientY;
    startHeightRef.current = trackHeight;
    setIsResizingTracks(true);
  };

  return (
    <div className="h-full w-full relative">
      {/* Time ruler at the top */}
      <div className="h-12 border-b border-slate-800 bg-slate-950/80 sticky top-0 z-10 flex text-[10px] text-slate-400">
        {Array.from({ length: measureCount }).map((_, i) => (
          <div
            key={i}
            className="flex-1 border-r border-slate-800 flex items-center justify-center"
          >
            {i + 1}
          </div>
        ))}
      </div>

      {/* Track lanes */}
      <div>
        {tracks.map((trackName) => (
          <div
            key={trackName}
            className="relative border-b border-slate-800"
            style={{ height: trackHeight }}
          >
            {/* Vertical grid for measures */}
            <div className="absolute inset-0 flex">
              {Array.from({ length: measureCount }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 border-r border-slate-900 ${
                    i % 4 === 0 ? "bg-slate-900" : "bg-slate-900/80"
                  }`}
                />
              ))}
            </div>

            {/* Content: Drums uses waveform, others placeholder clips */}
            <div className="relative h-full flex items-center px-2">
              {trackName === "Drums" ? (
                <WaveformTrack fileUrl="/audio/demo-loop.wav" label="Drums" />
              ) : (
                <div className="h-8 w-40 rounded bg-slate-600/80 border border-slate-400/40 text-[10px] flex items-center justify-center text-slate-100">
                  {trackName} clip
                </div>
              )}
            </div>

            {/* Resize handle at the bottom edge of the track row */}
            <div
              className="absolute bottom-0 left-0 right-0 h-1 cursor-row-resize bg-transparent hover:bg-emerald-500/60"
              onMouseDown={startResizeTracks}
            />
          </div>
        ))}
      </div>

      {/* Playhead line */}
      <div
        className="pointer-events-none absolute top-12 bottom-0 w-px bg-emerald-400"
        style={{ left: `${playheadProgress * 100}%` }}
      />
    </div>
  );
}
