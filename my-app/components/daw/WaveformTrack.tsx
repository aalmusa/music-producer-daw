"use client";

import { useEffect, useRef, useState } from "react";

type WaveformTrackProps = {
  fileUrl: string;
  label?: string;
};

export default function WaveformTrack({ fileUrl, label }: WaveformTrackProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function setup() {
      const WaveSurfer = (await import("wavesurfer.js")).default;

      if (!containerRef.current || isCancelled) return;

      const ws = WaveSurfer.create({
        container: containerRef.current,
        waveColor: "#64748b", // slate-500
        progressColor: "#22c55e", // emerald-500
        cursorColor: "#e5e7eb", // gray-200
        height: 48,
        barWidth: 2,
        barGap: 1
      });

      wavesurferRef.current = ws;

      ws.on("ready", () => {
        if (!isCancelled) {
          setIsReady(true);
        }
      });

      ws.on("finish", () => {
        setIsPlaying(false);
      });

      ws.load(fileUrl);
    }

    setup();

    return () => {
      isCancelled = true;
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
    };
  }, [fileUrl]);

  const handleTogglePlay = () => {
    if (!wavesurferRef.current || !isReady) return;
    wavesurferRef.current.playPause();
    setIsPlaying((prev) => !prev);
  };

  const handleStop = () => {
    if (!wavesurferRef.current) return;
    wavesurferRef.current.stop();
    setIsPlaying(false);
  };

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex flex-col items-center justify-center w-16 text-[10px] text-slate-300">
        {label && <div className="mb-1 truncate w-full text-center">{label}</div>}
        <button
          className="px-2 py-0.5 mb-1 rounded bg-emerald-500 text-slate-900 text-[10px]"
          onClick={handleTogglePlay}
          disabled={!isReady}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button
          className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-[10px]"
          onClick={handleStop}
          disabled={!isReady}
        >
          Stop
        </button>
      </div>

      <div className="flex-1">
        <div ref={containerRef} className="w-full" />
      </div>
    </div>
  );
}
