import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required text field
    if (!body.text || typeof body.text !== 'string') {
      return NextResponse.json(
        { error: 'Text field is required and must be a string' },
        { status: 400 }
      );
    }

    // Get Flask API URL from environment
    const sentimentApiUrl = process.env.SENTIMENT_API_URL;
    if (!sentimentApiUrl) {
      return NextResponse.json(
        { error: 'Sentiment API URL not configured' },
        { status: 500 }
      );
    }

    // Call Flask API
    const flaskResponse = await fetch(`${sentimentApiUrl}/analyze-sentiment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: body.text }),
    });

    if (!flaskResponse.ok) {
      throw new Error(`Flask API responded with status: ${flaskResponse.status}`);
    }

    const flaskData = await flaskResponse.json();
    
    // Transform Flask response to expected format
    const sentimentLabel = flaskData.result?.sentiment_label || 'neutral';
    const confidence = flaskData.result?.confidence || 0;
    
    // Map sentiment labels to standard format
    let normalizedLabel: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (sentimentLabel.toLowerCase().includes('positive')) {
      normalizedLabel = 'positive';
    } else if (sentimentLabel.toLowerCase().includes('negative')) {
      normalizedLabel = 'negative';
    }
    
    const transformedData = {
      label: normalizedLabel,
      score: confidence
    };
    
    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze sentiment' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  try {
    const sentimentApiUrl = process.env.SENTIMENT_API_URL;
    if (!sentimentApiUrl) {
      return NextResponse.json(
        { status: 'error', message: 'Sentiment API URL not configured' },
        { status: 500 }
      );
    }

    // Check Flask API health
    const healthResponse = await fetch(`${sentimentApiUrl}/health`);
    const healthData = await healthResponse.json();
    
    return NextResponse.json({
      status: 'ok',
      flaskApi: healthData
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', message: 'Flask API not reachable' },
      { status: 503 }
    );
  }
}