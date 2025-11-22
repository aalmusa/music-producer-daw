// components/daw/RightSideBar.tsx

export default function RightSideBar() {
  return (
    <div className="h-full flex flex-col">
      <div className="h-10 flex items-center px-3 border-b border-slate-800 text-xs text-slate-400">
        Panel
      </div>

      <div className="flex-1 p-3 text-xs text-slate-300 space-y-2">
        <p>
          This panel will be used later for:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>AI chat about the current project</li>
          <li>Track and effect settings</li>
          <li>Project info</li>
        </ul>
        <p className="mt-2 text-slate-500">
          For now it is just a placeholder.
        </p>
      </div>
    </div>
  );
}
