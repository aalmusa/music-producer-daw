"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import type { SongSpec } from "@/app/api/context/SongSpecStore";

type SongSpecContextType = {
  songSpec: SongSpec | null;
  updateSongSpec: (spec: SongSpec | null) => void;
};

const SongSpecContext = createContext<SongSpecContextType | undefined>(
  undefined
);

export function SongSpecProvider({ children }: { children: ReactNode }) {
  const [songSpec, setSongSpec] = useState<SongSpec | null>(null);

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
    throw new Error("useSongSpec must be used within a SongSpecProvider");
  }
  return context;
}

