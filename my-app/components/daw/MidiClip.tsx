'use client';

import { MidiClipData } from '@/lib/midiTypes';
import { useCallback, useEffect, useState } from 'react';

interface MidiClipProps {
  clipData: MidiClipData;
  totalBars: number; // Total bars in timeline
  onOpenEditor: () => void;
  onMove: (newStartBar: number) => void;
  onDelete: () => void;
}

export default function MidiClip({
  clipData,
  totalBars,
  onOpenEditor,
  onMove,
  onDelete,
}: MidiClipProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartBar, setDragStartBar] = useState(0);

  // Calculate position and width as percentages
  const clipWidthPercent = (clipData.bars / totalBars) * 100;
  const clipLeftPercent = (clipData.startBar / totalBars) * 100;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Don't start drag if clicking the edit area
      if ((e.target as HTMLElement).closest('.clip-content')) {
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

      if (window.confirm('Delete this MIDI clip?')) {
        onDelete();
      }
    },
    [onDelete]
  );

  return (
    <div
      className={`absolute h-12 rounded border-2 transition-all ${
        isDragging
          ? 'bg-purple-700 border-purple-300 shadow-lg cursor-grabbing z-20'
          : 'bg-purple-600/90 border-purple-400/60 hover:bg-purple-600 hover:border-purple-400 cursor-grab'
      }`}
      style={{
        left: `${clipLeftPercent}%`,
        width: `${clipWidthPercent}%`,
      }}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
    >
      <div
        className='clip-content h-full flex flex-col items-center justify-center text-xs text-slate-100 px-2 cursor-pointer'
        onClick={(e) => {
          e.stopPropagation();
          onOpenEditor();
        }}
      >
        <div className='font-medium truncate w-full text-center'>MIDI Clip</div>
        <div className='text-[10px] text-purple-200 mt-0.5 truncate w-full text-center'>
          {clipData.notes.length} notes • Bar {clipData.startBar + 1}-
          {clipData.startBar + clipData.bars}
        </div>
      </div>
    </div>
  );
}
