import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Attendance } from "@prisma/client";

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
    const customStartDate = searchParams.get('startDate');
    const customEndDate = searchParams.get('endDate');
    
    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date(now);
    
    // Use custom dates if provided, otherwise use range
    if (customStartDate && customEndDate) {
      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate);
    } else {
      // Reset to start of day
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      
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
    }

    // Fetch attendance records
    const records = await prisma.attendance.findMany({
      where: {
        employeeId: employee.id,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    // Calculate working days in the range (excluding weekends)
    const getWorkingDays = (start: Date, end: Date): number => {
      let count = 0;
      const current = new Date(start);
      while (current <= end) {
        const dayOfWeek = current.getDay();
        // 0 = Sunday, 6 = Saturday - skip weekends
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          count++;
        }
        current.setDate(current.getDate() + 1);
      }
      return count;
    };

    const totalWorkingDays = getWorkingDays(startDate, endDate);
    const recordedDays = records.length;
    
    // Get all unique statuses from the database
    const statusCounts: Record<string, number> = {};
    records.forEach((r: Attendance) => {
      const status = r.status.toLowerCase();
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    // Calculate counts for each status type (case-insensitive matching)
    const lateDays = records.filter((r: Attendance) => 
      r.status.toLowerCase() === 'late'
    ).length;
    
    const halfDays = records.filter((r: Attendance) => 
      r.status.toLowerCase() === 'half-day' || r.status.toLowerCase() === 'halfday'
    ).length;
    
    // Absent = days with explicit absent status + days with no attendance record
    const markedAbsentDays = records.filter((r: Attendance) => 
      r.status.toLowerCase() === 'absent'
    ).length;
    
    // Days without any attendance record = working days - recorded days
    const unmarkedDays = Math.max(0, totalWorkingDays - recordedDays);
    const absentDays = markedAbsentDays + unmarkedDays;

    // Calculate attendance rate (late + half-day + present = attended)
    const attendedDays = recordedDays - markedAbsentDays;
    const attendanceRate = totalWorkingDays > 0 ? Math.round((attendedDays / totalWorkingDays) * 100) : 0;

    // Calculate hours worked
    const calculateHours = (checkIn: Date | null, checkOut: Date | null): number => {
      if (!checkIn || !checkOut) return 0;
      const diff = checkOut.getTime() - checkIn.getTime();
      return Math.round((diff / (1000 * 60 * 60)) * 10) / 10;
    };

    // Create a map of attendance records by date for quick lookup
    const recordsByDate: Record<string, Attendance> = {};
    records.forEach((record: Attendance) => {
      const dateKey = new Date(record.date).toISOString().split('T')[0];
      recordsByDate[dateKey] = record;
    });

    // Generate all dates in the range (including weekends for complete view)
    const allDatesInRange: Date[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      allDatesInRange.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    // Format all records with gaps filled as "Absent" or "No Record"
    const allFormattedRecords = allDatesInRange.reverse().map((date: Date) => {
      const dateKey = date.toISOString().split('T')[0];
      const record = recordsByDate[dateKey];
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      if (record) {
        // Record exists
        return {
          date: record.date,
          status: record.status,
          hoursWorked: calculateHours(record.checkIn, record.checkOut),
          checkIn: record.checkIn ? new Date(record.checkIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : null,
          checkOut: record.checkOut ? new Date(record.checkOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : null
        };
      } else if (isWeekend) {
        // Weekend
        return {
          date: date,
          status: 'Weekend',
          hoursWorked: 0,
          checkIn: null,
          checkOut: null
        };
      } else {
        // Working day with no record = Absent
        return {
          date: date,
          status: 'Absent',
          hoursWorked: 0,
          checkIn: null,
          checkOut: null
        };
      }
    });

    // Prepare chart data only from actual records
    const chartData = records.slice(0, 30).reverse().map((record: Attendance) => ({
      date: new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      hours: calculateHours(record.checkIn, record.checkOut),
      status: record.status
    }));

    return NextResponse.json({
      totalWorkingDays,
      recordedDays,
      absentDays,
      lateDays,
      halfDays,
      attendedDays,
      attendanceRate,
      statusCounts,
      chartData,
      records: allFormattedRecords
    });

  } catch (error) {
    console.error("Error fetching attendance report:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance report" },
      { status: 500 }
    );
  }
}
