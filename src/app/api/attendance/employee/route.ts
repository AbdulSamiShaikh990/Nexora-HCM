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
const SHIFT_END = "18:00";
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

// Helper: Format time to 12-hour clock with AM/PM (local device time)
function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// Helper: Format date to YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// Helper: Calculate hours worked
function calculateHoursWorked(checkIn: Date | null, checkOut: Date | null): number {
  if (!checkIn || !checkOut) return 0;
  return (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
}

// Helper: Determine status based on check-in time
function determineStatus(checkIn: Date): "present" | "late" {
  const [shiftH, shiftM] = SHIFT_START.split(":").map(Number);
  const shiftStartMinutes = shiftH * 60 + shiftM;
  const checkInMinutes = checkIn.getUTCHours() * 60 + checkIn.getUTCMinutes();
  
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
    
    const startOfMonth = new Date(Date.UTC(targetYear, targetMonth, 1, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0, 23, 59, 59));
    
    // Today's date for current status
    const todayStr = formatDate(now);
    const todayStart = new Date(todayStr + "T00:00:00.000Z");
    const todayEnd = new Date(todayStr + "T23:59:59.999Z");

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

    const [shiftEndH, shiftEndM] = SHIFT_END.split(":").map(Number);
    const shiftEndMinutes = shiftEndH * 60 + shiftEndM;

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

        // Calculate overtime
        const checkOutMinutes = record.checkOut.getUTCHours() * 60 + record.checkOut.getUTCMinutes();
        if (checkOutMinutes > shiftEndMinutes) {
          overtimeMinutes += checkOutMinutes - shiftEndMinutes;
        }
      }
    });

    const workingDays = presentDays + lateDays + halfDays;
    const totalDays = workingDays + absentDays;
    const attendanceRate = totalDays > 0 ? ((workingDays / totalDays) * 100) : 0;

    // Format records for frontend
    const formattedRecords = monthlyRecords.map((record) => {
      const hoursWorked = calculateHoursWorked(record.checkIn, record.checkOut);
      const checkOutMinutes = record.checkOut 
        ? record.checkOut.getUTCHours() * 60 + record.checkOut.getUTCMinutes()
        : 0;
      const ot = Math.max(0, checkOutMinutes - shiftEndMinutes);
      
      return {
        id: record.id,
        date: formatDate(record.date),
        checkIn: record.checkIn ? formatTime(record.checkIn) : null,
        checkOut: record.checkOut ? formatTime(record.checkOut) : null,
        totalHours: Math.round(hoursWorked * 100) / 100,
        overtime: Math.round((ot / 60) * 100) / 100,
        breakTime: 1, // Assume 1 hour break
        status: hoursWorked < HALF_DAY_HOURS && hoursWorked > 0 ? "half-day" : (record.status || "").toLowerCase(),
      };
    });

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
        absentDays,
        halfDays,
      },
      records: formattedRecords,
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
    const todayStr = formatDate(now);
    const todayDate = new Date(todayStr + "T00:00:00.000Z");

    // @ts-expect-error - Prisma type will be available after server restart
    const remoteWorkApproved = await prisma.remoteWorkRequest.findFirst({
      where: {
        employeeId: employee.id,
        state: "approved",
        startDate: { lte: todayDate },
        endDate: { gte: todayDate },
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
        date: todayDate,
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
            date: todayDate,
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
