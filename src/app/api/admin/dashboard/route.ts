import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeFilter = searchParams.get("filter") || "monthly"; // weekly, monthly, yearly
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Pakistan timezone helpers (UTC+5)
    const pakistanOffset = 5 * 60 * 60 * 1000; // 5 hours in milliseconds
    const nowPak = new Date(now.getTime() + pakistanOffset);
    const todayPakistan = new Date(Date.UTC(
      nowPak.getUTCFullYear(),
      nowPak.getUTCMonth(),
      nowPak.getUTCDate(),
      0, 0, 0, 0
    ));
    const todayStartUTC = new Date(todayPakistan.getTime() - pakistanOffset);
    const todayEndUTC = new Date(todayStartUTC.getTime() + (24 * 60 * 60 * 1000) - 1);
    
    // Calculate date ranges
    const getDateRange = (filter: string) => {
      const today = new Date();
      switch (filter) {
        case "weekly":
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - 7);
          return { start: weekStart, end: today };
        case "yearly":
          return {
            start: new Date(today.getFullYear(), 0, 1),
            end: new Date(today.getFullYear(), 11, 31)
          };
        case "monthly":
        default:
          return {
            start: new Date(today.getFullYear(), today.getMonth(), 1),
            end: new Date(today.getFullYear(), today.getMonth() + 1, 0)
          };
      }
    };

    const { start: currentStart, end: currentEnd } = getDateRange(timeFilter);
    
    // Calculate previous period for comparison
    const getPreviousPeriod = (filter: string) => {
      const today = new Date();
      switch (filter) {
        case "weekly":
          const prevWeekStart = new Date(today);
          prevWeekStart.setDate(today.getDate() - 14);
          const prevWeekEnd = new Date(today);
          prevWeekEnd.setDate(today.getDate() - 7);
          return { start: prevWeekStart, end: prevWeekEnd };
        case "yearly":
          return {
            start: new Date(today.getFullYear() - 1, 0, 1),
            end: new Date(today.getFullYear() - 1, 11, 31)
          };
        case "monthly":
        default:
          const prevMonth = today.getMonth() - 1;
          const prevYear = prevMonth < 0 ? today.getFullYear() - 1 : today.getFullYear();
          const month = prevMonth < 0 ? 11 : prevMonth;
          return {
            start: new Date(prevYear, month, 1),
            end: new Date(prevYear, month + 1, 0)
          };
      }
    };

    const { start: prevStart, end: prevEnd } = getPreviousPeriod(timeFilter);

    // 1. EMPLOYEES STATS
    const totalEmployees = await prisma.employee.count();
    const activeEmployees = await prisma.employee.count({
      where: { status: "Active" }
    });
    
    const prevTotalEmployees = await prisma.employee.count({
      where: {
        createdAt: {
          lte: prevEnd
        }
      }
    });
    
    const employeeGrowth = prevTotalEmployees > 0 
      ? ((totalEmployees - prevTotalEmployees) / prevTotalEmployees * 100).toFixed(1)
      : 0;

    // Employees by department
    const employeesByDept = await prisma.employee.groupBy({
      by: ['department'],
      _count: true,
      where: { status: "Active" }
    });

    // 2. LEAVES STATS
    // Get all approved leaves that overlap with today
    const allLeavesToday = await prisma.leave.findMany({
      where: {
        startDate: { lte: todayEndUTC },
        endDate: { gte: todayStartUTC },
        status: { equals: "Approved", mode: "insensitive" }
      },
      include: {
        employee: {
          select: { firstName: true, lastName: true, department: true, id: true }
        }
      }
    });

    // Get unique employees on leave today 
    const uniqueEmployeeIds = [...new Set(allLeavesToday.map(leave => leave.employeeId))];
    const leavesToday = allLeavesToday.filter((leave, index, self) => 
      index === self.findIndex(l => l.employeeId === leave.employeeId)
    );

    const pendingLeaves = await prisma.leave.count({
      where: {
        status: { equals: "Pending", mode: "insensitive" },
        startDate: { gte: currentStart, lte: currentEnd }
      }
    });

    const approvedLeaves = await prisma.leave.count({
      where: {
        status: { equals: "Approved", mode: "insensitive" },
        startDate: { gte: currentStart, lte: currentEnd }
      }
    });

    const rejectedLeaves = await prisma.leave.count({
      where: {
        status: { equals: "Rejected", mode: "insensitive" },
        startDate: { gte: currentStart, lte: currentEnd }
      }
    });

    // Leave types breakdown
    const leavesByType = await prisma.leave.groupBy({
      by: ['type'],
      _count: true,
      where: {
        startDate: { gte: currentStart, lte: currentEnd },
        status: { in: ["Approved", "Pending", "approved", "pending"] }
      }
    });

    // Previous period leaves for comparison
    const prevPendingLeaves = await prisma.leave.count({
      where: {
        status: "Pending",
        startDate: { gte: prevStart, lte: prevEnd }
      }
    });

    const leavesTrend = prevPendingLeaves > 0
      ? ((pendingLeaves - prevPendingLeaves) / prevPendingLeaves * 100).toFixed(1)
      : 0;

    // 3. PAYROLL STATS
    // Get the latest payroll run (most recent one with records)
    const latestPayrollRun = await prisma.payrollRun.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        records: {
          include: {
            employee: {
              select: { firstName: true, lastName: true, department: true }
            }
          }
        }
      }
    });

    const payrollDueCount = latestPayrollRun?.records.filter(r => r.status === "Pending").length || 0;
    const totalPayrollAmount = latestPayrollRun?.records.reduce((sum, r) => sum + r.netPay, 0) || 0;
    const processedPayroll = latestPayrollRun?.records.filter(r => r.status === "Processed").length || 0;

    // Department-wise payroll
    const payrollByDept = latestPayrollRun?.records.reduce((acc: Record<string, { department: string; total: number; count: number }>, record) => {
      const dept = record.department || "Unknown";
      if (!acc[dept]) {
        acc[dept] = { department: dept, total: 0, count: 0 };
      }
      acc[dept].total += record.netPay;
      acc[dept].count += 1;
      return acc;
    }, {});

    // Get previous payroll run for comparison
    const prevPayrollRun = await prisma.payrollRun.findFirst({
      orderBy: { createdAt: 'desc' },
      skip: 1,
      include: {
        records: true
      }
    });

    const prevTotalPayroll = prevPayrollRun?.records.reduce((sum, r) => sum + r.netPay, 0) || 0;
    const payrollTrend = prevTotalPayroll > 0
      ? ((totalPayrollAmount - prevTotalPayroll) / prevTotalPayroll * 100).toFixed(1)
      : 0;

    // 4. ATTENDANCE STATS
    
    const todayAttendance = await prisma.attendance.findMany({
      where: {
        date: {
          gte: todayStartUTC,
          lte: todayEndUTC
        }
      }
    });

    // Get all active employees to calculate absent count correctly
    const allActiveEmployees = await prisma.employee.findMany({
      where: { status: "Active" },
      select: { id: true }
    });
    
    const totalActiveEmployees = allActiveEmployees.length;
    const recordedEmployeeIds = new Set(todayAttendance.map(a => a.employeeId));
    const employeesWithoutRecords = totalActiveEmployees - recordedEmployeeIds.size;

    // Count any status OTHER than "Absent" as present
    const presentToday = todayAttendance.filter(a => a.status !== "Absent").length;
    const lateToday = todayAttendance.filter(a => a.status === "Late").length;
    const absentWithRecord = todayAttendance.filter(a => a.status === "Absent").length;
    const absentToday = absentWithRecord + employeesWithoutRecords; // Total absent = marked absent + no record

    // Attendance corrections pending
    const pendingCorrections = await prisma.attendanceCorrection.count({
      where: { state: "pending" }
    });

    // Attendance trends (last 7 days) - using Pakistan timezone
    const attendanceTrend = await Promise.all(
      Array.from({ length: 7 }, async (_, i) => {
        const datePak = new Date(nowPak.getTime());
        datePak.setUTCDate(datePak.getUTCDate() - (6 - i));
        
        const dayStartPak = new Date(Date.UTC(
          datePak.getUTCFullYear(),
          datePak.getUTCMonth(),
          datePak.getUTCDate(),
          0, 0, 0, 0
        ));
        
        const dayStartUTC = new Date(dayStartPak.getTime() - pakistanOffset);
        const dayEndUTC = new Date(dayStartUTC.getTime() + (24 * 60 * 60 * 1000) - 1);
        
        const records = await prisma.attendance.findMany({
          where: {
            date: {
              gte: dayStartUTC,
              lte: dayEndUTC
            }
          }
        });
        
        const recordedIds = new Set(records.map(r => r.employeeId));
        const withoutRecords = totalActiveEmployees - recordedIds.size;
        const absentMarked = records.filter(a => a.status === "Absent").length;
        
        return {
          date: dayStartPak.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          present: records.filter(a => a.status !== "Absent").length, // Any non-absent status is present
          absent: absentMarked + withoutRecords,
          late: records.filter(a => a.status === "Late").length
        };
      })
    );

    // 5. PERFORMANCE STATS
    const activeReviewCycle = await prisma.reviewCycle.findFirst({
      where: { status: "OPEN" },
      orderBy: { startDate: 'desc' }
    });

    const performanceReviews = await prisma.performanceReview.findMany({
      where: {
        cycleId: activeReviewCycle?.id || 0
      }
    });

    const avgSelfRating = performanceReviews.length > 0
      ? performanceReviews.reduce((sum, r) => sum + (r.selfRating || 0), 0) / performanceReviews.filter(r => r.selfRating).length
      : 0;

    const avgManagerRating = performanceReviews.length > 0
      ? performanceReviews.reduce((sum, r) => sum + (r.managerRating || 0), 0) / performanceReviews.filter(r => r.managerRating).length
      : 0;

    // Performance goals progress
    const goals = await prisma.performanceGoal.findMany({
      where: {
        cycleId: activeReviewCycle?.id || 0
      }
    });

    const avgGoalProgress = goals.length > 0
      ? goals.reduce((sum, g) => sum + g.progress, 0) / goals.length
      : 0;

    // Performance by department
    const performanceByDept = await prisma.employee.findMany({
      where: {
        status: "Active",
        performanceRating: { not: null }
      },
      select: {
        department: true,
        performanceRating: true
      }
    });

    const deptPerformance = performanceByDept.reduce((acc: Record<string, { department: string; ratings: number[]; avgRating: number }>, emp) => {
      const dept = emp.department;
      if (!acc[dept]) {
        acc[dept] = { department: dept, ratings: [], avgRating: 0 };
      }
      if (emp.performanceRating) {
        acc[dept].ratings.push(emp.performanceRating);
      }
      return acc;
    }, {});

    Object.keys(deptPerformance).forEach(dept => {
      const ratings = deptPerformance[dept].ratings;
      deptPerformance[dept].avgRating = ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length;
    });

    // 6. TASKS STATS - Get all tasks (not filtered by date)
    const tasks = await prisma.task.findMany();

    const taskStats = {
      total: tasks.length,
      pending: tasks.filter(t => t.status === "Pending").length,
      inProgress: tasks.filter(t => t.status === "InProgress").length,
      completed: tasks.filter(t => t.status === "Completed").length,
      overdue: tasks.filter(t => t.status !== "Completed" && new Date(t.dueDate) < now).length
    };

    const avgTaskProgress = tasks.length > 0
      ? tasks.reduce((sum, t) => sum + (t.progress || 0), 0) / tasks.length
      : 0;

    // 7. RECRUITMENT STATS
    const activeJobs = await prisma.job.count({
      where: { status: "open" }
    });

    const applications = await prisma.application.findMany({
      where: {
        createdAt: { gte: currentStart, lte: currentEnd }
      }
    });

    const applicationsByStage = await prisma.application.groupBy({
      by: ['stage'],
      _count: true,
      where: {
        createdAt: { gte: currentStart, lte: currentEnd }
      }
    });

    const totalCandidates = await prisma.application.count();

    // 8. REMOTE WORK REQUESTS
    const remoteWorkRequests = await prisma.remoteWorkRequest.findMany({
      where: {
        startDate: { gte: currentStart, lte: currentEnd }
      }
    });

    const pendingRemoteWork = remoteWorkRequests.filter(r => r.state === "pending").length;

    // 9. AI INSIGHTS & PREDICTIONS

    // Calculate date for last 7 days for burnout analysis
    const sevenDaysAgo = new Date(nowPak.getTime());
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
    const sevenDaysAgoUTC = new Date(sevenDaysAgo.getTime() - pakistanOffset);

    // Burnout Risk Detection
    const employeesWithHighWorkload = await prisma.employee.findMany({
      where: {
        status: "Active"
      },
      include: {
        tasksAssignedToMe: {
          where: {
            status: { in: ["Pending", "InProgress"] },
            dueDate: { gte: now }
          }
        },
        attendance: {
          where: {
            date: { gte: sevenDaysAgoUTC },
            status: "Late"
          }
        },
        leaves: {
          where: {
            startDate: { gte: currentStart },
            type: "Sick Leave"
          }
        }
      }
    });

    const burnoutRisks = employeesWithHighWorkload
      .map(emp => {
        const taskCount = emp.tasksAssignedToMe.length;
        const lateCount = emp.attendance.length;
        const sickLeaves = emp.leaves.length;
        const riskScore = (taskCount * 2) + (lateCount * 3) + (sickLeaves * 4);
        
        return {
          id: emp.id,
          name: `${emp.firstName} ${emp.lastName}`,
          department: emp.department,
          riskScore,
          riskLevel: riskScore > 15 ? "high" : riskScore > 8 ? "medium" : "low",
          indicators: {
            activeTasks: taskCount,
            lateAttendance: lateCount,
            sickLeaves
          }
        };
      })
      .filter(e => e.riskScore > 8)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 5);

    // Skill Gaps Analysis
    const allEmployees = await prisma.employee.findMany({
      where: { status: "Active" },
      select: { skills: true, department: true, jobTitle: true }
    });

    const skillFrequency: { [key: string]: number } = {};
    allEmployees.forEach(emp => {
      emp.skills.forEach(skill => {
        skillFrequency[skill] = (skillFrequency[skill] || 0) + 1;
      });
    });

    const commonSkills = ["Python", "JavaScript", "React", "Node.js", "AWS", "Docker", "Kubernetes", "Machine Learning", "Data Analysis", "Project Management"];
    const skillGaps = commonSkills.map(skill => ({
      skill,
      currentCount: skillFrequency[skill] || 0,
      gap: Math.max(0, Math.ceil(totalEmployees * 0.15) - (skillFrequency[skill] || 0))
    }))
    .filter(s => s.gap > 0)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 5);

    // Promotion Candidates
    const promotionCandidates = await prisma.employee.findMany({
      where: {
        status: "Active",
        performanceRating: { gte: 4.0 }
      },
      include: {
        performances: {
          where: {
            periodYear: currentYear,
            periodMonth: { gte: currentMonth - 5 }
          },
          orderBy: { periodMonth: 'desc' },
          take: 6
        },
        performanceReviews: {
          where: {
            cycleId: activeReviewCycle?.id
          }
        }
      }
    });

    const topPerformers = promotionCandidates
      .map(emp => {
        const avgScore = emp.performances.length > 0
          ? emp.performances.reduce((sum, p) => sum + p.score, 0) / emp.performances.length
          : 0;
        
        const managerRating = emp.performanceReviews[0]?.managerRating || 0;
        const consistentScore = emp.performances.filter(p => p.score >= 80).length;
        
        return {
          id: emp.id,
          name: `${emp.firstName} ${emp.lastName}`,
          department: emp.department,
          jobTitle: emp.jobTitle,
          currentRating: emp.performanceRating,
          avgRecentScore: avgScore,
          managerRating,
          consistencyScore: consistentScore,
          readiness: avgScore >= 85 && managerRating >= 4 ? "Ready" : "Developing"
        };
      })
      .filter(e => e.avgRecentScore >= 80)
      .sort((a, b) => b.avgRecentScore - a.avgRecentScore)
      .slice(0, 5);

    // Hiring Forecast
    const recentHires = await prisma.employee.count({
      where: {
        joinDate: { gte: new Date(currentYear, 0, 1) }
      }
    });

    const monthsElapsed = currentMonth + 1;
    const avgHiresPerMonth = recentHires / monthsElapsed;
    const projectedYearEndEmployees = Math.round(totalEmployees + (avgHiresPerMonth * (12 - monthsElapsed)));

    const hiringForecast = {
      currentEmployees: totalEmployees,
      hiresThisYear: recentHires,
      avgPerMonth: avgHiresPerMonth.toFixed(1),
      projectedYearEnd: projectedYearEndEmployees,
      recommendedHires: Math.max(0, skillGaps.reduce((sum, s) => sum + s.gap, 0)),
      focusAreas: skillGaps.slice(0, 3).map(s => s.skill)
    };

    // Performance vs Satisfaction Trend (Last 6 months)
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(currentYear, currentMonth - (5 - i), 1);
      return {
        month: d.toLocaleDateString('en-US', { month: 'short' }),
        year: d.getFullYear(),
        monthNum: d.getMonth() + 1
      };
    });

    const performanceSatisfactionTrend = await Promise.all(
      last6Months.map(async ({ month, year, monthNum }) => {
        const performances = await prisma.performance.findMany({
          where: {
            periodYear: year,
            periodMonth: monthNum
          }
        });

        const avgPerformance = performances.length > 0
          ? performances.reduce((sum, p) => sum + p.score, 0) / performances.length
          : 0;

        // Satisfaction proxy: low leave requests + high attendance
        const leaves = await prisma.leave.count({
          where: {
            startDate: {
              gte: new Date(year, monthNum - 1, 1),
              lte: new Date(year, monthNum, 0)
            },
            type: { not: "Annual Leave" }
          }
        });

        const satisfaction = Math.max(60, 100 - (leaves * 2));

        return {
          month,
          performance: Math.round(avgPerformance),
          satisfaction: Math.round(satisfaction)
        };
      })
    );

    // Response
    return NextResponse.json({
      success: true,
      timeFilter,
      stats: {
        employees: {
          total: totalEmployees,
          active: activeEmployees,
          trend: parseFloat(employeeGrowth as string),
          byDepartment: employeesByDept.map(d => ({
            department: d.department,
            count: d._count
          }))
        },
        leaves: {
          today: leavesToday.length,
          pending: pendingLeaves,
          approved: approvedLeaves,
          rejected: rejectedLeaves,
          trend: parseFloat(leavesTrend as string),
          byType: leavesByType.map(l => ({
            type: l.type,
            count: l._count
          })),
          todayDetails: leavesToday.map(l => ({
            employeeName: `${l.employee.firstName} ${l.employee.lastName}`,
            department: l.employee.department,
            type: l.type,
            startDate: l.startDate,
            endDate: l.endDate
          }))
        },
        payroll: {
          dueCount: payrollDueCount,
          totalAmount: totalPayrollAmount,
          processed: processedPayroll,
          pending: payrollDueCount,
          trend: parseFloat(payrollTrend as string),
          byDepartment: payrollByDept ? Object.values(payrollByDept) : [],
          processingDays: 3 // Static for now
        },
        attendance: {
          today: {
            present: presentToday,
            late: lateToday,
            absent: absentToday,
            total: todayAttendance.length
          },
          pendingCorrections,
          trend: attendanceTrend
        },
        performance: {
          avgSelfRating: avgSelfRating.toFixed(2),
          avgManagerRating: avgManagerRating.toFixed(2),
          avgGoalProgress: avgGoalProgress.toFixed(1),
          activeReviewCycle: activeReviewCycle?.name || "None",
          byDepartment: Object.values(deptPerformance).slice(0, 5),
          trend: performanceSatisfactionTrend
        },
        tasks: {
          ...taskStats,
          avgProgress: avgTaskProgress.toFixed(1)
        },
        recruitment: {
          activeJobs,
          totalApplications: applications.length,
          totalCandidates,
          byStage: applicationsByStage.map(a => ({
            stage: a.stage,
            count: a._count
          }))
        },
        remoteWork: {
          pending: pendingRemoteWork,
          total: remoteWorkRequests.length
        }
      },
      insights: {
        burnoutRisks,
        skillGaps,
        promotionCandidates: topPerformers,
        hiringForecast
      }
    });

  } catch (error) {
    console.error("Admin Dashboard API Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
