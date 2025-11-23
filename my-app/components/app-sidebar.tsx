"use client"

import * as React from "react"
import { Music, Gauge, Music2 } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import { PianoKeyboard } from "@/components/piano-keyboard"
import { useSongSpec } from "@/lib/song-spec-context"

// Default configuration
const defaultConfig = {
  bpm: 0,
  key: "unknown",
  genre: "Unknown",
}


export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { songSpec } = useSongSpec()

  // Get configuration from songSpec or use defaults
  const config = React.useMemo(() => {
    if (!songSpec) {
      return {
        ...defaultConfig,
        scale: "major",
        keyWithScale: defaultConfig.key,
      }
    }

    // Use explicit values if set, otherwise fall back to aggregate
    const bpm = songSpec.bpm ?? songSpec.aggregate?.bpm ?? defaultConfig.bpm
    const rawKey = songSpec.key ?? songSpec.aggregate?.key ?? "C"
    const rawScale = songSpec.scale ?? songSpec.aggregate?.scale ?? "major"
    const genre = songSpec.genre ?? songSpec.aggregate?.genres?.[0] ?? defaultConfig.genre

    // Check if key already includes scale (e.g., "C Major")
    const keyParts = rawKey.split(" ")
    let key: string
    let scale: string

    if (keyParts.length > 1) {
      // Key already includes scale
      key = keyParts[0]
      scale = keyParts.slice(1).join(" ").toLowerCase()
    } else {
      // Key and scale are separate
      key = rawKey
      scale = rawScale.toLowerCase()
    }

    // Format key with scale for display (capitalize first letter of scale)
    const scaleFormatted = scale.charAt(0).toUpperCase() + scale.slice(1)
    const keyWithScale = `${key} ${scaleFormatted}`

    return {
      bpm,
      key: keyWithScale,
      genre,
      scale: scaleFormatted,
      rawKey: key,
    }
  }, [songSpec])

  return (
    
    <Sidebar {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Music className="h-5 w-5" />
          <span className="font-semibold text-base">Configuration</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-base">Current Track</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-4 px-2 py-2">
              {/* Tempo */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Gauge className="h-3.5 w-3.5" />
                  <span>Tempo</span>
                </div>
                <div className="text-lg font-semibold pl-5">
                  {config.bpm} bpm
                </div>
              </div>

              {/* Key and Scale */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Music className="h-3.5 w-3.5" />
                  <span>Key and Scale</span>
                </div>
                <div className="text-lg font-semibold pl-5 mb-2">
                  {config.key}
                </div>
                <div className="pl-5">
                  <PianoKeyboard className="w-full" keySignature={config.key} />
                </div>
              </div>

              {/* Genre */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Music2 className="h-3.5 w-3.5" />
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
