'use client';

import { useEffect, useRef } from 'react';

interface SyncScrollContainerProps {
  children: React.ReactNode;
}

/**
 * Container that synchronizes vertical scrolling between TrackList and Timeline
 */
export default function SyncScrollContainer({ children }: SyncScrollContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Find the scrollable track list and timeline elements
    const trackListScroll = container.querySelector('[data-scroll-sync="tracklist"]');
    const timelineScroll = container.querySelector('[data-scroll-sync="timeline"]');

    if (!trackListScroll || !timelineScroll) return;

    let isScrolling = false;

    const syncScroll = (source: Element, target: Element) => {
      if (isScrolling) return;
      isScrolling = true;
      target.scrollTop = source.scrollTop;
      requestAnimationFrame(() => {
        isScrolling = false;
      });
    };

    const handleTrackListScroll = () => {
      syncScroll(trackListScroll, timelineScroll);
    };

    const handleTimelineScroll = () => {
      syncScroll(timelineScroll, trackListScroll);
    };

    trackListScroll.addEventListener('scroll', handleTrackListScroll);
    timelineScroll.addEventListener('scroll', handleTimelineScroll);

    return () => {
      trackListScroll.removeEventListener('scroll', handleTrackListScroll);
      timelineScroll.removeEventListener('scroll', handleTimelineScroll);
    };
  }, []);

  return (
    <div ref={containerRef} className='flex flex-1 overflow-hidden'>
      {children}
    </div>
  );
}
