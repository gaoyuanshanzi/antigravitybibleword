"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface BibleRow {
  reference: string; // e.g. "Genesis 1:1"
  kjv: { text: string; original_words?: string[] };
  asv: { text: string; original_words?: string[] };
  korean: { text: string; original_words?: string[] };
  hebrew: { text: string; original_words?: string[] };
  greek: { text: string; original_words?: string[] };
}

interface AppContextType {
  isAuthenticated: boolean;
  setIsAuthenticated: (val: boolean) => void;
  geminiApiKey: string;
  setGeminiApiKey: (val: string) => void;
  searchResults: BibleRow[];
  setSearchResults: React.Dispatch<React.SetStateAction<BibleRow[]>>;
  totalMatches: number;
  setTotalMatches: React.Dispatch<React.SetStateAction<number>>;
  isSearching: boolean;
  setIsSearching: React.Dispatch<React.SetStateAction<boolean>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [searchResults, setSearchResults] = useState<BibleRow[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        setIsAuthenticated,
        geminiApiKey,
        setGeminiApiKey,
        searchResults,
        setSearchResults,
        totalMatches,
        setTotalMatches,
        isSearching,
        setIsSearching,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
