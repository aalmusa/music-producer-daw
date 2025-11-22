// components/daw/Timeline.tsx

const TRACK_ROW_HEIGHT = 64;

export default function Timeline() {
  const tracks = ["Drums", "Bass", "Keys"];
  const measureCount = 16;

  return (
    <div className="h-full w-full relative">
      {/* Time ruler at the top */}
      <div className="h-10 border-b border-slate-800 flex text-[10px] text-slate-400 bg-slate-950/80 sticky top-0 z-10">
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
        {tracks.map((trackName, rowIndex) => (
          <div
            key={trackName}
            className="relative border-b border-slate-800"
            style={{ height: TRACK_ROW_HEIGHT }}
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

            {/* Placeholder clip */}
            <div className="relative h-full flex items-center px-2">
              <div className="h-8 w-40 rounded bg-slate-600/80 border border-slate-400/40 text-[10px] flex items-center justify-center text-slate-100">
                {trackName} clip
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Playhead placeholder */}
      <div className="pointer-events-none absolute top-10 bottom-0 w-px bg-emerald-400 left-32" />
    </div>
  );
}
