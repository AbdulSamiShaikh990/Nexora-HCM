'use client';

import { useState } from 'react';
import type { SentimentFormState, SentimentResponse } from '@/types/sentiment';

export default function SentimentPage() {
  const [formState, setFormState] = useState<SentimentFormState>({
    text: '',
    isLoading: false,
    result: null,
    error: null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formState.text.trim()) {
      setFormState(prev => ({ ...prev, error: 'Please enter some text to analyze' }));
      return;
    }

    setFormState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null, 
      result: null 
    }));

    try {
      const response = await fetch('/api/sentiment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: formState.text }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze sentiment');
      }

      const result: SentimentResponse = await response.json();
      
      setFormState(prev => ({ 
        ...prev, 
        result, 
        isLoading: false 
      }));
    } catch (error) {
      setFormState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Something went wrong',
        isLoading: false 
      }));
    }
  };

  const getSentimentColor = (label: string) => {
    switch (label) {
      case 'positive': return 'text-green-600 bg-green-50 border-green-200';
      case 'negative': return 'text-red-600 bg-red-50 border-red-200';
      case 'neutral': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSentimentIcon = (label: string) => {
    switch (label) {
      case 'positive': return '😊';
      case 'negative': return '😞';
      case 'neutral': return '😐';
      default: return '❓';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Sentiment Analysis</h1>
        <p className="mt-1 text-sm text-gray-700">Monitor organization mood and feedback trends.</p>
      </div>

      {/* Analysis Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Analyze Text Sentiment</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="text" className="block text-sm font-medium text-gray-700">
              Enter text to analyze
            </label>
            <textarea
              id="text"
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Enter employee feedback, review, or any text..."
              value={formState.text}
              onChange={(e) => setFormState(prev => ({ ...prev, text: e.target.value }))}
              disabled={formState.isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={formState.isLoading || !formState.text.trim()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {formState.isLoading ? (
              <>
                <div className="animate-spin -ml-1 mr-3 h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                Analyzing...
              </>
            ) : (
              'Analyze Sentiment'
            )}
          </button>
        </form>

        {/* Error Display */}
        {formState.error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="text-red-800 text-sm">{formState.error}</div>
          </div>
        )}

        {/* Results Display */}
        {formState.result && (
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Analysis Results</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sentiment Label */}
              <div className={`p-4 rounded-md border ${getSentimentColor(formState.result.label)}`}>
                <div className="flex items-center">
                  <span className="text-2xl mr-2">{getSentimentIcon(formState.result.label)}</span>
                  <div>
                    <p className="text-sm font-medium">Sentiment</p>
                    <p className="text-lg font-semibold capitalize">{formState.result.label}</p>
                  </div>
                </div>
              </div>

              {/* Confidence Score */}
              <div className="p-4 rounded-md border border-blue-200 bg-blue-50">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">📊</span>
                  <div>
                    <p className="text-sm font-medium text-blue-700">Confidence</p>
                    <p className="text-lg font-semibold text-blue-800">
                      {(formState.result.score * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Confidence Level</span>
                <span>{(formState.result.score * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${formState.result.score * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sample Texts for Testing */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Test Examples</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Positive', text: "I love working here! The team is amazing and supportive." },
            { label: 'Negative', text: "The management is terrible and I hate the work environment." },
            { label: 'Neutral', text: "The meeting is scheduled for tomorrow at 10 AM." }
          ].map((example, index) => (
            <button
              key={index}
              onClick={() => setFormState(prev => ({ ...prev, text: example.text }))}
              className="p-3 text-left border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              <p className="text-sm font-medium text-gray-900">{example.label} Example</p>
              <p className="text-xs text-gray-600 mt-1">{example.text}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
