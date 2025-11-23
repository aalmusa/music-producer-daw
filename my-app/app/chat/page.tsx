import { AppSidebar } from "@/components/app-sidebar"
import { ChatUI } from "@/components/chat-ui"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function ChatPage() {
  return (
    <SidebarProvider className="h-screen">
      <AppSidebar />
      <SidebarInset className="h-screen">
        <ChatUI />
      </SidebarInset>
    </SidebarProvider>
  )
}

