"use client";

import React, { useState } from 'react';
import Papa from 'papaparse';
import { Search, Settings2, FileDown } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import AnalysisModal from './AnalysisModal';

export default function BibleGrid() {
  const { searchResults, isSearching, setSearchResults, setIsSearching } = useAppContext();
  const [referenceQuery, setReferenceQuery] = useState('');
  const [keywordQueries, setKeywordQueries] = useState({
    kjv: '',
    korean: '',
    hebrew: '',
    greek: ''
  });
  
  const [selectedWord, setSelectedWord] = useState<{word: string, ref: string} | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSearching(true);
    
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: referenceQuery, keywords: keywordQueries })
      });
      
      if (!response.ok) throw new Error('Search failed');
      
      const data = await response.json();
      setSearchResults(data.results);
    } catch (err) {
      console.error(err);
      alert('An error occurred while searching.');
    } finally {
      setIsSearching(false);
    }
  };

  const exportCSV = () => {
    if (!searchResults.length) return;
    
    const csvData = searchResults.map(row => ({
      Reference: row.reference,
      KJV: row.kjv.text,
      Korean: row.korean.text,
      Hebrew: row.hebrew.text,
      Greek: row.greek.text
    }));
    
    const csv = Papa.unparse(csvData);
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'bible_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top Controls Area */}
      <div className="bg-white border-b border-blue-100 shadow-sm sticky top-0 z-30 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="flex-1 max-w-2xl flex items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-400">
              <Search size={18} />
            </div>
            <input 
              type="text" 
              value={referenceQuery}
              onChange={(e) => setReferenceQuery(e.target.value)}
              placeholder='e.g., "Gen 1:1, John 3:16" or "Genesis 1:1-10"' 
              className="w-full pl-10 pr-4 py-2 bg-blue-50/50 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            />
          </div>
          <button 
            type="submit" 
            disabled={isSearching}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-2"
          >
            {isSearching ? <Settings2 className="animate-spin" size={16} /> : <Search size={16} />}
            Search
          </button>
        </form>

        <button 
          onClick={exportCSV}
          disabled={searchResults.length === 0}
          className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-semibold hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <FileDown size={18} />
          Export CSV
        </button>
      </div>

      {/* Grid Area */}
      <div className="flex-1 overflow-auto bg-gray-50/50">
        <div className="min-w-[1200px] w-full">
          {/* Headers */}
          <div className="grid grid-cols-5 border-b border-blue-200 bg-blue-50 sticky top-0 z-20 shadow-sm">
            <div className="p-3 font-semibold text-blue-900 border-r border-blue-200 flex items-center justify-center bg-blue-100/50">
              Reference
            </div>
            
            {/* Version Headers with Keyword Search */}
            {[
              { id: 'kjv', label: 'KJV (English)' },
              { id: 'korean', label: '개역성경 (Korean)' },
              { id: 'hebrew', label: 'Masoretic (Hebrew)' },
              { id: 'greek', label: 'Septuagint (Greek)' }
            ].map((col) => (
              <div key={col.id} className="p-3 border-r border-blue-200 last:border-r-0 flex flex-col gap-2">
                <div className="font-semibold text-blue-900 text-center text-sm">{col.label}</div>
                <input 
                  type="text" 
                  placeholder="Keyword filter..."
                  value={keywordQueries[col.id as keyof typeof keywordQueries]}
                  onChange={(e) => setKeywordQueries({...keywordQueries, [col.id]: e.target.value})}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full px-2 py-1 text-xs border border-blue-200 rounded bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            ))}
          </div>

          {/* Rows */}
          <div className="divide-y divide-blue-100">
            {searchResults.length === 0 && !isSearching ? (
              <div className="p-12 text-center text-gray-400 flex flex-col items-center">
                <Search size={48} className="mb-4 opacity-20" />
                <p>Enter a reference or keyword above to begin exploring.</p>
                <p className="text-sm mt-2">Try &quot;Gen 1:1&quot; or leave blank and search to see the beginning.</p>
              </div>
            ) : isSearching ? (
              <div className="p-12 text-center text-blue-500 flex flex-col items-center">
                <Settings2 size={48} className="mb-4 animate-spin opacity-50" />
                <p>Searching the scriptures...</p>
              </div>
            ) : (
              searchResults.map((row, idx) => (
                <div key={idx} className="grid grid-cols-5 hover:bg-blue-50/50 transition-colors group">
                  <div className="p-4 border-r border-gray-100 text-sm font-medium text-gray-500 flex items-center justify-center text-center">
                    {row.reference}
                  </div>
                  
                  <div className="p-4 border-r border-gray-100 text-gray-800 leading-relaxed text-sm">
                    {row.kjv.text}
                  </div>
                  
                  <div className="p-4 border-r border-gray-100 text-gray-800 leading-relaxed text-sm font-sans">
                    {row.korean.text}
                  </div>
                  
                  <div className="p-4 border-r border-gray-100 text-gray-800 leading-loose text-lg text-right font-serif cursor-pointer hover:bg-blue-100/50 transition-colors"
                       onClick={() => setSelectedWord({word: row.hebrew.text, ref: row.reference})}
                       dir="rtl">
                    {row.hebrew.text}
                  </div>
                  
                  <div className="p-4 text-gray-800 leading-relaxed text-base font-serif cursor-pointer hover:bg-blue-100/50 transition-colors"
                       onClick={() => setSelectedWord({word: row.greek.text, ref: row.reference})}>
                    {row.greek.text}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {selectedWord && (
        <AnalysisModal 
          word={selectedWord.word} 
          verseRef={selectedWord.ref}
          onClose={() => setSelectedWord(null)}
        />
      )}
    </div>
  );
}
