"use client"

import * as React from "react"
import { Music, Gauge, Clock } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar"

// Sample configuration data - this would be updated based on chat context
const config = {
  bpm: 120,
  timeSignature: "4/4",
  key: "C Major",
  genre: "Synthwave",
}


export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    
    <Sidebar {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Music className="h-5 w-5" />
          <span className="font-semibold">Configuration</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Current Track</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-4 px-2 py-2">
              {/* BPM */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Gauge className="h-3.5 w-3.5" />
                  <span>BPM</span>
                </div>
                <div className="text-lg font-semibold pl-5">
                  {config.bpm}
                </div>
              </div>

              {/* Time Signature */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Time Signature</span>
                </div>
                <div className="text-lg font-semibold pl-5">
                  {config.timeSignature}
                </div>
              </div>

              {/* Key */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Music className="h-3.5 w-3.5" />
                  <span>Key</span>
                </div>
                <div className="text-lg font-semibold pl-5">
                  {config.key}
                </div>
              </div>

              {/* Genre */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Genre</span>
                </div>
                <div className="text-lg font-semibold pl-5">
                  {config.genre}
                </div>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
