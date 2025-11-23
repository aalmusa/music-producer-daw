import { AppSidebar } from '@/components/app-sidebar';
import { ChatUI } from '@/components/chat-ui';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { SongSpecProvider } from '@/lib/song-spec-context';

export default function ChatPage() {
  return (
    <SongSpecProvider>
      <SidebarProvider className='h-screen dark'>
        <AppSidebar />
        <SidebarInset className='h-screen'>
          <ChatUI />
        </SidebarInset>
      </SidebarProvider>
    </SongSpecProvider>
  );
}
