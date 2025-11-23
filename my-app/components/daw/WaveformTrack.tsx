"use client";

import { createAudioLoopPlayer, removeAudioLoopPlayer } from "@/lib/audioEngine";
import { useEffect, useRef, useState } from "react";
import * as Tone from "tone";

type WaveformTrackProps = {
  trackId: string;
  fileUrl: string;
  label?: string;
};

export default function WaveformTrack({ trackId, fileUrl, label }: WaveformTrackProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);

  // Create wavesurfer for visualization only (not for playback)
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
        interact: false, // Disable interaction since playback is handled by Tone.js
      });

      wavesurferRef.current = ws;

      ws.on("ready", () => {
        if (!isCancelled) {
          setIsReady(true);
        }
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

  // Create Tone.js audio loop player (4 bars, quantized to BPM)
  useEffect(() => {
    if (!isReady) return;

    let isCancelled = false;

    async function setupAudioLoop() {
      try {
        await createAudioLoopPlayer(trackId, fileUrl);
        console.log(`✓ Audio loop player created for track ${trackId}`);
      } catch (error) {
        console.error(`✗ Failed to create audio loop player:`, error);
      }
    }

    setupAudioLoop();

    return () => {
      isCancelled = true;
      if (!isCancelled) {
        removeAudioLoopPlayer(trackId);
      }
    };
  }, [trackId, fileUrl, isReady]);

  // Update wavesurfer progress to match transport
  useEffect(() => {
    if (!isReady || !wavesurferRef.current) return;

    const transport = Tone.getTransport();
    let frameId: number;

    const updateProgress = () => {
      if (transport.state === "started") {
        // Calculate progress within 4 bars (0 to 1)
        const fourBarsDuration = transport.toSeconds('4m');
        const currentTime = transport.seconds % fourBarsDuration;
        const progress = currentTime / fourBarsDuration;
        
        // Update wavesurfer cursor position
        wavesurferRef.current.seekTo(progress);
      }

      frameId = requestAnimationFrame(updateProgress);
    };

    updateProgress();

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [isReady]);

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex flex-col items-center justify-center w-16 text-[10px] text-slate-300">
        {label && <div className="mb-1 truncate w-full text-center">{label}</div>}
        <div className="px-2 py-1 text-center text-slate-400">
          4 bars
        </div>
      </div>

      <div className="flex-1">
        <div ref={containerRef} className="w-full" />
      </div>
    </div>
  );
}
