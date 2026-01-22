import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// Helper: Parse time deltas
function computeDeltas(
  checkIn: Date | null,
  checkOut: Date | null,
  shiftStart: string,
  shiftEnd: string
): { late: number; early: number; ot: number; total: number } {
  if (!checkIn || !checkOut) {
    return { late: 0, early: 0, ot: 0, total: 0 };
  }

  const [ssH, ssM] = shiftStart.split(":").map(Number);
  const [seH, seM] = shiftEnd.split(":").map(Number);

  const shiftStartMinutes = ssH * 60 + ssM;
  const shiftEndMinutes = seH * 60 + seM;

  const checkInMinutes = checkIn.getUTCHours() * 60 + checkIn.getUTCMinutes();
  const checkOutMinutes = checkOut.getUTCHours() * 60 + checkOut.getUTCMinutes();

  const late = Math.max(0, checkInMinutes - shiftStartMinutes);
  const early = Math.max(0, shiftEndMinutes - checkOutMinutes);
  const total = Math.max(0, checkOutMinutes - checkInMinutes);
  
  // Overtime: only if total worked hours > 8 hours (480 minutes)
  const ot = total > 480 ? total - 480 : 0;

  return { late, early, ot, total };
}

// Helper: Format minutes to "Xh Ym"
function minutesToHm(mins: number): string {
  if (mins <= 0) return "0m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// Helper: format Date (UTC) to 12h string like "09:05 AM"
function to12h(d?: Date | null): string {
  if (!d) return "-";
  // Convert to Pakistan time (UTC+5)
  const pakistanOffset = 5 * 60 * 60 * 1000; // 5 hours in milliseconds
  const pakTime = new Date(d.getTime() + pakistanOffset);
  
  let h = pakTime.getUTCHours();
  const m = pakTime.getUTCMinutes();
  const meridiem = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  const hh = h.toString().padStart(2, "0");
  const mm = m.toString().padStart(2, "0");
  return `${hh}:${mm} ${meridiem}`;
}

// GET /api/attendance -> list attendance records with filters
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date"); // YYYY-MM-DD
    const department = searchParams.get("department");
    const employeeId = searchParams.get("employeeId");
    const shiftStart = searchParams.get("shiftStart") || "09:00";
    const shiftEnd = searchParams.get("shiftEnd") || "18:00";
    const page = parseInt(searchParams.get("page") || "1");
    const size = parseInt(searchParams.get("size") || "50");
    const mode = searchParams.get("mode"); // list | stats | live
    const format = searchParams.get("format"); // csv | excel

    const where: Prisma.AttendanceWhereInput = {};

    // Pakistan timezone offset (UTC+5)
    const pakistanOffset = 5 * 60 * 60 * 1000; // 5 hours in milliseconds

    // Filter by date - convert to Pakistan timezone range
    if (date) {
      // Parse the date (YYYY-MM-DD) as Pakistan date
      const [year, month, day] = date.split("-").map(Number);
      // Pakistan midnight in UTC = Pakistan date 00:00 - 5 hours
      const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      startOfDay.setTime(startOfDay.getTime() - pakistanOffset);
      const endOfDay = new Date(startOfDay.getTime() + (24 * 60 * 60 * 1000) - 1);
      where.date = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    // Filter by employeeId
    if (employeeId) {
      where.employeeId = parseInt(employeeId);
    }

    // Filter by department (via employee relation)
    if (department && department !== "all") {
      where.employee = {
        department: department,
      };
    }

    // If stats mode
    if (mode === "stats") {
      let startOfDay: Date | undefined;
      let endOfDay: Date | undefined;
      if (date) {
        const [year, month, day] = date.split("-").map(Number);
        startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        startOfDay.setTime(startOfDay.getTime() - pakistanOffset);
        endOfDay = new Date(startOfDay.getTime() + (24 * 60 * 60 * 1000) - 1);
      }
      const statsWhere: Prisma.AttendanceWhereInput = { ...where };
      if (startOfDay && endOfDay) {
        statsWhere.date = { gte: startOfDay, lte: endOfDay };
      }
      const records = await prisma.attendance.findMany({
        where: statsWhere,
        include: { employee: { select: { firstName: true, lastName: true, department: true } } },
      });
      
      // Get all active employees to calculate correct absent count
      const allEmployeesWhere: Prisma.EmployeeWhereInput = { status: "Active" };
      if (department && department !== "all") {
        allEmployeesWhere.department = department;
      }
      const allEmployees = await prisma.employee.findMany({
        where: allEmployeesWhere,
        select: { id: true },
      });
      
      const recordedEmployeeIds = new Set(records.map((r) => r.employeeId));
      const employeesWithoutRecords = allEmployees.length - recordedEmployeeIds.size;
      
      const present = records.filter((r) => r.status.toLowerCase() === "present").length;
      const late = records.filter((r) => r.status.toLowerCase() === "late").length;
      const halfDay = records.filter((r) => r.status.toLowerCase() === "half-day").length;
      const absentWithRecord = records.filter((r) => r.status.toLowerCase() === "absent").length;
      const absent = absentWithRecord + employeesWithoutRecords; // Total absent = marked absent + no record
      const total = allEmployees.length; // Total should be all active employees
      
      let totalMinutes = 0;
      let totalOvertimeMinutes = 0;
      records.forEach((r) => {
        const d = computeDeltas(r.checkIn, r.checkOut, shiftStart, shiftEnd);
        totalMinutes += d.total;
        totalOvertimeMinutes += d.ot;
      });
      const avgHours = total > 0 ? Math.round((totalMinutes / total / 60) * 10) / 10 : 0;
      const avgOvertime = records.length > 0 ? Math.round((totalOvertimeMinutes / records.length / 60) * 10) / 10 : 0;
      const attendanceRate = total > 0 ? Math.round(((present + late) / total) * 1000) / 10 : 0;
      return NextResponse.json(
        { date, total, present, late, halfDay, absent, avgHours, avgOvertime, attendanceRate, department: department || "all" },
        { status: 200 }
      );
    }

    // If live mode
    if (mode === "live") {
      let liveStartOfDay: Date | undefined;
      let liveEndOfDay: Date | undefined;
      if (date) {
        const [year, month, day] = date.split("-").map(Number);
        liveStartOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        liveStartOfDay.setTime(liveStartOfDay.getTime() - pakistanOffset);
        liveEndOfDay = new Date(liveStartOfDay.getTime() + (24 * 60 * 60 * 1000) - 1);
      }
      const liveWhere: Prisma.AttendanceWhereInput = { ...where };
      if (liveStartOfDay && liveEndOfDay) {
        liveWhere.date = { gte: liveStartOfDay, lte: liveEndOfDay };
      }
      const records = await prisma.attendance.findMany({
        where: liveWhere,
        include: { employee: { select: { id: true, firstName: true, lastName: true, department: true } } },
      });
      
      // Get all active employees to show who's absent
      const allEmployeesWhere: Prisma.EmployeeWhereInput = { status: "Active" };
      if (department && department !== "all") {
        allEmployeesWhere.department = department;
      }
      const allEmployees = await prisma.employee.findMany({
        where: allEmployeesWhere,
        select: { id: true, firstName: true, lastName: true, department: true },
      });
      
      const recordedEmployeeIds = new Set(records.map((r) => r.employee!.id));
      
      const inEmployees = records
        .filter((r) => r.status.toLowerCase() !== "absent" && r.checkIn)
        .map((r) => ({
          id: r.employee!.id,
          employee: `${r.employee!.firstName} ${r.employee!.lastName}`,
          department: r.employee!.department,
          checkIn: r.checkIn ? to12h(r.checkIn) : "-",
          status: r.status,
        }));
      
      // Out/Absent employees: those with absent status OR not checked in OR not in records at all
      const outEmployees = [
        ...records
          .filter((r) => r.status.toLowerCase() === "absent" || !r.checkIn)
          .map((r) => ({
            id: r.employee!.id,
            employee: `${r.employee!.firstName} ${r.employee!.lastName}`,
            department: r.employee!.department,
            checkOut: r.checkOut ? to12h(r.checkOut) : "-",
            status: r.status,
          })),
        ...allEmployees
          .filter((emp) => !recordedEmployeeIds.has(emp.id))
          .map((emp) => ({
            id: emp.id,
            employee: `${emp.firstName} ${emp.lastName}`,
            department: emp.department,
            checkOut: "-",
            status: "absent",
          })),
      ];
      
      return NextResponse.json({ date, in: inEmployees, out: outEmployees }, { status: 200 });
    }

    // If export format (CSV or Excel)
    if (format === "csv" || format === "excel") {
      if (!date) {
        return NextResponse.json({ error: "date is required for export" }, { status: 400 });
      }
      const [expYear, expMonth, expDay] = date.split("-").map(Number);
      const startOfDay = new Date(Date.UTC(expYear, expMonth - 1, expDay, 0, 0, 0, 0));
      startOfDay.setTime(startOfDay.getTime() - pakistanOffset);
      const endOfDay = new Date(startOfDay.getTime() + (24 * 60 * 60 * 1000) - 1);
      const exportWhere: Prisma.AttendanceWhereInput = {
        date: { gte: startOfDay, lte: endOfDay },
      };
      if (department && department !== "all") {
        exportWhere.employee = { department };
      }
      const rows = await prisma.attendance.findMany({
        where: exportWhere,
        include: {
          employee: { select: { firstName: true, lastName: true, department: true, email: true, id: true } },
        },
        orderBy: { date: "asc" },
      });
      const headers = ["Employee ID", "Employee", "Department", "Date", "Check In", "Check Out", "Status"];
      const lines = [headers.join(",")];
      for (const r of rows) {
        const emp = `${r.employee.firstName} ${r.employee.lastName}`.replaceAll(",", " ");
        const line = [
          r.employee.id,
          `"${emp}"`,
          r.employee.department,
          r.date.toISOString().split("T")[0],
          r.checkIn ? to12h(r.checkIn) : "-",
          r.checkOut ? to12h(r.checkOut) : "-",
          r.status,
        ].join(",");
        lines.push(line);
      }
      const csv = lines.join("\n");
      const contentType = format === "excel" ? "application/vnd.ms-excel; charset=utf-8" : "text/csv; charset=utf-8";
      const ext = format === "excel" ? "xls" : "csv";
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename=attendance-${date}.${ext}`,
          "Cache-Control": "no-store",
        },
      });
    }

    const skip = (page - 1) * size;

    // Get attendance records
    const records = await prisma.attendance.findMany({
      where,
      select: {
        id: true,
        date: true,
        status: true,
        employeeId: true,
        checkIn: true,
        checkOut: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: true,
            email: true,
          },
        },
      },
      orderBy: { date: "desc" },
      skip,
      take: size,
    });
    
    // Get all active employees to show who's absent
    let allEmployees: Array<{ id: number; firstName: string; lastName: string; department: string }> = [];
    if (date) {
      // Only when filtering by specific date, show absent employees
      const allEmployeesWhere: Prisma.EmployeeWhereInput = { status: "Active" };
      if (department && department !== "all") {
        allEmployeesWhere.department = department;
      }
      allEmployees = await prisma.employee.findMany({
        where: allEmployeesWhere,
        select: { id: true, firstName: true, lastName: true, department: true },
      });
    }
    
    const recordedEmployeeIds = new Set(records.map((r) => r.employeeId));

    // Compute deltas for each record
    const enrichedRecords = records.map((record) => {
      const deltas = computeDeltas(
        record.checkIn,
        record.checkOut,
        shiftStart,
        shiftEnd
      );

      return {
        id: record.id,
        employee: `${record.employee.firstName} ${record.employee.lastName}`,
        employeeId: record.employee.id,
        department: record.employee.department,
        date: record.date.toISOString().split("T")[0],
        checkIn: to12h(record.checkIn),
        checkOut: to12h(record.checkOut),
        status: record.status,
        totalHours: minutesToHm(deltas.total),
        late: minutesToHm(deltas.late),
        earlyDeparture: minutesToHm(deltas.early),
        overtime: minutesToHm(deltas.ot),
        totalMinutes: deltas.total,
        lateMinutes: deltas.late,
        earlyMinutes: deltas.early,
        overtimeMinutes: deltas.ot,
      };
    });
    
    // Add absent employees (those without records for the date)
    const absentRecords = allEmployees
      .filter((emp) => !recordedEmployeeIds.has(emp.id))
      .map((emp, idx) => ({
        id: -1 - idx, // Negative IDs for absent employees
        employee: `${emp.firstName} ${emp.lastName}`,
        employeeId: emp.id,
        department: emp.department,
        date: date || new Date().toISOString().split("T")[0],
        checkIn: "-",
        checkOut: "-",
        status: "absent",
        totalHours: "0m",
        late: "0m",
        earlyDeparture: "0m",
        overtime: "0m",
        totalMinutes: 0,
        lateMinutes: 0,
        earlyMinutes: 0,
        overtimeMinutes: 0,
      }));
    
    const allRecords = [...enrichedRecords, ...absentRecords];
    const total = await prisma.attendance.count({ where }) + absentRecords.length;

    return NextResponse.json(
      {
        data: allRecords,
        pagination: {
          page,
          size,
          total,
          totalPages: Math.ceil(total / size),
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Attendance GET error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST /api/attendance -> create or update attendance record
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { employeeId, date, checkIn, checkOut, status } = body;

    // Validation
    if (!employeeId || !date) {
      return NextResponse.json(
        { error: "employeeId and date are required" },
        { status: 400 }
      );
    }

    // Parse date to UTC midnight
    const attendanceDate = new Date(date + "T00:00:00.000Z");

    // Parse checkIn/checkOut if provided
    let checkInTime: Date | null = null;
    let checkOutTime: Date | null = null;

    if (checkIn) {
      checkInTime = new Date(date + "T" + checkIn + ":00.000Z");
    }

    if (checkOut) {
      checkOutTime = new Date(date + "T" + checkOut + ":00.000Z");
    }

    // Determine status if not provided
    let finalStatus = status;
    if (!finalStatus) {
      if (!checkInTime && !checkOutTime) {
        finalStatus = "Absent";
      } else {
        // Simple logic: if checkIn exists, assume Present (can be enhanced)
        finalStatus = "Present";
      }
    }

    // Upsert attendance record
    const record = await prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId: parseInt(employeeId),
          date: attendanceDate,
        },
      },
      update: {
        checkIn: checkInTime,
        checkOut: checkOutTime,
        status: finalStatus,
      },
      create: {
        employeeId: parseInt(employeeId),
        date: attendanceDate,
        checkIn: checkInTime,
        checkOut: checkOutTime,
        status: finalStatus,
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            department: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: record,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Attendance POST error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PUT /api/attendance -> update attendance record
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, employeeId, date, checkIn, checkOut, status } = body;

    if (!id && (!employeeId || !date)) {
      return NextResponse.json(
        { error: "id or (employeeId + date) required" },
        { status: 400 }
      );
    }

    const updateData: Partial<Prisma.AttendanceUpdateInput> = {};

    if (checkIn !== undefined) {
      updateData.checkIn = checkIn
        ? new Date(date + "T" + checkIn + ":00.000Z")
        : null;
    }

    if (checkOut !== undefined) {
      updateData.checkOut = checkOut
        ? new Date(date + "T" + checkOut + ":00.000Z")
        : null;
    }

    if (status) {
      updateData.status = status;
    }

    let record;

    if (id) {
      record = await prisma.attendance.update({
        where: { id: parseInt(id) },
        data: updateData,
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true,
              department: true,
            },
          },
        },
      });
    } else {
      const attendanceDate = new Date(date + "T00:00:00.000Z");
      record = await prisma.attendance.update({
        where: {
          employeeId_date: {
            employeeId: parseInt(employeeId),
            date: attendanceDate,
          },
        },
        data: updateData,
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true,
              department: true,
            },
          },
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: record,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Attendance PUT error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE /api/attendance -> delete attendance record
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await prisma.attendance.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Attendance record deleted",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Attendance DELETE error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}