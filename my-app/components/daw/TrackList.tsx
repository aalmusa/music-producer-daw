// components/daw/TrackList.tsx

const dummyTracks = [
  { id: "1", name: "Drums", color: "bg-emerald-500" },
  { id: "2", name: "Bass", color: "bg-blue-500" },
  { id: "3", name: "Keys", color: "bg-purple-500" },
];

export default function TrackList() {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-10 flex items-center px-3 border-b border-slate-800 text-xs text-slate-400">
        Tracks
      </div>

      {/* Tracks */}
      <div className="flex-1 overflow-auto">
        {dummyTracks.map(track => (
          <div
            key={track.id}
            className="h-16 flex items-center px-3 border-b border-slate-800 text-sm"
          >
            <div className={`w-2 h-8 rounded-full mr-2 ${track.color}`} />
            <div className="flex flex-col flex-1">
              <span className="font-medium text-slate-100">{track.name}</span>
              <div className="flex gap-1 mt-1 text-[10px] text-slate-400">
                <button className="px-1 py-0.5 rounded bg-slate-800">M</button>
                <button className="px-1 py-0.5 rounded bg-slate-800">S</button>
                <button className="px-1 py-0.5 rounded bg-slate-800">R</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add track button */}
      <button className="h-10 text-xs text-slate-300 border-t border-slate-800 hover:bg-slate-900">
        + Add track
      </button>
    </div>
  );
}
