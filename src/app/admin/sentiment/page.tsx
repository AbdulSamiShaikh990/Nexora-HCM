'use client';

import { useState, useEffect } from 'react';
import {
  BarChart3,
  CalendarDays,
  CircleDot,
  Filter,
  Frown,
  RefreshCw,
  Smile,
  Sparkles,
  Meh,
} from 'lucide-react';

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
      case 'positive': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'negative': return 'text-rose-700 bg-rose-50 border-rose-200';
      case 'neutral': return 'text-slate-700 bg-slate-50 border-slate-200';
      default: return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  const getSentimentIcon = (label: string) => {
    switch (label?.toLowerCase()) {
      case 'positive': return <Smile className="h-4 w-4" />;
      case 'negative': return <Frown className="h-4 w-4" />;
      case 'neutral': return <Meh className="h-4 w-4" />;
      default: return <CircleDot className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-cyan-600/10 to-teal-600/10"></div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5YzkyYWMiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
      <div className="relative z-10 w-full px-3 sm:px-5 lg:px-8 py-4 sm:py-6 space-y-6">
      <div className="backdrop-blur-xl bg-white/60 rounded-3xl border border-white/40 shadow-xl p-5 sm:p-6 lg:p-8">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 text-white flex items-center justify-center shadow-lg">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">Sentiment Analysis Dashboard</h1>
            <p className="mt-2 text-sm text-slate-700 font-medium">Monitor employee feedback and sentiment trends.</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/40 bg-white/60 backdrop-blur-xl shadow-xl p-5 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/5 via-cyan-500/5 to-teal-500/5"></div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 text-white flex items-center justify-center shadow-md">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-900">Schedule Sentiment Window</p>
              <p className="text-xs text-slate-500">Employees can submit once during the scheduled window.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Start</label>
              <input
                type="datetime-local"
                value={scheduleStart}
                onChange={(e) => setScheduleStart(e.target.value)}
                className="rounded-2xl border border-white/40 bg-white/80 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Minutes</label>
              <input
                type="number"
                min={5}
                value={scheduleDuration}
                onChange={(e) => setScheduleDuration(Number(e.target.value))}
                className="w-full rounded-2xl border border-white/40 bg-white/80 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleScheduleSave}
                disabled={savingSchedule}
                className="w-full px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm rounded-2xl shadow hover:brightness-110 disabled:opacity-60"
              >
                {savingSchedule ? 'Saving...' : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
        <div className="relative z-10 mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-slate-500">Status</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] ${scheduleStatus.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
              {scheduleStatus.active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-slate-500">Remaining</span>
            <span className="font-medium text-slate-700">{scheduleStatus.active ? `${scheduleStatus.remainingMinutes} min` : '—'}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-slate-500">Start</span>
            <span className="font-medium text-slate-700">
              {scheduleStatus.startAt ? new Date(scheduleStatus.startAt).toLocaleString() : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-slate-500">Responses</span>
            <span className="font-medium text-slate-700">{windowResponses}</span>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-white/40 bg-white/70 backdrop-blur-xl shadow-xl p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-cyan-500/5 to-teal-500/5"></div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Responses</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="rounded-3xl border border-emerald-200/60 bg-emerald-50/70 backdrop-blur-xl shadow-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-emerald-700">Positive</p>
              <p className="text-2xl font-bold text-emerald-900">{stats.positive}</p>
              <p className="text-xs text-emerald-600">
                {stats.total > 0 ? ((stats.positive / stats.total) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <Smile className="h-8 w-8 text-emerald-600" />
          </div>
        </div>

        <div className="rounded-3xl border border-rose-200/60 bg-rose-50/70 backdrop-blur-xl shadow-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-rose-700">Negative</p>
              <p className="text-2xl font-bold text-rose-900">{stats.negative}</p>
              <p className="text-xs text-rose-600">
                {stats.total > 0 ? ((stats.negative / stats.total) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <Frown className="h-8 w-8 text-rose-600" />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/60 bg-slate-50/70 backdrop-blur-xl shadow-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-700">Neutral</p>
              <p className="text-2xl font-bold text-slate-900">{stats.neutral}</p>
              <p className="text-xs text-slate-600">
                {stats.total > 0 ? ((stats.neutral / stats.total) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <Meh className="h-8 w-8 text-slate-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-3xl border border-white/40 bg-white/70 backdrop-blur-xl shadow-xl p-4">
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-sm font-semibold text-slate-700 inline-flex items-center gap-2">
            <Filter className="h-4 w-4 text-blue-600" />
            Filter by Sentiment:
          </label>
          <select
            value={filterSentiment}
            onChange={(e) => setFilterSentiment(e.target.value)}
            className="rounded-2xl border border-white/40 bg-white/80 px-3 py-2 text-sm text-slate-900 focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
          >
            <option value="all">All</option>
            <option value="positive">Positive</option>
            <option value="negative">Negative</option>
            <option value="neutral">Neutral</option>
          </select>
          
          <button
            onClick={fetchSentimentResults}
            className="ml-auto inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm rounded-2xl shadow hover:brightness-110"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-rose-800 text-sm">{error}</div>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-xl p-8 text-center border border-white/40">
          <div className="animate-spin mx-auto h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          <p className="mt-4 text-slate-600">Loading sentiment data...</p>
        </div>
      ) : (
        /* Responses List */
        <div className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-xl border border-white/40">
          <div className="px-6 py-4 border-b border-white/40 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Employee Feedback ({responses.length})
            </h2>
            <span className="text-xs text-slate-500 inline-flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              Live sentiment feed
            </span>
          </div>
          
          <div className="divide-y divide-white/40">
            {responses.length === 0 ? (
              <div className="px-6 py-8 text-center text-slate-500">
                <p>No sentiment responses found.</p>
              </div>
            ) : (
              responses.map((response) => (
                <div key={response.id} className="px-6 py-4 hover:bg-white/70">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {response.employeeName}
                        </p>
                        <p className="text-xs text-slate-500">{response.employeeEmail}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getSentimentColor(response.sentimentLabel)}`}>
                        {getSentimentIcon(response.sentimentLabel)}
                        <span className="ml-1 capitalize">{response.sentimentLabel}</span>
                      </span>
                      <span className="text-xs text-slate-500">
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
                  
                  <p className="text-sm text-slate-700 mb-2">{response.text}</p>
                  
                  <div className="flex items-center">
                    <span className="text-xs text-slate-500">
                      Confidence: {(response.confidenceScore * 100).toFixed(1)}%
                    </span>
                    <div className="ml-3 flex-1 max-w-xs">
                      <div className="w-full bg-slate-200 rounded-full h-1.5">
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
    </div>
  );
}
