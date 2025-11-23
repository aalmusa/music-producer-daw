'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface AudioClipData {
  id: string;
  audioUrl: string;
  bars: number; // Number of bars (should be 4 for loops)
  startBar: number; // Position in timeline (0-based)
  name?: string;
}

interface AudioClipProps {
  trackId: string;
  clipData: AudioClipData;
  totalBars: number; // Total bars in timeline
  onMove: (newStartBar: number) => void;
  onDelete: () => void;
}

export default function AudioClip({
  trackId,
  clipData,
  totalBars,
  onMove,
  onDelete,
}: AudioClipProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartBar, setDragStartBar] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<any>(null);
  const [isWaveformReady, setIsWaveformReady] = useState(false);

  // Calculate position and width as percentages
  const clipWidthPercent = (clipData.bars / totalBars) * 100;
  const clipLeftPercent = (clipData.startBar / totalBars) * 100;

  // Load waveform visualization
  useEffect(() => {
    let isCancelled = false;

    async function loadWaveform() {
      if (!containerRef.current) return;

      const WaveSurfer = (await import('wavesurfer.js')).default;

      if (isCancelled) return;

      const ws = WaveSurfer.create({
        container: containerRef.current,
        waveColor: '#64748b', // slate-500
        progressColor: '#22c55e', // emerald-500
        height: 32,
        barWidth: 2,
        barGap: 1,
        interact: false, // Disable interaction
        cursorWidth: 0, // Hide cursor
      });

      wavesurferRef.current = ws;

      ws.on('ready', () => {
        if (!isCancelled) {
          setIsWaveformReady(true);
        }
      });

      ws.load(clipData.audioUrl);
    }

    loadWaveform();

    return () => {
      isCancelled = true;
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
    };
  }, [clipData.audioUrl]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Don't start drag if clicking inside the waveform area
      if ((e.target as HTMLElement).closest('.waveform-container')) {
        return;
      }

      e.stopPropagation();
      setIsDragging(true);
      setDragStartX(e.clientX);
      setDragStartBar(clipData.startBar);
    },
    [clipData.startBar]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - dragStartX;
      const parentElement = document.querySelector('.timeline-container');
      const parentWidth = parentElement?.clientWidth || 1;
      const barWidth = parentWidth / totalBars;
      const deltaBar = Math.round(deltaX / barWidth / 4) * 4; // Snap to 4-bar divisions

      const newStartBar = Math.max(
        0,
        Math.min(totalBars - clipData.bars, dragStartBar + deltaBar)
      );

      if (newStartBar !== clipData.startBar) {
        onMove(newStartBar);
      }
    },
    [
      isDragging,
      dragStartX,
      dragStartBar,
      totalBars,
      clipData.bars,
      clipData.startBar,
      onMove,
    ]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (window.confirm('Delete this audio clip?')) {
        onDelete();
      }
    },
    [onDelete]
  );

  return (
    <div
      className={`absolute h-12 rounded border-2 transition-all overflow-hidden ${
        isDragging
          ? 'bg-emerald-700 border-emerald-300 shadow-lg cursor-grabbing z-20'
          : 'bg-emerald-600/90 border-emerald-400/60 hover:bg-emerald-600 hover:border-emerald-400 cursor-grab'
      }`}
      style={{
        left: `${clipLeftPercent}%`,
        width: `${clipWidthPercent}%`,
      }}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
    >
      <div className='h-full flex flex-col'>
        {/* Waveform container */}
        <div
          className='waveform-container flex-1 px-2 py-1'
          ref={containerRef}
        />
        
        {/* Clip info overlay */}
        <div className='absolute inset-0 pointer-events-none flex items-end justify-center pb-1'>
          <div className='text-[10px] text-emerald-100 font-medium bg-emerald-900/70 px-2 py-0.5 rounded'>
            {clipData.name || 'Audio'} • Bar {clipData.startBar + 1}-
            {clipData.startBar + clipData.bars}
          </div>
        </div>
      </div>
    </div>
  );
}

