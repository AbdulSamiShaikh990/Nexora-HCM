import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Types for dashboard response
interface PerformanceData {
  month: string;
  score: number;
}

interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  halfDayDays: number;
  absentDays: number;
  attendanceRate: number;
}

interface AttendanceTrend {
  month: string;
  date: string;
  present: number;
  halfDay: number;
  absent: number;
}

interface DashboardResponse {
  success: boolean;
  employee: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    department: string;
    jobTitle: string;
  } | null;
  stats: {
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    inProgressTasks: number;
    leavesTaken: number;
    leavesApproved: number;
    leavesPending: number;
    performanceScore: number;
  };
  attendanceStats: AttendanceStats;
  taskTrend: { month: string; completed: number; total: number }[];
  leaveTrend: { month: string; leaves: number }[];
  performanceTrend: PerformanceData[];
  attendanceTrend: AttendanceTrend[];
  tasksByStatus: { name: string; value: number; color: string }[];
  tasksByPriority: { name: string; value: number; color: string }[];
  attendanceByStatus: { name: string; value: number; color: string }[];
}

export async function GET(): Promise<NextResponse<DashboardResponse | { error: string }>> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find employee by user email
    const employee = await prisma.employee.findFirst({
      where: { email: session.user.email.toLowerCase() },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        department: true,
        jobTitle: true,
      },
    });

    if (!employee) {
      return NextResponse.json({
        success: true,
        employee: null,
        stats: {
          totalTasks: 0,
          completedTasks: 0,
          pendingTasks: 0,
          inProgressTasks: 0,
          leavesTaken: 0,
          leavesApproved: 0,
          leavesPending: 0,
          performanceScore: 0,
        },
        attendanceStats: {
          totalDays: 0,
          presentDays: 0,
          halfDayDays: 0,
          absentDays: 0,
          attendanceRate: 0,
        },
        taskTrend: [],
        leaveTrend: [],
        performanceTrend: [],
        attendanceTrend: [],
        tasksByStatus: [],
        tasksByPriority: [],
        attendanceByStatus: [],
      });
    }

    const employeeId = employee.id;
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    // Calculate date range for current month attendance
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0);

    // Fetch all data in parallel
    const [tasks, leaves, performances, attendanceRecords] = await Promise.all([
      prisma.task.findMany({
        where: { assignedToId: employeeId },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.leave.findMany({
        where: { employeeId },
        select: {
          id: true,
          type: true,
          startDate: true,
          endDate: true,
          status: true,
          reason: true,
        },
        orderBy: { startDate: "desc" },
      }),
      prisma.performance.findMany({
        where: { employeeId },
        orderBy: [{ periodYear: "asc" }, { periodMonth: "asc" }],
        take: 12,
      }),
      prisma.attendance.findMany({
        where: { 
          employeeId,
          date: { gte: new Date(currentYear, 0, 1) }, // Get all attendance for current year
        },
        select: {
          id: true,
          date: true,
          checkIn: true,
          checkOut: true,
          status: true,
        },
        orderBy: { date: "desc" },
      }),
    ]);

    // Process tasks data
    const completedTasks = tasks.filter((t) => t.status === "completed").length;
    const pendingTasks = tasks.filter((t) => t.status === "pending").length;
    const inProgressTasks = tasks.filter((t) => t.status === "in_progress" || t.status === "in-progress").length;

    // Tasks by status for pie chart
    const tasksByStatus = [
      { name: "Completed", value: completedTasks, color: "#22c55e" },
      { name: "In Progress", value: inProgressTasks, color: "#f97316" },
      { name: "Pending", value: pendingTasks, color: "#eab308" },
    ].filter((item) => item.value > 0);

    // Tasks by priority for pie chart
    const highPriority = tasks.filter((t) => t.priority === "high").length;
    const mediumPriority = tasks.filter((t) => t.priority === "medium").length;
    const lowPriority = tasks.filter((t) => t.priority === "low").length;
    
    const tasksByPriority = [
      { name: "High", value: highPriority, color: "#ef4444" },
      { name: "Medium", value: mediumPriority, color: "#f97316" },
      { name: "Low", value: lowPriority, color: "#22c55e" },
    ].filter((item) => item.value > 0);

    // Process leaves data for current year
    const thisYearLeaves = leaves.filter(
      (leave) =>
        new Date(leave.startDate).getFullYear() === currentYear
    );
    const approvedLeaves = thisYearLeaves.filter((l) => l.status === "Approved" || l.status === "approved");
    const pendingLeaves = thisYearLeaves.filter((l) => l.status === "Pending" || l.status === "pending");

    // Calculate total leave days taken (approved only)
    const totalLeaveDays = approvedLeaves.reduce((total, leave) => {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return total + days;
    }, 0);

    // Generate monthly task trends (last 6 months)
    const tasksByMonth = new Map<string, { total: number; completed: number }>();
    tasks.forEach((task) => {
      const date = new Date(task.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      
      if (!tasksByMonth.has(monthKey)) {
        tasksByMonth.set(monthKey, { total: 0, completed: 0 });
      }
      
      const monthData = tasksByMonth.get(monthKey)!;
      monthData.total++;
      if (task.status === "completed") monthData.completed++;
    });

    // Generate monthly leave trends
    const leavesByMonth = new Map<string, number>();
    approvedLeaves.forEach((leave) => {
      const date = new Date(leave.startDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      
      if (!leavesByMonth.has(monthKey)) {
        leavesByMonth.set(monthKey, 0);
      }
      
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      leavesByMonth.set(monthKey, leavesByMonth.get(monthKey)! + days);
    });

    // Build trend arrays for last 6 months
    const now = new Date();
    const taskTrend: { month: string; completed: number; total: number }[] = [];
    const leaveTrend: { month: string; leaves: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthName = date.toLocaleString("default", { month: "short" });

      taskTrend.push({
        month: monthName,
        completed: tasksByMonth.get(monthKey)?.completed || 0,
        total: tasksByMonth.get(monthKey)?.total || 0,
      });

      leaveTrend.push({
        month: monthName,
        leaves: leavesByMonth.get(monthKey) || 0,
      });
    }

    // Process performance data
    const performanceTrend: PerformanceData[] = performances.map((p) => ({
      month: new Date(p.periodYear, p.periodMonth - 1).toLocaleString("default", { month: "short" }),
      score: p.score,
    }));

    const avgPerformance =
      performances.length > 0
        ? performances.reduce((sum, p) => sum + p.score, 0) / performances.length
        : 0;

    // Attendance stats for current month
    const currentMonthAttendance = attendanceRecords.filter((a) => {
      const recordDate = new Date(a.date);
      return recordDate >= monthStart && recordDate <= monthEnd;
    });

    const currentMonthPresent = currentMonthAttendance.filter((a) => a.status === "Present").length;
    const currentMonthHalfDay = currentMonthAttendance.filter((a) => a.status === "HalfDay").length;
    const currentMonthAbsent = currentMonthAttendance.filter((a) => a.status === "Absent").length;
    const currentMonthTotal = currentMonthAttendance.length;
    
    const attendanceRate = currentMonthTotal > 0 
      ? Math.round(((currentMonthPresent + currentMonthHalfDay) / currentMonthTotal) * 100) 
      : 0;

    const attendanceStats: AttendanceStats = {
      totalDays: currentMonthTotal,
      presentDays: currentMonthPresent,
      halfDayDays: currentMonthHalfDay,
      absentDays: currentMonthAbsent,
      attendanceRate,
    };

    // Attendance by status for pie chart (current month)
    const attendanceByStatus = [
      { name: "Present", value: currentMonthPresent, color: "#22c55e" },
      { name: "Half Day", value: currentMonthHalfDay, color: "#f97316" },
      { name: "Absent", value: currentMonthAbsent, color: "#ef4444" },
    ].filter((item) => item.value > 0);

    // Generate daily attendance data for current month
    const attendanceByDay = new Map<string, { date: Date; present: number; halfDay: number; absent: number }>();
    currentMonthAttendance.forEach((record) => {
      const date = new Date(record.date);
      const dayKey = date.toISOString().split("T")[0];
      
      if (!attendanceByDay.has(dayKey)) {
        attendanceByDay.set(dayKey, { date, present: 0, halfDay: 0, absent: 0 });
      }
      
      const dayData = attendanceByDay.get(dayKey)!;
      if (record.status === "Present") dayData.present++;
      else if (record.status === "HalfDay") dayData.halfDay++;
      else if (record.status === "Absent") dayData.absent++;
    });

    // Build attendance trend array for current month (daily)
    const attendanceTrend: AttendanceTrend[] = [];
    const sortedDays = Array.from(attendanceByDay.entries()).sort(([a], [b]) => a.localeCompare(b));
    
    sortedDays.forEach(([dayKey, dayData]) => {
      const date = new Date(dayKey);
      attendanceTrend.push({
        month: date.toLocaleString("default", { month: "short" }),
        date: date.getDate().toString(),
        present: dayData.present,
        halfDay: dayData.halfDay,
        absent: dayData.absent,
      });
    });

    return NextResponse.json({
      success: true,
      employee: {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        department: employee.department,
        jobTitle: employee.jobTitle,
      },
      stats: {
        totalTasks: tasks.length,
        completedTasks,
        pendingTasks,
        inProgressTasks,
        leavesTaken: totalLeaveDays,
        leavesApproved: approvedLeaves.length,
        leavesPending: pendingLeaves.length,
        performanceScore: Math.round(avgPerformance * 10) / 10,
      },
      attendanceStats,
      taskTrend,
      leaveTrend,
      performanceTrend,
      attendanceTrend,
      tasksByStatus,
      tasksByPriority,
      attendanceByStatus,
    });
  } catch (error) {
    console.error("[Employee Dashboard API Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
