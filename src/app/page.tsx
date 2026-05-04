"use client";

import React, { useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import LoginOverlay from '@/components/LoginOverlay';
import BibleGrid from '@/components/BibleGrid';

export default function Home() {
  const { isAuthenticated, searchResults, setSearchResults, setIsSearching } = useAppContext();

  // Load default state (Genesis 1:1) when authenticated and no search results
  useEffect(() => {
    if (isAuthenticated && searchResults.length === 0) {
      const loadDefault = async () => {
        setIsSearching(true);
        try {
          const response = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reference: '', keywords: null }) // Empty search fetches default
          });
          if (response.ok) {
            const data = await response.json();
            setSearchResults(data.results);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setIsSearching(false);
        }
      };
      
      loadDefault();
    }
  }, [isAuthenticated, searchResults.length, setSearchResults, setIsSearching]);

  return (
    <main className="h-screen w-screen overflow-hidden flex flex-col bg-gray-50 text-gray-900">
      {!isAuthenticated && <LoginOverlay />}
      
      {/* Header */}
      <header className="bg-blue-900 text-white px-6 py-4 shadow-md z-40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <svg xmlns="http://www.w3.org/-2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-book-open text-blue-100"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Bible Word Analysis</h1>
            <p className="text-blue-200 text-xs mt-0.5">Multi-Language Exegetical Tool</p>
          </div>
        </div>
      </header>

      {/* Main Grid Area */}
      <div className="flex-1 overflow-hidden relative">
        <BibleGrid />
      </div>
    </main>
  );
}
