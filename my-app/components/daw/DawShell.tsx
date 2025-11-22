// components/daw/DawShell.tsx
import TransportBar from "./TransportBar";
import TrackList from "./TrackList";
import Timeline from "./Timeline";
import RightSidebar from "./RightSideBar";
import Mixer from "./Mixer";

export default function DawShell() {
  return (
    <main className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      {/* Top transport bar */}
      <header className="h-14 border-b border-slate-800 flex items-center px-4">
        <TransportBar />
      </header>

      {/* Middle content: tracks + timeline + right sidebar */}
      <section className="flex flex-1 overflow-hidden">
        {/* Left: track list and timeline */}
        <div className="flex flex-1 overflow-hidden">
          {/* Track list column */}
          <aside className="w-52 border-r border-slate-800 bg-slate-950">
            <TrackList />
          </aside>

          {/* Timeline area */}
          <div className="flex-1 overflow-auto relative bg-slate-900">
            <Timeline />
          </div>
        </div>

        {/* Right: future AI / inspector panel */}
        <aside className="w-80 border-l border-slate-800 bg-slate-950">
          <RightSidebar />
        </aside>
      </section>

      {/* Bottom mixer */}
      <footer className="h-40 border-t border-slate-800 bg-slate-950">
        <Mixer />
      </footer>
    </main>
  );
}
