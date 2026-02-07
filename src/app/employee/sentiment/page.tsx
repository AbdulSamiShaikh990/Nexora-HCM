'use client';

import { useState, useEffect } from 'react';

interface SentimentFormData {
  text: string;
  isLoading: boolean;
  error: string | null;
  success: boolean;
}

interface ScheduleStatus {
  active: boolean;
  startAt: string | null;
  endAt: string | null;
  remainingMinutes: number;
}

export default function EmployeeSentimentPage() {
  const [formData, setFormData] = useState<SentimentFormData>({
    text: '',
    isLoading: false,
    error: null,
    success: false,
  });

  const [previousSubmissions, setPreviousSubmissions] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sentimentEnabled, setSentimentEnabled] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [scheduleStatus, setScheduleStatus] = useState<ScheduleStatus>({
    active: false,
    startAt: null,
    endAt: null,
    remainingMinutes: 0,
  });

  useEffect(() => {
    fetchSubmissionHistory();
  }, []);

  const fetchSubmissionHistory = async () => {
    setConfigLoading(true);
    try {
      const response = await fetch('/api/sentiment/employee');
      if (response.ok) {
        const data = await response.json();
        setSentimentEnabled(Boolean(data?.enabled));
        setScheduleStatus(data?.scheduleStatus || scheduleStatus);
        setPreviousSubmissions(data.submissions || []);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
      setSentimentEnabled(false);
    } finally {
      setLoadingHistory(false);
      setConfigLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.text.trim()) {
      setFormData(prev => ({ ...prev, error: 'Please enter your feedback' }));
      return;
    }

    setFormData(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null, 
      success: false 
    }));

    try {
      const response = await fetch('/api/sentiment/employee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: formData.text }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit feedback');
      }

      const result = await response.json();
      
      setFormData({ 
        text: '',
        isLoading: false,
        error: null,
        success: true 
      });

      // Refresh history
      fetchSubmissionHistory();

      // Clear success message after 5 seconds
      setTimeout(() => {
        setFormData(prev => ({ ...prev, success: false }));
      }, 5000);
    } catch (error) {
      setFormData(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Something went wrong',
        isLoading: false 
      }));
    }
  };

  const getSentimentColor = (label: string) => {
    switch (label?.toLowerCase()) {
      case 'positive': return 'text-green-600 bg-green-50';
      case 'negative': return 'text-red-600 bg-red-50';
      case 'neutral': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
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

  if (configLoading) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-orange-200/60 bg-white/70 backdrop-blur-xl shadow-[0_10px_30px_rgba(17,24,39,0.06)] p-6">
          <div className="text-center py-8">
            <div className="animate-spin mx-auto h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
            <p className="mt-2 text-sm text-gray-600">Loading sentiment configuration...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!sentimentEnabled) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-orange-200/60 bg-gradient-to-r from-orange-50/80 via-white/70 to-orange-100/60 backdrop-blur-xl shadow-[0_10px_30px_rgba(251,146,60,0.15)] p-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center shadow-lg">
              🔒
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Sentiment Feedback</h1>
              <p className="mt-1 text-sm text-gray-700">
                {scheduleStatus.startAt
                  ? `Sentiment window is scheduled for ${new Date(scheduleStatus.startAt).toLocaleString()}.`
                  : 'Sentiment window is not scheduled yet. Please check back later.'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-orange-200/60 bg-white/70 backdrop-blur-xl shadow-[0_10px_30px_rgba(17,24,39,0.06)] p-6">
          <p className="text-sm text-gray-600">
            Once the window opens, you can submit feedback one time only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-orange-200/60 bg-gradient-to-r from-orange-50/80 via-white/70 to-orange-100/60 backdrop-blur-xl shadow-[0_10px_30px_rgba(251,146,60,0.15)] p-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center shadow-lg">
            💬
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Sentiment Feedback</h1>
            <p className="mt-1 text-sm text-gray-700">
              Share your thoughts and feedback. Your responses help improve our workplace.
            </p>
          </div>
        </div>
      </div>

      {/* Feedback Form */}
      <div className="rounded-2xl border border-orange-200/60 bg-white/70 backdrop-blur-xl shadow-[0_10px_30px_rgba(17,24,39,0.06)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Submit Your Feedback</h2>
          <span className="text-xs font-medium text-orange-700 bg-orange-100/80 px-2.5 py-1 rounded-full">Anonymous</span>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="text" className="block text-sm font-medium text-gray-700">
              Your Feedback
            </label>
            <textarea
              id="text"
              rows={6}
              className="mt-2 block w-full rounded-xl border border-orange-200/70 bg-white/70 px-4 py-3 shadow-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-200 transition"
              placeholder="Share your thoughts about work environment, team collaboration, management, or anything else on your mind..."
              value={formData.text}
              onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
              disabled={formData.isLoading}
            />
            <p className="mt-1 text-xs text-gray-500">
              Your feedback is anonymous and will help us understand team sentiment.
            </p>
          </div>

          <button
            type="submit"
            disabled={formData.isLoading || !formData.text.trim()}
            className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-semibold rounded-xl shadow-lg text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {formData.isLoading ? (
              <>
                <div className="animate-spin -ml-1 mr-3 h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                Submitting...
              </>
            ) : (
              'Submit Feedback'
            )}
          </button>
        </form>

        {/* Success Message */}
        {formData.success && (
          <div className="mt-4 p-4 bg-green-50/80 border border-green-200 rounded-xl backdrop-blur">
            <div className="flex items-center">
              <span className="text-green-600 mr-2">✓</span>
              <div className="text-green-800 text-sm">
                Thank you! Your feedback has been submitted successfully.
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {formData.error && (
          <div className="mt-4 p-4 bg-red-50/80 border border-red-200 rounded-xl backdrop-blur">
            <div className="text-red-800 text-sm">{formData.error}</div>
          </div>
        )}
      </div>

      {/* Previous Submissions */}
      <div className="rounded-2xl border border-orange-200/60 bg-white/70 backdrop-blur-xl shadow-[0_10px_30px_rgba(17,24,39,0.06)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Your Previous Feedback</h2>
          <span className="text-xs text-gray-500">Last 20 responses</span>
        </div>
        
        {loadingHistory ? (
          <div className="text-center py-8">
            <div className="animate-spin mx-auto h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
            <p className="mt-2 text-sm text-gray-600">Loading your submissions...</p>
          </div>
        ) : previousSubmissions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No previous feedback submitted yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {previousSubmissions.map((submission) => (
              <div key={submission.id} className="border border-orange-200/60 rounded-2xl p-4 bg-white/70 backdrop-blur-xl shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getSentimentColor(submission.sentimentLabel)}`}>
                      {getSentimentIcon(submission.sentimentLabel)}
                      <span className="ml-1 capitalize">{submission.sentimentLabel}</span>
                    </span>
                    <span className="ml-3 text-sm text-gray-500">
                      Confidence: {(submission.confidenceScore * 100).toFixed(0)}%
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(submission.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{submission.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Guidelines */}
      <div className="rounded-2xl border border-orange-200/60 bg-gradient-to-br from-orange-50/80 to-white/70 backdrop-blur-xl p-6 shadow-[0_10px_30px_rgba(251,146,60,0.12)]">
        <h3 className="text-sm font-semibold text-orange-900 mb-2">Feedback Guidelines</h3>
        <ul className="text-sm text-orange-800 space-y-1">
          <li>• Be honest and constructive</li>
          <li>• Focus on specific experiences or observations</li>
          <li>• Your feedback helps create a better workplace for everyone</li>
          <li>• All feedback is reviewed by management to identify improvement areas</li>
        </ul>
      </div>
    </div>
  );
}
