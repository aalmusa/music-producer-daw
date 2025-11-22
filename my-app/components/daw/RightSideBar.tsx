// components/daw/RightSideBar.tsx
'use client';

export default function RightSideBar() {
  return (
    <div className='h-full flex flex-col'>
      <div className='h-10 flex items-center px-3 border-b border-slate-800 text-xs text-slate-400'>
        Chat
      </div>

      <div className='flex-1 flex flex-col items-center justify-center p-4 text-center'>
        <div className='text-slate-400 space-y-3'>
          <p className='text-sm'>🤖 AI Chat</p>
          <p className='text-xs text-slate-500'>
            Coming soon: Chat about your project, ask for production tips, and get AI suggestions
          </p>
        </div>
      </div>
    </div>
  );
}
