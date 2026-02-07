import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';

type SentimentScheduleState = {
  startAt: string | null;
  durationMinutes: number | null;
};

const globalForSentiment = globalThis as unknown as { __sentimentSchedule?: SentimentScheduleState };
const sentimentSchedule = globalForSentiment.__sentimentSchedule ?? { startAt: null, durationMinutes: null };
if (!globalForSentiment.__sentimentSchedule) {
  globalForSentiment.__sentimentSchedule = sentimentSchedule;
}

const getScheduleStatus = () => {
  const { startAt, durationMinutes } = sentimentSchedule;
  if (!startAt || !durationMinutes || durationMinutes <= 0) {
    return { active: false, startAt: null, endAt: null, remainingMinutes: 0 };
  }

  const start = new Date(startAt);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const now = new Date();
  const active = now >= start && now <= end;
  const remainingMinutes = active ? Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 60000)) : 0;

  return { active, startAt: start.toISOString(), endAt: end.toISOString(), remainingMinutes };
};

// POST - Employee submits sentiment feedback
export async function POST(request: NextRequest) {
  try {
    const scheduleStatus = getScheduleStatus();
    if (!scheduleStatus.active || !scheduleStatus.startAt || !scheduleStatus.endAt) {
      return NextResponse.json(
        { error: 'Sentiment window is not active' },
        { status: 403 }
      );
    }

    // Get user session
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate required text field
    if (!body.text || typeof body.text !== 'string' || !body.text.trim()) {
      return NextResponse.json(
        { error: 'Text field is required' },
        { status: 400 }
      );
    }

    // Get employee details
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
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

    // Call Flask API for sentiment analysis
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
    
    // Transform Flask response
    const sentimentLabel = flaskData.result?.sentiment_label || 'neutral';
    const confidence = flaskData.result?.confidence || 0;
    
    // Map sentiment labels to standard format
    let normalizedLabel: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (sentimentLabel.toLowerCase().includes('positive')) {
      normalizedLabel = 'positive';
    } else if (sentimentLabel.toLowerCase().includes('negative')) {
      normalizedLabel = 'negative';
    }

    // Ensure one-time submission per active window
    const alreadySubmitted = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS count
      FROM "SentimentResponse"
      WHERE "employeeEmail" = ${session.user.email}
        AND "createdAt" >= ${new Date(scheduleStatus.startAt)}
        AND "createdAt" <= ${new Date(scheduleStatus.endAt)}
    ` as Array<{ count: number }>;

    const hasSubmitted = Array.isArray(alreadySubmitted) && Number(alreadySubmitted[0]?.count) > 0;
    if (hasSubmitted) {
      return NextResponse.json(
        { error: 'You have already submitted feedback for this session' },
        { status: 409 }
      );
    }

    // Store in database using raw query
    const sentimentResponse = await prisma.$queryRaw`
      INSERT INTO "SentimentResponse" (
        "employeeId", "employeeName", "employeeEmail", "text", 
        "sentimentLabel", "confidenceScore", "createdAt", "updatedAt"
      ) VALUES (
        ${parseInt(user.id) || 0}, ${user.name || 'Unknown'}, ${user.email || ''}, 
        ${body.text.trim()}, ${normalizedLabel}, ${confidence}, 
        NOW(), NOW()
      ) RETURNING *
    ` as any;

    const response = Array.isArray(sentimentResponse) ? sentimentResponse[0] : sentimentResponse;

    return NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully',
      data: {
        id: response?.id,
        sentimentLabel: normalizedLabel,
        confidenceScore: confidence,
      }
    });
  } catch (error) {
    console.error('Sentiment submission error:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}

// GET - Employee fetches their own submission history
export async function GET(request: NextRequest) {
  try {
    const scheduleStatus = getScheduleStatus();
    const enabled = scheduleStatus.active;

    // Get user session
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's previous submissions using raw query
    const submissions = enabled ? await prisma.$queryRaw`
      SELECT * FROM "SentimentResponse" 
      WHERE "employeeEmail" = ${session.user.email}
      ORDER BY "createdAt" DESC
      LIMIT 20
    ` as any[] : [];

    return NextResponse.json({
      success: true,
      enabled,
      scheduleStatus,
      submissions
    });
  } catch (error) {
    console.error('Failed to fetch sentiment history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}
