'use client';

import type { SongSpec } from '@/app/api/context/SongSpecStore';
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';

type SongSpecContextType = {
  songSpec: SongSpec | null;
  updateSongSpec: (spec: SongSpec | null) => void;
};

const SongSpecContext = createContext<SongSpecContextType | undefined>(
  undefined
);

export function SongSpecProvider({ children }: { children: ReactNode }) {
  const [songSpec, setSongSpec] = useState<SongSpec | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Load song spec from API on mount
  useEffect(() => {
    async function loadSongSpec() {
      try {
        const response = await fetch('/api/context?songId=default');
        if (response.ok) {
          const data = await response.json();
          if (data.songSpec) {
            setSongSpec(data.songSpec);
          }
        }
      } catch (error) {
        console.error('Error loading song spec:', error);
      } finally {
        setHasLoaded(true);
      }
    }

    if (!hasLoaded) {
      loadSongSpec();
    }
  }, [hasLoaded]);

  const updateSongSpec = (spec: SongSpec | null) => {
    setSongSpec(spec);
  };

  return (
    <SongSpecContext.Provider value={{ songSpec, updateSongSpec }}>
      {children}
    </SongSpecContext.Provider>
  );
}

export function useSongSpec() {
  const context = useContext(SongSpecContext);
  if (context === undefined) {
    throw new Error('useSongSpec must be used within a SongSpecProvider');
  }
  return context;
}
