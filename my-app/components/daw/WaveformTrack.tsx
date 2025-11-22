"use client";

import { useEffect, useRef, useState } from "react";
import * as Tone from "tone";

type WaveformTrackProps = {
  fileUrl: string;
  label?: string;
};

export default function WaveformTrack({ fileUrl, label }: WaveformTrackProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Create wavesurfer, load file
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
        barGap: 1,
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

  // Hook wavesurfer to Tone transport, so global Play and Stop control this clip
  useEffect(() => {
    if (!isReady || !wavesurferRef.current) return;

    const transport = Tone.getTransport();
    let frameId: number;
    let lastState = transport.state;

    const loop = () => {
      const state = transport.state;

      if (state !== lastState) {
        if (state === "started") {
          // When the global transport starts, restart this clip from the beginning
          wavesurferRef.current.stop();
          wavesurferRef.current.seekTo(0);
          wavesurferRef.current.play();
          setIsPlaying(true);
        } else {
          // On stop or pause, stop this clip
          wavesurferRef.current.stop();
          setIsPlaying(false);
        }

        lastState = state;
      }

      frameId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [isReady]);

  // Local preview controls for this track only
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
