// Sentiment Analysis Types

export interface SentimentRequest {
  text: string;
}

export interface SentimentResponse {
  label: 'positive' | 'negative' | 'neutral';
  score: number;
}

export interface SentimentAnalysis {
  id?: string;
  text: string;
  sentiment: SentimentResponse;
  analyzedAt: Date;
  userId?: string;
  source?: 'feedback' | 'review' | 'manual';
}

export interface SentimentApiError {
  error: string;
}

export interface SentimentHealthCheck {
  status: 'ok' | 'error';
  message?: string;
  flaskApi?: {
    status: string;
    timestamp: string;
  };
}

// UI State types
export interface SentimentFormState {
  text: string;
  isLoading: boolean;
  result: SentimentResponse | null;
  error: string | null;
}