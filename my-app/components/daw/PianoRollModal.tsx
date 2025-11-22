'use client';

import { previewNote } from '@/lib/audioEngine';
import { MidiClipData, MidiNote, noteNumberToName } from '@/lib/midiTypes';
import { useCallback, useEffect, useRef, useState } from 'react';

interface PianoRollModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackId: string;
  trackName: string;
  trackColor: string;
  clipData: MidiClipData;
  onUpdateClip: (clipData: MidiClipData) => void;
}

// Piano roll configuration
const PIANO_KEYS = 48; // 4 octaves (C2 to B5)
const LOWEST_NOTE = 36; // C2
const GRID_DIVISIONS = 16; // 16th notes per bar

export default function PianoRollModal({
  isOpen,
  onClose,
  trackId,
  trackName,
  trackColor,
  clipData,
  onUpdateClip,
}: PianoRollModalProps) {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{
    pitch: number;
    start: number;
  } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Get grid position from mouse event
  const getGridPosition = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!gridRef.current) return null;

      const rect = gridRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const cellWidth = rect.width / (clipData.bars * GRID_DIVISIONS);
      const cellHeight = 24; // Fixed height per key

      const gridX = Math.floor(x / cellWidth);
      const gridY = Math.floor(y / cellHeight);

      const pitch = LOWEST_NOTE + (PIANO_KEYS - 1 - gridY);
      const start = gridX / GRID_DIVISIONS;

      return { pitch, start, gridX, gridY };
    },
    [clipData.bars]
  );

  // Handle mouse down - start drawing or selecting
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return; // Only left click

      const pos = getGridPosition(e);
      if (!pos) return;

      // Check if clicking on existing note
      const clickedNote = clipData.notes.find(
        (n) => Math.abs(n.start - pos.start) < 0.001 && n.pitch === pos.pitch
      );

      if (clickedNote) {
        setSelectedNoteId(clickedNote.id);
      } else {
        // Start drawing new note
        setIsDrawing(true);
        setDrawStart({ pitch: pos.pitch, start: pos.start });
        setSelectedNoteId(null);
      }
    },
    [getGridPosition, clipData.notes]
  );

  // Handle mouse move - update note length while drawing
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDrawing || !drawStart) return;

      const pos = getGridPosition(e);
      if (!pos || pos.pitch !== drawStart.pitch) return;

      // Calculate duration
      const duration = Math.max(
        1 / GRID_DIVISIONS,
        (pos.gridX - Math.floor(drawStart.start * GRID_DIVISIONS) + 1) /
          GRID_DIVISIONS
      );

      // Preview visual feedback by checking if note exists
      const existingNote = clipData.notes.find(
        (n) =>
          n.pitch === drawStart.pitch &&
          Math.abs(n.start - drawStart.start) < 0.001
      );

      if (existingNote) {
        // Update existing note duration
        const updatedNotes = clipData.notes.map((n) =>
          n.id === existingNote.id ? { ...n, duration } : n
        );
        onUpdateClip({ ...clipData, notes: updatedNotes });
      }
    },
    [isDrawing, drawStart, getGridPosition, clipData, onUpdateClip]
  );

  // Handle mouse up - finalize note
  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDrawing || !drawStart) return;

      const pos = getGridPosition(e);
      if (!pos || pos.pitch !== drawStart.pitch) {
        setIsDrawing(false);
        setDrawStart(null);
        return;
      }

      // Calculate final duration
      const duration = Math.max(
        1 / GRID_DIVISIONS,
        (pos.gridX - Math.floor(drawStart.start * GRID_DIVISIONS) + 1) /
          GRID_DIVISIONS
      );

      // Check if note already exists (from mouse move updates)
      const existingNote = clipData.notes.find(
        (n) =>
          n.pitch === drawStart.pitch &&
          Math.abs(n.start - drawStart.start) < 0.001
      );

      if (!existingNote) {
        // Create new note
        const newNote: MidiNote = {
          id: crypto.randomUUID(),
          pitch: drawStart.pitch,
          start: drawStart.start,
          duration,
          velocity: 0.8,
        };

        onUpdateClip({ ...clipData, notes: [...clipData.notes, newNote] });
      }

      // Preview the note
      previewNote(trackId, drawStart.pitch, 0.2, 0.8);

      setIsDrawing(false);
      setDrawStart(null);
    },
    [isDrawing, drawStart, getGridPosition, clipData, onUpdateClip, trackId]
  );

  // Handle note hover to preview sound
  const handleNoteHover = useCallback(
    (note: MidiNote) => {
      if (!isDrawing) {
        previewNote(trackId, note.pitch, 0.1, 0.5);
      }
    },
    [trackId, isDrawing]
  );

  // Delete selected note
  const handleDeleteNote = useCallback(
    (noteId: string) => {
      const updatedNotes = clipData.notes.filter((n) => n.id !== noteId);
      onUpdateClip({ ...clipData, notes: updatedNotes });
      setSelectedNoteId(null);
    },
    [clipData, onUpdateClip]
  );

  // Handle right-click on note to delete
  const handleNoteRightClick = useCallback(
    (e: React.MouseEvent, noteId: string) => {
      e.preventDefault();
      e.stopPropagation();
      handleDeleteNote(noteId);
    },
    [handleDeleteNote]
  );

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        selectedNoteId
      ) {
        e.preventDefault();
        handleDeleteNote(selectedNoteId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, selectedNoteId, handleDeleteNote]);

  // Clear all notes
  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all notes?')) {
      onUpdateClip({ ...clipData, notes: [] });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className='fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8'
      onClick={onClose}
    >
      <div
        className='bg-slate-950 border border-slate-700 rounded-lg shadow-2xl w-full h-full max-w-[95vw] max-h-[90vh] flex flex-col'
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className='flex items-center justify-between px-6 py-4 border-b border-slate-800'>
          <div className='flex items-center gap-3'>
            <div className={`w-3 h-3 rounded-full ${trackColor}`} />
            <h2 className='text-xl font-semibold text-slate-100'>
              {trackName} - Piano Roll Editor
            </h2>
            <span className='text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded'>
              {clipData.notes.length} notes
            </span>
          </div>

          <div className='flex items-center gap-3'>
            <button
              onClick={handleClearAll}
              className='px-3 py-1.5 text-sm bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white rounded transition-colors'
            >
              Clear All
            </button>
            <button
              onClick={onClose}
              className='px-4 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors'
            >
              Done
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className='flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900/50'>
          <div className='flex items-center gap-4'>
            <div className='text-xs text-slate-400'>
              <span className='font-medium'>Click & drag</span> to create notes
            </div>
            <div className='w-px h-4 bg-slate-700' />
            <div className='text-xs text-slate-400'>
              <span className='font-medium'>Right-click</span> or{' '}
              <span className='font-medium'>Delete</span> to remove
            </div>
            <div className='w-px h-4 bg-slate-700' />
            <div className='text-xs text-slate-400'>
              <span className='font-medium'>Hover</span> notes to preview
            </div>
          </div>

          <div className='flex items-center gap-3'>
            <span className='text-xs text-slate-400'>Grid: 16th notes</span>
            <div className='w-px h-4 bg-slate-700' />
            <span className='text-xs text-slate-400'>
              Range: {noteNumberToName(LOWEST_NOTE)} -{' '}
              {noteNumberToName(LOWEST_NOTE + PIANO_KEYS - 1)}
            </span>
          </div>
        </div>

        {/* Piano Roll Content */}
        <div className='flex-1 flex overflow-hidden'>
          {/* Piano keys sidebar */}
          <div className='w-20 border-r border-slate-800 bg-slate-950 flex flex-col overflow-hidden'>
            <div className='h-12 border-b border-slate-800 flex items-center justify-center text-[10px] text-slate-500'>
              NOTE
            </div>
            <div className='flex-1 flex flex-col overflow-y-auto'>
              {Array.from({ length: PIANO_KEYS }).map((_, i) => {
                const pitch = LOWEST_NOTE + (PIANO_KEYS - 1 - i);
                const noteName = noteNumberToName(pitch);
                const isBlackKey = noteName.includes('#');
                const isC = noteName.startsWith('C') && !noteName.includes('#');

                return (
                  <div
                    key={i}
                    className={`shrink-0 border-b flex items-center justify-end px-2 text-[11px] font-mono ${
                      isBlackKey
                        ? 'bg-slate-900 text-slate-500 border-slate-800'
                        : 'bg-slate-950 text-slate-300 border-slate-800'
                    } ${isC ? 'border-l-2 border-l-emerald-500' : ''}`}
                    style={{ height: '24px' }}
                    onClick={() => previewNote(trackId, pitch, 0.3, 0.8)}
                    role='button'
                  >
                    {noteName}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grid area */}
          <div className='flex-1 flex flex-col overflow-hidden'>
            {/* Time ruler */}
            <div className='h-12 border-b border-slate-800 bg-slate-950 flex'>
              {Array.from({ length: clipData.bars * 4 }).map((_, i) => {
                const bar = Math.floor(i / 4);
                const beat = (i % 4) + 1;
                const isBarStart = beat === 1;

                return (
                  <div
                    key={i}
                    className={`flex-1 border-r flex items-center justify-center text-[10px] ${
                      isBarStart
                        ? 'border-slate-600 text-slate-300 font-semibold'
                        : 'border-slate-800 text-slate-500'
                    }`}
                  >
                    {isBarStart ? `${bar + 1}` : beat}
                  </div>
                );
              })}
            </div>

            {/* Scrollable grid */}
            <div className='flex-1 overflow-auto relative bg-slate-900'>
              <div
                ref={gridRef}
                className='relative cursor-crosshair select-none'
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => {
                  if (isDrawing) {
                    setIsDrawing(false);
                    setDrawStart(null);
                  }
                }}
                style={{
                  height: `${PIANO_KEYS * 24}px`,
                  minWidth: '100%',
                }}
              >
                {/* Grid background */}
                <div
                  className='absolute inset-0 grid'
                  style={{
                    gridTemplateColumns: `repeat(${
                      clipData.bars * GRID_DIVISIONS
                    }, 1fr)`,
                    gridTemplateRows: `repeat(${PIANO_KEYS}, 24px)`,
                  }}
                >
                  {Array.from({
                    length: PIANO_KEYS * clipData.bars * GRID_DIVISIONS,
                  }).map((_, i) => {
                    const col = i % (clipData.bars * GRID_DIVISIONS);
                    const row = Math.floor(
                      i / (clipData.bars * GRID_DIVISIONS)
                    );
                    const isBarLine = col % GRID_DIVISIONS === 0;
                    const isBeatLine = col % 4 === 0;
                    const pitch = LOWEST_NOTE + (PIANO_KEYS - 1 - row);
                    const isBlackKey = noteNumberToName(pitch).includes('#');
                    const isC =
                      noteNumberToName(pitch).startsWith('C') &&
                      !noteNumberToName(pitch).includes('#');

                    return (
                      <div
                        key={i}
                        className={`border-r border-b ${
                          isBarLine
                            ? 'border-slate-600'
                            : isBeatLine
                            ? 'border-slate-700'
                            : 'border-slate-800'
                        } ${
                          isBlackKey
                            ? 'bg-slate-900/50'
                            : isC
                            ? 'bg-slate-900/30'
                            : 'bg-slate-900/20'
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Notes */}
                {clipData.notes.map((note) => {
                  const x = (note.start / clipData.bars) * 100;
                  const width = (note.duration / clipData.bars) * 100;
                  const y = (PIANO_KEYS - 1 - (note.pitch - LOWEST_NOTE)) * 24;
                  const height = 24;

                  const noteName = noteNumberToName(note.pitch);
                  const isSelected = selectedNoteId === note.id;

                  return (
                    <div
                      key={note.id}
                      className={`absolute rounded-sm border-2 transition-colors cursor-move group ${
                        isSelected
                          ? 'bg-yellow-500 border-yellow-400 z-20'
                          : 'bg-emerald-500 border-emerald-400 hover:bg-emerald-400 z-10'
                      }`}
                      style={{
                        left: `${x}%`,
                        top: `${y}px`,
                        width: `${width}%`,
                        height: `${height}px`,
                        opacity: isSelected ? 1 : note.velocity,
                      }}
                      onMouseEnter={() => handleNoteHover(note)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNoteId(note.id);
                      }}
                      onContextMenu={(e) => handleNoteRightClick(e, note.id)}
                    >
                      {/* Note label - shows on hover or when selected */}
                      <div className='absolute inset-0 flex items-center justify-between px-1'>
                        <span
                          className={`text-[9px] font-semibold text-slate-900 truncate transition-opacity ${
                            isSelected
                              ? 'opacity-100'
                              : 'opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          {noteName}
                        </span>
                        {isSelected && (
                          <span className='text-[8px] text-slate-800 opacity-75'>
                            {note.duration.toFixed(2)}b
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className='px-6 py-3 border-t border-slate-800 bg-slate-900/50'>
          <div className='flex items-center justify-between text-xs text-slate-400'>
            <div className='flex items-center gap-4'>
              <span>Clip Length: {clipData.bars} bars</span>
              <span>•</span>
              <span>Grid: 16th notes</span>
              <span>•</span>
              <span>Notes: {clipData.notes.length}</span>
            </div>
            <div className='flex items-center gap-3'>
              <div className='flex items-center gap-2'>
                <kbd className='px-2 py-1 bg-slate-800 rounded text-[10px]'>
                  ESC
                </kbd>
                <span>to close</span>
              </div>
              <span className='text-slate-600'>•</span>
              <div className='flex items-center gap-2'>
                <kbd className='px-2 py-1 bg-slate-800 rounded text-[10px]'>
                  DEL
                </kbd>
                <span>to delete selected</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
