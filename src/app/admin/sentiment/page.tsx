'use client';

import { useState, useEffect } from 'react';

interface SentimentResponseData {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeEmail: string;
  text: string;
  sentimentLabel: string;
  confidenceScore: number;
  createdAt: string;
}

interface Stats {
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  averageConfidence: number;
}

interface ScheduleStatus {
  active: boolean;
  startAt: string | null;
  endAt: string | null;
  remainingMinutes: number;
}

export default function SentimentPage() {
  const [responses, setResponses] = useState<SentimentResponseData[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    positive: 0,
    negative: 0,
    neutral: 0,
    averageConfidence: 0
  });
  const [scheduleStart, setScheduleStart] = useState('');
  const [scheduleDuration, setScheduleDuration] = useState(30);
  const [scheduleStatus, setScheduleStatus] = useState<ScheduleStatus>({
    active: false,
    startAt: null,
    endAt: null,
    remainingMinutes: 0,
  });
  const [windowResponses, setWindowResponses] = useState(0);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterSentiment, setFilterSentiment] = useState<string>('all');

  useEffect(() => {
    fetchSentimentResults();
  }, [filterSentiment]);

  const fetchSentimentResults = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams();
      if (filterSentiment !== 'all') {
        queryParams.append('sentiment', filterSentiment);
      }
      
      const response = await fetch(`/api/sentiment/admin?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch sentiment results');
      }

      const data = await response.json();
      setResponses(data.responses || []);
      setStats(data.stats || stats);
      setScheduleStatus(data.scheduleStatus || scheduleStatus);
      setWindowResponses(Number(data.windowResponses || 0));
      if (data.schedule?.startAt) {
        const start = new Date(data.schedule.startAt);
        const local = new Date(start.getTime() - start.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setScheduleStart(local);
      }
      if (typeof data.schedule?.durationMinutes === 'number') {
        setScheduleDuration(data.schedule.durationMinutes);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleScheduleSave = async () => {
    setSavingSchedule(true);
    try {
      const startAt = scheduleStart ? new Date(scheduleStart).toISOString() : null;
      const response = await fetch('/api/sentiment/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startAt,
          durationMinutes: Number(scheduleDuration) || 30,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save schedule');
      }

      const data = await response.json();
      setScheduleStatus(data.scheduleStatus || scheduleStatus);
      fetchSentimentResults();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setSavingSchedule(false);
    }
  };

  const getSentimentColor = (label: string) => {
    switch (label?.toLowerCase()) {
      case 'positive': return 'text-green-600 bg-green-50 border-green-200';
      case 'negative': return 'text-red-600 bg-red-50 border-red-200';
      case 'neutral': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSentimentIcon = (label: string) => {
    switch (label?.toLowerCase()) {
      case 'positive': return '😊';
      case 'negative': return '😞';
      case 'neutral': return '😐';
      default: return '❓';
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-indigo-200/60 bg-gradient-to-r from-indigo-50/70 via-white/60 to-sky-50/70 backdrop-blur-xl shadow-[0_10px_30px_rgba(99,102,241,0.15)] p-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center shadow-lg">
            📈
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Sentiment Analysis Dashboard</h1>
            <p className="mt-1 text-sm text-gray-700">Monitor employee feedback and sentiment trends.</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center shadow-md">
              🗓️
            </div>
            <div>
              <p className="text-base font-semibold text-gray-900">Schedule Sentiment Window</p>
              <p className="text-xs text-gray-500">Employees can submit once during the scheduled window.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Start</label>
              <input
                type="datetime-local"
                value={scheduleStart}
                onChange={(e) => setScheduleStart(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Minutes</label>
              <input
                type="number"
                min={5}
                value={scheduleDuration}
                onChange={(e) => setScheduleDuration(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleScheduleSave}
                disabled={savingSchedule}
                className="w-full px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm rounded-xl shadow hover:brightness-110 disabled:opacity-60"
              >
                {savingSchedule ? 'Saving...' : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-gray-500">Status</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] ${scheduleStatus.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
              {scheduleStatus.active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-gray-500">Remaining</span>
            <span className="font-medium text-gray-700">{scheduleStatus.active ? `${scheduleStatus.remainingMinutes} min` : '—'}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-gray-500">Start</span>
            <span className="font-medium text-gray-700">
              {scheduleStatus.startAt ? new Date(scheduleStatus.startAt).toLocaleString() : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-gray-500">Responses</span>
            <span className="font-medium text-gray-700">{windowResponses}</span>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-white/40 bg-white/70 backdrop-blur-xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Responses</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <span className="text-3xl">📊</span>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/70 backdrop-blur-xl shadow-[0_10px_30px_rgba(16,185,129,0.08)] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700">Positive</p>
              <p className="text-2xl font-bold text-green-900">{stats.positive}</p>
              <p className="text-xs text-green-600">
                {stats.total > 0 ? ((stats.positive / stats.total) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <span className="text-3xl">😊</span>
          </div>
        </div>

        <div className="rounded-2xl border border-rose-200/60 bg-rose-50/70 backdrop-blur-xl shadow-[0_10px_30px_rgba(244,63,94,0.08)] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700">Negative</p>
              <p className="text-2xl font-bold text-red-900">{stats.negative}</p>
              <p className="text-xs text-red-600">
                {stats.total > 0 ? ((stats.negative / stats.total) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <span className="text-3xl">😞</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/60 bg-slate-50/70 backdrop-blur-xl shadow-[0_10px_30px_rgba(100,116,139,0.08)] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">Neutral</p>
              <p className="text-2xl font-bold text-gray-900">{stats.neutral}</p>
              <p className="text-xs text-gray-600">
                {stats.total > 0 ? ((stats.neutral / stats.total) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <span className="text-3xl">😐</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-white/40 bg-white/70 backdrop-blur-xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] p-4">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Filter by Sentiment:</label>
          <select
            value={filterSentiment}
            onChange={(e) => setFilterSentiment(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
          >
            <option value="all">All</option>
            <option value="positive">Positive</option>
            <option value="negative">Negative</option>
            <option value="neutral">Neutral</option>
          </select>
          
          <button
            onClick={fetchSentimentResults}
            className="ml-auto px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm rounded-xl shadow hover:brightness-110"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800 text-sm">{error}</div>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin mx-auto h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          <p className="mt-4 text-gray-600">Loading sentiment data...</p>
        </div>
      ) : (
        /* Responses List */
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Employee Feedback ({responses.length})
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {responses.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                <p>No sentiment responses found.</p>
              </div>
            ) : (
              responses.map((response) => (
                <div key={response.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {response.employeeName}
                        </p>
                        <p className="text-xs text-gray-500">{response.employeeEmail}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getSentimentColor(response.sentimentLabel)}`}>
                        {getSentimentIcon(response.sentimentLabel)}
                        <span className="ml-1 capitalize">{response.sentimentLabel}</span>
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(response.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-2">{response.text}</p>
                  
                  <div className="flex items-center">
                    <span className="text-xs text-gray-500">
                      Confidence: {(response.confidenceScore * 100).toFixed(1)}%
                    </span>
                    <div className="ml-3 flex-1 max-w-xs">
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-blue-600 h-1.5 rounded-full" 
                          style={{ width: `${response.confidenceScore * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
