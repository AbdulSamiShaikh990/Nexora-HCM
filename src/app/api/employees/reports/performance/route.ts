import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Attendance, Performance } from "@prisma/client";

interface TaskRecord {
  id: number;
  title: string;
  status: string;
  createdAt: Date;
  dueDate: Date;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the employee by email
    const employee = await prisma.employee.findUnique({
      where: { email: session.user.email }
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'month';
    
    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    
    switch (range) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    // Fetch performance data (Performance model has score, not rating)
    const performances: Performance[] = await prisma.performance.findMany({
      where: {
        employeeId: employee.id
      },
      orderBy: [
        { periodYear: 'desc' },
        { periodMonth: 'desc' }
      ]
    });

    // Fetch tasks for completion rate
    const tasks: TaskRecord[] = await db.task.findMany({
      where: {
        assignedToId: employee.id,
        createdAt: {
          gte: startDate,
          lte: now
        }
      }
    });

    // Fetch attendance for attendance rate
    const attendance: Attendance[] = await prisma.attendance.findMany({
      where: {
        employeeId: employee.id,
        date: {
          gte: startDate,
          lte: now
        }
      }
    });

    // Calculate KPIs (matching status values: Pending | InProgress | Completed)
    const completedTasks = tasks.filter((t: TaskRecord) => t.status === 'Completed').length;
    const totalTasks = tasks.length;
    const taskCompletion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const presentDays = attendance.filter((a: Attendance) => a.status === 'Present' || a.status === 'Late').length;
    const totalDays = attendance.length;
    const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    // Calculate average quality score from performance reviews (score is 0-100)
    const qualityScore = performances.length > 0
      ? Math.round(performances.reduce((sum: number, p: Performance) => sum + (p.score || 0), 0) / performances.length)
      : (employee.performanceRating ? Math.round(employee.performanceRating * 20) : 0);

    // Format feedback from performance records
    const feedback = performances.slice(0, 5).map((perf: Performance) => ({
      manager: 'Manager',
      date: perf.createdAt,
      comment: `Performance score for ${perf.periodMonth}/${perf.periodYear}`,
      rating: Math.round(perf.score / 20) // Convert 0-100 to 0-5 scale
    }));

    // Add employee feedback if available
    if (employee.feedback) {
      feedback.unshift({
        manager: 'HR Department',
        date: employee.updatedAt,
        comment: employee.feedback,
        rating: employee.performanceRating ? Math.round(employee.performanceRating) : 3
      });
    }

    // Performance trend data based on actual performance records
    const performanceTrend = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date();
      monthDate.setMonth(monthDate.getMonth() - i);
      
      // Find performance record for this month
      const monthPerf = performances.find((p: Performance) => 
        p.periodMonth === (monthDate.getMonth() + 1) && 
        p.periodYear === monthDate.getFullYear()
      );

      // If no performance record, calculate from tasks
      const monthTasks = tasks.filter((t: TaskRecord) => {
        const taskDate = new Date(t.createdAt);
        return taskDate.getMonth() === monthDate.getMonth() && 
               taskDate.getFullYear() === monthDate.getFullYear();
      });
      
      const monthCompleted = monthTasks.filter((t: TaskRecord) => t.status === 'Completed').length;
      const monthTotal = monthTasks.length;
      const taskRate = monthTotal > 0 ? Math.round((monthCompleted / monthTotal) * 100) : 0;
      
      performanceTrend.push({
        month: monthDate.toLocaleDateString('en-US', { month: 'short' }),
        performance: monthPerf ? monthPerf.score : taskRate
      });
    }

    return NextResponse.json({
      taskCompletion,
      attendanceRate,
      qualityScore,
      feedback,
      performanceTrend,
      totalReviews: performances.length,
      employeeRating: employee.performanceRating,
      skills: employee.skills,
      projects: employee.projects
    });

  } catch (error) {
    console.error("Error fetching performance report:", error);
    return NextResponse.json(
      { error: "Failed to fetch performance report" },
      { status: 500 }
    );
  }
}
