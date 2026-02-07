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

const getSchedule = () => ({ ...sentimentSchedule });
const setSchedule = (startAt: string | null, durationMinutes: number | null) => {
  sentimentSchedule.startAt = startAt;
  sentimentSchedule.durationMinutes = durationMinutes;
};

const getScheduleStatus = () => {
  const { startAt, durationMinutes } = getSchedule();
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

// GET - Admin fetches all sentiment responses with filters
export async function GET(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const sentiment = searchParams.get('sentiment');
    const employeeEmail = searchParams.get('email');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where conditions
    let whereConditions = [];
    const params: any[] = [];
    
    if (sentiment && sentiment !== 'all') {
      whereConditions.push(`"sentimentLabel" = $${params.length + 1}`);
      params.push(sentiment);
    }
    
    if (employeeEmail) {
      whereConditions.push(`"employeeEmail" = $${params.length + 1}`);
      params.push(employeeEmail);
    }
    
    if (startDate) {
      whereConditions.push(`"createdAt" >= $${params.length + 1}`);
      params.push(new Date(startDate));
    }
    
    if (endDate) {
      whereConditions.push(`"createdAt" <= $${params.length + 1}`);
      params.push(new Date(endDate));
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Get all sentiment responses using raw query
    const responses = await prisma.$queryRawUnsafe(`
      SELECT * FROM "SentimentResponse" 
      ${whereClause}
      ORDER BY "createdAt" DESC
    `, ...params) as any[];

    // Get statistics
    const stats = {
      total: responses.length,
      positive: responses.filter((r: any) => r.sentimentLabel === 'positive').length,
      negative: responses.filter((r: any) => r.sentimentLabel === 'negative').length,
      neutral: responses.filter((r: any) => r.sentimentLabel === 'neutral').length,
      averageConfidence: responses.length > 0 
        ? responses.reduce((sum: number, r: any) => sum + r.confidenceScore, 0) / responses.length 
        : 0
    };

    const scheduleStatus = getScheduleStatus();

    const windowCount = scheduleStatus.startAt && scheduleStatus.endAt
      ? await prisma.$queryRaw`
          SELECT COUNT(*)::int AS count
          FROM "SentimentResponse"
          WHERE "createdAt" >= ${new Date(scheduleStatus.startAt)}
            AND "createdAt" <= ${new Date(scheduleStatus.endAt)}
        `
      : [{ count: 0 }];

    const windowResponses = Array.isArray(windowCount) && windowCount[0]?.count ? Number(windowCount[0].count) : 0;

    return NextResponse.json({
      success: true,
      schedule: getSchedule(),
      scheduleStatus,
      windowResponses,
      responses,
      stats
    });
  } catch (error) {
    console.error('Failed to fetch sentiment responses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sentiment data' },
      { status: 500 }
    );
  }
}

// PUT - Admin schedules sentiment window
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const startAt = typeof body?.startAt === 'string' && body.startAt ? body.startAt : null;
    const durationMinutes = typeof body?.durationMinutes === 'number' && body.durationMinutes > 0
      ? Math.floor(body.durationMinutes)
      : null;

    setSchedule(startAt, durationMinutes);
    const scheduleStatus = getScheduleStatus();

    return NextResponse.json({
      success: true,
      schedule: getSchedule(),
      scheduleStatus
    });
  } catch (error) {
    console.error('Failed to update sentiment setting:', error);
    return NextResponse.json(
      { error: 'Failed to update sentiment setting' },
      { status: 500 }
    );
  }
}
