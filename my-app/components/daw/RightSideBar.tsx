// components/daw/RightSideBar.tsx
'use client';

export default function RightSideBar() {
  return (
    <div className='h-full flex flex-col'>
      <div className='h-10 flex items-center px-3 border-b border-slate-800 text-xs text-slate-400'>
        Tools
      </div>

      <div className='flex-1 p-4'>
        {/* Future tools and utilities can go here */}
      </div>
    </div>
  );
}
