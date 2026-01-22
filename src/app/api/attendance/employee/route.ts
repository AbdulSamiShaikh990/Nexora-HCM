import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Office location for geographic fencing (Islamabad area)
const OFFICE_LOCATION = {
  latitude: 33.63,
  longitude: 72.92,
  radiusMeters: 600, // 500m radius for check-in
};

// Shift times
const SHIFT_START = "09:00";
const LATE_THRESHOLD_MINUTES = 15; // Late if > 15 mins after shift start
const HALF_DAY_HOURS = 4; // Less than 4 hours = half-day

// Haversine formula to calculate distance between two coordinates
function getDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper: Format time to 12-hour clock with AM/PM (Pakistan time)
function formatTime(date: Date): string {
  // Get Pakistan time (UTC+5)
  const pakTime = getPakistanTime(date);
  const hours = pakTime.hours;
  const minutes = pakTime.minutes;
  
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const meridiem = hours >= 12 ? "PM" : "AM";
  const minStr = String(minutes).padStart(2, "0");
  
  return `${String(hour12).padStart(2, "0")}:${minStr} ${meridiem}`;
}

// Helper: Format date to YYYY-MM-DD in Pakistan timezone
function formatDate(date: Date): string {
  // Convert to Pakistan time (UTC+5) and format
  const pakistanTime = new Date(date.getTime() + (5 * 60 * 60 * 1000));
  const year = pakistanTime.getUTCFullYear();
  const month = String(pakistanTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(pakistanTime.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper: Get Pakistan time from UTC
function getPakistanTime(date: Date): { hours: number; minutes: number } {
  // Pakistan is UTC+5
  const utcHours = date.getUTCHours();
  const utcMinutes = date.getUTCMinutes();
  let pakHours = utcHours + 5;
  if (pakHours >= 24) pakHours -= 24;
  return { hours: pakHours, minutes: utcMinutes };
}

// Helper: Calculate hours worked
function calculateHoursWorked(checkIn: Date | null, checkOut: Date | null): number {
  if (!checkIn || !checkOut) return 0;
  return (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
}

// Helper: Determine status based on check-in time (Pakistan timezone)
function determineStatus(checkIn: Date): "present" | "late" {
  const [shiftH, shiftM] = SHIFT_START.split(":").map(Number);
  const shiftStartMinutes = shiftH * 60 + shiftM;
  
  // Get Pakistan time
  const pakTime = getPakistanTime(checkIn);
  const checkInMinutes = pakTime.hours * 60 + pakTime.minutes;
  
  if (checkInMinutes > shiftStartMinutes + LATE_THRESHOLD_MINUTES) {
    return "late";
  }
  return "present";
}

// GET /api/attendance/employee - Get employee's attendance data
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get employee by email
    const employee = await prisma.employee.findFirst({
      where: { email: session.user.email },
    });

    if (!employee) {
      // Return demo data for users without employee record
      return NextResponse.json({
        employee: {
          id: 0,
          name: session.user.name || "Demo User",
          email: session.user.email,
        },
        today: null,
        summary: {
          totalHours: 62.3,
          avgHours: 7.8,
          attendanceRate: 62.5,
          overtimeHours: 2.0,
          presentDays: 15,
          lateDays: 3,
          absentDays: 2,
          halfDays: 1,
        },
        records: [],
        corrections: [],
      });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // YYYY-MM format
    const year = searchParams.get("year");
    const customStartDate = searchParams.get("startDate"); // YYYY-MM-DD format
    const customEndDate = searchParams.get("endDate"); // YYYY-MM-DD format
    
    // Default to current month
    const now = new Date();
    let targetYear = now.getUTCFullYear();
    let targetMonth = now.getUTCMonth();

    if (month) {
      const [mYear, mMonth] = month.split("-").map((v) => parseInt(v, 10));
      if (!Number.isNaN(mYear)) targetYear = mYear;
      if (!Number.isNaN(mMonth)) targetMonth = mMonth - 1;
    }

    if (year) {
      const parsedYear = parseInt(year, 10);
      if (!Number.isNaN(parsedYear)) targetYear = parsedYear;
    }
    
    // Use custom date range if provided, otherwise use month range
    let startOfMonth: Date;
    let endOfMonth: Date;
    
    if (customStartDate && customEndDate) {
      // Custom date range provided
      const [sYear, sMonth, sDay] = customStartDate.split("-").map(Number);
      const [eYear, eMonth, eDay] = customEndDate.split("-").map(Number);
      startOfMonth = new Date(Date.UTC(sYear, sMonth - 1, sDay, 0, 0, 0));
      endOfMonth = new Date(Date.UTC(eYear, eMonth - 1, eDay, 23, 59, 59));
    } else if (customStartDate) {
      // Only start date provided - use start date to end of month
      const [sYear, sMonth, sDay] = customStartDate.split("-").map(Number);
      startOfMonth = new Date(Date.UTC(sYear, sMonth - 1, sDay, 0, 0, 0));
      endOfMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0, 23, 59, 59));
    } else if (customEndDate) {
      // Only end date provided - use start of month to end date
      startOfMonth = new Date(Date.UTC(targetYear, targetMonth, 1, 0, 0, 0));
      const [eYear, eMonth, eDay] = customEndDate.split("-").map(Number);
      endOfMonth = new Date(Date.UTC(eYear, eMonth - 1, eDay, 23, 59, 59));
    } else {
      // No custom dates - use full month
      startOfMonth = new Date(Date.UTC(targetYear, targetMonth, 1, 0, 0, 0));
      endOfMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0, 23, 59, 59));
    }
    
    // Today's date for current status - use Pakistan timezone (UTC+5)
    // Pakistan midnight = UTC time - 5 hours at 00:00
    const pakistanOffset = 5 * 60 * 60 * 1000; // 5 hours in milliseconds
    const nowInPakistan = new Date(now.getTime() + pakistanOffset);
    
    // Get today's date in Pakistan timezone
    const pakYear = nowInPakistan.getUTCFullYear();
    const pakMonth = nowInPakistan.getUTCMonth();
    const pakDay = nowInPakistan.getUTCDate();
    
    // Create Pakistan midnight in UTC (subtract 5 hours from Pakistan midnight)
    const todayStart = new Date(Date.UTC(pakYear, pakMonth, pakDay, 0, 0, 0, 0));
    todayStart.setTime(todayStart.getTime() - pakistanOffset);
    
    const todayEnd = new Date(todayStart.getTime() + (24 * 60 * 60 * 1000) - 1);

    // Get today's attendance
    const todayAttendance = await prisma.attendance.findFirst({
      where: {
        employeeId: employee.id,
        date: { gte: todayStart, lte: todayEnd },
      },
    });

    // Get monthly records
    const monthlyRecords = await prisma.attendance.findMany({
      where: {
        employeeId: employee.id,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      orderBy: { date: "desc" },
    });

    // Get correction requests
    const corrections = await prisma.attendanceCorrection.findMany({
      where: {
        employeeId: employee.id,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate summary statistics
    let totalMinutes = 0;
    let overtimeMinutes = 0;
    let presentDays = 0;
    let lateDays = 0;
    let absentDays = 0;
    let halfDays = 0;

    monthlyRecords.forEach((record) => {
      const status = (record.status || "").toLowerCase();
      if (status === "present") presentDays++;
      else if (status === "late") lateDays++;
      else if (status === "absent") absentDays++;

      if (record.checkIn && record.checkOut) {
        const hoursWorked = calculateHoursWorked(record.checkIn, record.checkOut);
        totalMinutes += hoursWorked * 60;

        if (hoursWorked < HALF_DAY_HOURS && hoursWorked > 0) {
          halfDays++;
        }

        // Overtime: only count when total hours worked > 8 hours
        // Overtime = total hours - 8
        if (hoursWorked > 8) {
          overtimeMinutes += (hoursWorked - 8) * 60;
        }
      }
    });

    // Calculate total working days in the date range (exclude weekends)
    // Only count up to today - don't count future dates
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    const countUntil = endOfMonth < today ? endOfMonth : today;
    
    let totalWorkingDays = 0;
    const currentDate = new Date(startOfMonth);
    while (currentDate <= countUntil) {
      const dayOfWeek = currentDate.getDay();
      // Count weekdays only (Monday to Friday)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        totalWorkingDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Absent days = total working days - days with records
    const recordedDays = presentDays + lateDays + absentDays + halfDays;
    const actualAbsentDays = Math.max(0, totalWorkingDays - recordedDays + absentDays);
    
    const workingDays = presentDays + lateDays + halfDays;
    const attendanceRate = totalWorkingDays > 0 ? ((workingDays / totalWorkingDays) * 100) : 0;

    // Generate all dates in range and mark absent days
    const allDates: Array<{
      id: number;
      date: string;
      checkIn: string | null;
      checkOut: string | null;
      totalHours: number;
      overtime: number;
      breakTime: number;
      status: string;
    }> = [];
    
    const datePointer = new Date(startOfMonth);
    let recordIndex = 0;
    
    while (datePointer <= countUntil) {
      const dayOfWeek = datePointer.getDay();
      const dateStr = formatDate(datePointer);
      
      // Skip weekends
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const existingRecord = monthlyRecords.find(r => formatDate(r.date) === dateStr);
        
        if (existingRecord) {
          const hoursWorked = calculateHoursWorked(existingRecord.checkIn, existingRecord.checkOut);
          let otMinutes = 0;
          if (hoursWorked > 8) {
            otMinutes = (hoursWorked - 8) * 60;
          }
          
          allDates.push({
            id: existingRecord.id,
            date: dateStr,
            checkIn: existingRecord.checkIn ? formatTime(existingRecord.checkIn) : null,
            checkOut: existingRecord.checkOut ? formatTime(existingRecord.checkOut) : null,
            totalHours: Math.round(hoursWorked * 100) / 100,
            overtime: Math.round((otMinutes / 60) * 100) / 100,
            breakTime: 1,
            status: (existingRecord.status || "").toLowerCase(),
          });
        } else {
          // No record for this working day = absent
          allDates.push({
            id: recordIndex++,
            date: dateStr,
            checkIn: null,
            checkOut: null,
            totalHours: 0,
            overtime: 0,
            breakTime: 0,
            status: "absent",
          });
        }
      }
      
      datePointer.setDate(datePointer.getDate() + 1);
    }

    // Format corrections
    const formattedCorrections = corrections.map((c) => ({
      id: c.id,
      date: formatDate(c.date),
      issue: c.issue,
      requestedCheckIn: c.requestedCheckIn ? formatTime(c.requestedCheckIn) : null,
      requestedCheckOut: c.requestedCheckOut ? formatTime(c.requestedCheckOut) : null,
      note: c.note,
      state: c.state,
      createdAt: c.createdAt.toISOString(),
    }));

    return NextResponse.json({
      employee: {
        id: employee.id,
        name: `${employee.firstName} ${employee.lastName}`,
        email: employee.email,
      },
      today: todayAttendance ? {
        id: todayAttendance.id,
        date: formatDate(todayAttendance.date),
        checkIn: todayAttendance.checkIn ? formatTime(todayAttendance.checkIn) : null,
        checkOut: todayAttendance.checkOut ? formatTime(todayAttendance.checkOut) : null,
        status: (todayAttendance.status || "").toLowerCase(),
      } : null,
      summary: {
        totalHours: Math.round((totalMinutes / 60) * 10) / 10,
        avgHours: workingDays > 0 ? Math.round((totalMinutes / 60 / workingDays) * 10) / 10 : 0,
        attendanceRate: Math.round(attendanceRate * 10) / 10,
        overtimeHours: Math.round((overtimeMinutes / 60) * 10) / 10,
        presentDays,
        lateDays,
        absentDays: actualAbsentDays,
        halfDays,
      },
      records: allDates.reverse(), // Show most recent first
      corrections: formattedCorrections,
      month: `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}`,
    });
  } catch (err) {
    console.error("Employee attendance GET error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/attendance/employee - Mark attendance with location verification
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, latitude, longitude } = body;

    if (!action || !["checkIn", "checkOut"].includes(action)) {
      return NextResponse.json(
        { error: "action must be 'checkIn' or 'checkOut'" },
        { status: 400 }
      );
    }

    // Validate location
    if (latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: "Location (latitude, longitude) is required for attendance" },
        { status: 400 }
      );
    }

    // Get employee first to check remote work status
    const employee = await prisma.employee.findFirst({
      where: { email: session.user.email },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee record not found" },
        { status: 404 }
      );
    }

    // Check if employee has approved remote work for today
    const now = new Date();
    
    // Use Pakistan timezone (UTC+5) for today's date
    // Pakistan midnight = UTC time - 5 hours at 00:00
    // Example: If it's Jan 22, 2026 3:00 PM PKT = Jan 22, 2026 10:00 AM UTC
    // Pakistan midnight of Jan 22 = Jan 21, 2026 7:00 PM UTC (19:00 UTC)
    const pakistanOffset = 5 * 60 * 60 * 1000; // 5 hours in milliseconds
    const nowInPakistan = new Date(now.getTime() + pakistanOffset);
    
    // Get today's date in Pakistan timezone
    const pakYear = nowInPakistan.getUTCFullYear();
    const pakMonth = nowInPakistan.getUTCMonth();
    const pakDay = nowInPakistan.getUTCDate();
    
    // Create Pakistan midnight in UTC (subtract 5 hours from Pakistan midnight)
    // Pakistan 00:00 = UTC 19:00 previous day
    const todayStart = new Date(Date.UTC(pakYear, pakMonth, pakDay, 0, 0, 0, 0));
    todayStart.setTime(todayStart.getTime() - pakistanOffset);
    
    const todayEnd = new Date(todayStart.getTime() + (24 * 60 * 60 * 1000) - 1);

    const remoteWorkApproved = await prisma.remoteWorkRequest.findFirst({
      where: {
        employeeId: employee.id,
        state: "approved",
        startDate: { lte: todayEnd },
        endDate: { gte: todayStart },
      },
    });

    // Only check location if NOT working remotely
    let distance = 0;
    if (!remoteWorkApproved) {
      // Calculate distance from office
      distance = getDistanceMeters(
        latitude,
        longitude,
        OFFICE_LOCATION.latitude,
        OFFICE_LOCATION.longitude
      );

      if (distance > OFFICE_LOCATION.radiusMeters) {
        return NextResponse.json(
          {
            error: "Location verification failed",
            message: `You are ${Math.round(distance)}m away from office. Must be within ${OFFICE_LOCATION.radiusMeters}m to mark attendance.`,
            distance: Math.round(distance),
            required: OFFICE_LOCATION.radiusMeters,
          },
          { status: 403 }
        );
      }
    }

    // Get or create today's attendance record
    let attendance = await prisma.attendance.findFirst({
      where: {
        employeeId: employee.id,
        date: { gte: todayStart, lte: todayEnd },
      },
    });

    if (action === "checkIn") {
      if (attendance?.checkIn) {
        return NextResponse.json(
          { error: "Already checked in today", checkIn: formatTime(attendance.checkIn) },
          { status: 400 }
        );
      }

      const status = determineStatus(now);

      if (attendance) {
        // Update existing record
        attendance = await prisma.attendance.update({
          where: { id: attendance.id },
          data: { checkIn: now, status },
        });
      } else {
        // Create new record
        attendance = await prisma.attendance.create({
          data: {
            employeeId: employee.id,
            date: todayStart,
            checkIn: now,
            status,
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: `Checked in successfully at ${formatTime(now)}`,
        data: {
          id: attendance.id,
          date: formatDate(attendance.date),
          checkIn: formatTime(attendance.checkIn!),
          checkOut: attendance.checkOut ? formatTime(attendance.checkOut) : null,
          status: attendance.status,
        },
        location: {
          verified: true,
          distance: Math.round(distance),
        },
      });
    }

    if (action === "checkOut") {
      if (!attendance?.checkIn) {
        return NextResponse.json(
          { error: "Must check in before checking out" },
          { status: 400 }
        );
      }

      if (attendance.checkOut) {
        return NextResponse.json(
          { error: "Already checked out today", checkOut: formatTime(attendance.checkOut) },
          { status: 400 }
        );
      }

      // Update with checkout time
      const hoursWorked = calculateHoursWorked(attendance.checkIn, now);
      let finalStatus = (attendance.status || "").toLowerCase();
      
      if (hoursWorked < HALF_DAY_HOURS) {
        finalStatus = "half-day";
      }

      attendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: { 
          checkOut: now,
          status: finalStatus,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Checked out successfully at ${formatTime(now)}`,
        data: {
          id: attendance.id,
          date: formatDate(attendance.date),
          checkIn: formatTime(attendance.checkIn!),
          checkOut: formatTime(now),
          status: attendance.status,
          hoursWorked: Math.round(hoursWorked * 100) / 100,
        },
        location: {
          verified: true,
          distance: Math.round(distance),
        },
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("Employee attendance POST error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
