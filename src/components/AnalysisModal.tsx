"use client";

import React, { useState, useEffect } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';

interface AnalysisModalProps {
  word: string;
  verseRef: string;
  onClose: () => void;
}

export default function AnalysisModal({ word, verseRef, onClose }: AnalysisModalProps) {
  const { geminiApiKey } = useAppContext();
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchAnalysis() {
      if (!geminiApiKey) {
        setError('Gemini API Key is missing. Please add it in the login screen.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word, verseRef, apiKey: geminiApiKey }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch analysis');
        }

        const data = await response.json();
        setAnalysis(data.analysis);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message || 'An error occurred during analysis.');
        } else {
          setError('An error occurred during analysis.');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchAnalysis();
  }, [word, verseRef, geminiApiKey]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-950/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-blue-100 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-blue-50/50">
          <div className="flex items-center gap-2 text-blue-700">
            <Sparkles size={20} />
            <h3 className="font-semibold text-lg">Etymological Analysis</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-white text-gray-800">
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-sm text-gray-500 mb-1">Target Word</p>
            <div className="flex items-end gap-3">
              <span className="text-2xl font-bold text-blue-900">{word}</span>
              <span className="text-sm text-blue-600 mb-1 border-l border-blue-200 pl-3">{verseRef}</span>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-blue-600">
              <Loader2 size={32} className="animate-spin mb-4" />
              <p className="text-sm font-medium animate-pulse">Consulting historical linguistics...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg">
              {error}
            </div>
          ) : (
            <div className="prose prose-blue max-w-none text-sm md:text-base whitespace-pre-wrap">
              {analysis}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
