import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST /api/attendance/employee/correction - Submit correction request
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get employee
    const employee = await prisma.employee.findFirst({
      where: { email: session.user.email },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee record not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { date, issue, requestedCheckIn, requestedCheckOut, note } = body;

    if (!date || !issue) {
      return NextResponse.json(
        { error: "date and issue are required" },
        { status: 400 }
      );
    }

    // Parse date
    const correctionDate = new Date(date + "T00:00:00.000Z");

    // Parse requested times if provided
    let requestedCheckInTime: Date | null = null;
    let requestedCheckOutTime: Date | null = null;

    if (requestedCheckIn) {
      requestedCheckInTime = new Date(date + "T" + requestedCheckIn + ":00.000Z");
    }

    if (requestedCheckOut) {
      requestedCheckOutTime = new Date(date + "T" + requestedCheckOut + ":00.000Z");
    }

    // Create correction request
    const correction = await prisma.attendanceCorrection.create({
      data: {
        employeeId: employee.id,
        date: correctionDate,
        issue,
        requestedCheckIn: requestedCheckInTime,
        requestedCheckOut: requestedCheckOutTime,
        note: note || null,
        state: "pending",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Correction request submitted successfully",
      data: {
        id: correction.id,
        date: date,
        issue: correction.issue,
        requestedCheckIn: requestedCheckIn || null,
        requestedCheckOut: requestedCheckOut || null,
        note: correction.note,
        state: correction.state,
        createdAt: correction.createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("Employee correction POST error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// GET /api/attendance/employee/correction - Get employee's correction requests
export async function GET(_req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employee = await prisma.employee.findFirst({
      where: { email: session.user.email },
    });

    if (!employee) {
      return NextResponse.json({ data: [] });
    }

    const corrections = await prisma.attendanceCorrection.findMany({
      where: { employeeId: employee.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const formatted = corrections.map((c) => ({
      id: c.id,
      date: c.date.toISOString().split("T")[0],
      issue: c.issue,
      requestedCheckIn: c.requestedCheckIn 
        ? c.requestedCheckIn.toISOString().substring(11, 16) 
        : null,
      requestedCheckOut: c.requestedCheckOut 
        ? c.requestedCheckOut.toISOString().substring(11, 16) 
        : null,
      note: c.note,
      state: c.state,
      createdAt: c.createdAt.toISOString(),
    }));

    return NextResponse.json({ data: formatted });
  } catch (err) {
    console.error("Employee correction GET error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
