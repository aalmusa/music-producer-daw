"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export type EnergyLevel = "high" | "medium" | "low"

export interface Segment {
  percentage: number // 0-100
  color: string // Tailwind color class or custom color
  label?: string // Optional label for the segment
  energyLevel?: EnergyLevel // Energy level for animation effects
}

interface SegmentedProgressBarProps {
  segments: Segment[]
  className?: string
  barHeight?: string // Tailwind height class (e.g., "h-2", "h-3")
}

export function SegmentedProgressBar({
  segments,
  className,
  barHeight = "h-2",
}: SegmentedProgressBarProps) {
  // Ensure segments total to 100%
  const totalPercentage = segments.reduce((sum, seg) => sum + seg.percentage, 0)
  const normalizedSegments = totalPercentage > 0
    ? segments.map(seg => ({
        ...seg,
        percentage: (seg.percentage / totalPercentage) * 100,
      }))
    : segments

  // Get custom styles for segments
  const getSegmentStyles = (index: number) => {
    return { width: `${normalizedSegments[index].percentage}%` } as React.CSSProperties
  }

  return (
    <div className={cn("w-full", className)}>
      <div className={cn("flex rounded-full overflow-hidden border-2 border-black relative", barHeight)}>
        {normalizedSegments.map((segment, index) => {
          // Round corners for first and last segments
          const roundedClass = index === 0 
            ? "rounded-l-full" 
            : index === normalizedSegments.length - 1 
            ? "rounded-r-full" 
            : ""
          
          // Add border between segments (except after the last one)
          const borderClass = index < normalizedSegments.length - 1 
            ? "border-r-2 border-black" 
            : ""
          
          // Add glossy effect to all segments
          const glossyStyle = {
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.3), inset 0 -1px 0 rgba(0, 0, 0, 0.2)',
          }
          
          return (
          <div
            key={index}
            className={cn(
              segment.color,
              "relative flex items-center justify-center",
              roundedClass,
              borderClass,
              // Only show text if segment is wide enough (>= 15%)
              segment.percentage >= 15 ? "" : "overflow-hidden"
            )}
            style={{ ...getSegmentStyles(index), ...glossyStyle }}
            title={segment.label || `${segment.percentage.toFixed(1)}%`}
          >
            {segment.percentage >= 15 && (
              <span className="text-[10px] font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] whitespace-nowrap z-10 relative">
                {segment.percentage.toFixed(0)}%
              </span>
            )}
          </div>
          )
        })}
      </div>
    </div>
  )
}

