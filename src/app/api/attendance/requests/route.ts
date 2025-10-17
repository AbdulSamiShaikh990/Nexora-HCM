import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/attendance/requests -> list correction requests
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const state = searchParams.get("state"); // pending | approved | rejected
    const date = searchParams.get("date"); // YYYY-MM-DD
    const department = searchParams.get("department");
    const employeeId = searchParams.get("employeeId");
    const page = parseInt(searchParams.get("page") || "1");
    const size = parseInt(searchParams.get("size") || "50");

    const where: Prisma.AttendanceCorrectionWhereInput = {};

    // Filter by state
    if (state) {
      where.state = state;
    }

    // Filter by date
    if (date) {
      const startOfDay = new Date(date + "T00:00:00.000Z");
      const endOfDay = new Date(date + "T23:59:59.999Z");
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

    const skip = (page - 1) * size;

    const [requests, total] = await Promise.all([
      prisma.attendanceCorrection.findMany({
        where,
        include: {
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
        orderBy: { createdAt: "desc" },
        skip,
        take: size,
      }),
      prisma.attendanceCorrection.count({ where }),
    ]);

    const enrichedRequests = requests.map((r: {
      id: number;
      employee: { id: number; firstName: string; lastName: string; department: string; email: string };
      date: Date;
      issue: string;
      requestedCheckIn: Date | null;
      requestedCheckOut: Date | null;
      note: string | null;
      state: string;
      createdAt: Date;
    }) => ({
      id: r.id,
      employee: `${r.employee.firstName} ${r.employee.lastName}`,
      employeeId: r.employee.id,
      department: r.employee.department,
      date: r.date.toISOString().split("T")[0],
      issue: r.issue,
      requestedCheckIn: r.requestedCheckIn
        ? r.requestedCheckIn.toISOString().substring(11, 16)
        : null,
      requestedCheckOut: r.requestedCheckOut
        ? r.requestedCheckOut.toISOString().substring(11, 16)
        : null,
      note: r.note,
      state: r.state,
      createdAt: r.createdAt.toISOString(),
    }));

    return NextResponse.json(
      {
        data: enrichedRequests,
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
    console.error("Attendance requests GET error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST /api/attendance/requests -> create correction request
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      employeeId,
      date,
      issue,
      requestedCheckIn,
      requestedCheckOut,
      note,
    } = body;

    // Validation
    if (!employeeId || !date || !issue) {
      return NextResponse.json(
        { error: "employeeId, date, and issue are required" },
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

    const request = await prisma.attendanceCorrection.create({
      data: {
        employeeId: parseInt(employeeId),
        date: correctionDate,
        issue,
        requestedCheckIn: requestedCheckInTime,
        requestedCheckOut: requestedCheckOutTime,
        note: note || null,
        state: "pending",
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
        data: request,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Attendance request POST error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PUT /api/attendance/requests?id=X -> approve correction request
export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const requestId = parseInt(id);
    const correction = await prisma.attendanceCorrection.findUnique({
      where: { id: requestId },
    });
    if (!correction) {
      return NextResponse.json({ error: "Correction request not found" }, { status: 404 });
    }
    if (correction.state !== "pending") {
      return NextResponse.json({ error: "Request already processed" }, { status: 400 });
    }
    const updatedCorrection = await prisma.attendanceCorrection.update({
      where: { id: requestId },
      data: { state: "approved" },
    });
    const attendanceDate = new Date(correction.date.toISOString().split("T")[0] + "T00:00:00.000Z");
    const existing = await prisma.attendance.findFirst({
      where: { employeeId: correction.employeeId, date: attendanceDate },
    });
    if (existing) {
      const updateData: { checkIn?: Date; checkOut?: Date; status?: string } = {};
      if (correction.requestedCheckIn) updateData.checkIn = correction.requestedCheckIn;
      if (correction.requestedCheckOut) updateData.checkOut = correction.requestedCheckOut;
      if (updateData.checkIn || updateData.checkOut) updateData.status = "Present";
      await prisma.attendance.update({
        where: { id: existing.id },
        data: updateData,
      });
    } else {
      await prisma.attendance.create({
        data: {
          employeeId: correction.employeeId,
          date: attendanceDate,
          checkIn: correction.requestedCheckIn || null,
          checkOut: correction.requestedCheckOut || null,
          status: "Present",
        },
      });
    }
    return NextResponse.json(
      { success: true, message: "Correction request approved and applied", data: updatedCorrection },
      { status: 200 }
    );
  } catch (err) {
    console.error("Approve correction error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/attendance/requests?id=X -> reject correction request
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const requestId = parseInt(id);
    const correction = await prisma.attendanceCorrection.findUnique({
      where: { id: requestId },
    });
    if (!correction) {
      return NextResponse.json({ error: "Correction request not found" }, { status: 404 });
    }
    if (correction.state !== "pending") {
      return NextResponse.json({ error: "Request already processed" }, { status: 400 });
    }
    const updatedCorrection = await prisma.attendanceCorrection.update({
      where: { id: requestId },
      data: { state: "rejected" },
    });
    return NextResponse.json(
      { success: true, message: "Correction request rejected", data: updatedCorrection },
      { status: 200 }
    );
  } catch (err) {
    console.error("Reject correction error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
