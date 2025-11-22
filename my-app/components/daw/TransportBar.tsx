// components/daw/TransportBar.tsx
export default function TransportBar() {
  return (
    <div className="flex items-center gap-4 w-full">
      {/* Left side: logo or title */}
      <div className="font-semibold tracking-wide text-sm uppercase text-slate-300">
        My Web DAW
      </div>

      {/* Transport buttons */}
      <div className="flex items-center gap-2">
        <button className="px-3 py-1 rounded bg-green-500 text-slate-900 text-sm">
          Play
        </button>
        <button className="px-3 py-1 rounded bg-red-500 text-slate-900 text-sm">
          Stop
        </button>
      </div>

      {/* Time display */}
      <div className="ml-4 flex items-center gap-2 text-xs">
        <span className="text-slate-400">Position</span>
        <span className="px-2 py-1 rounded bg-slate-800 font-mono text-slate-100">
          1.1.0
        </span>
      </div>

      {/* BPM input */}
      <div className="ml-4 flex items-center gap-2 text-xs">
        <span className="text-slate-400">BPM</span>
        <input
          type="number"
          defaultValue={120}
          className="w-16 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-100 text-xs"
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side quick buttons, placeholders for now */}
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <button className="px-2 py-1 rounded border border-slate-700 hover:bg-slate-800">
          Metronome
        </button>
        <button className="px-2 py-1 rounded border border-slate-700 hover:bg-slate-800">
          Loop
        </button>
      </div>
    </div>
  );
}
