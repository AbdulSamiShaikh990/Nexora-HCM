import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/attendance/employee/remote - Get employee's remote work requests
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      return NextResponse.json(
        { error: "Employee record not found" },
        { status: 404 }
      );
    }

    // @ts-expect-error - Prisma type will be available after server restart
    const requests = await prisma.remoteWorkRequest.findMany({
      where: { employeeId: employee.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      requests: requests.map((r: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
        id: r.id,
        startDate: r.startDate.toISOString().split("T")[0],
        endDate: r.endDate.toISOString().split("T")[0],
        reason: r.reason,
        state: r.state,
        createdAt: r.createdAt.toISOString(),
        approvedBy: r.approvedBy,
        approvedAt: r.approvedAt?.toISOString(),
      })),
    });
  } catch (err) {
    console.error("Remote work GET error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST /api/attendance/employee/remote - Request remote work
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { startDate, endDate, reason } = body;

    if (!startDate || !endDate || !reason) {
      return NextResponse.json(
        { error: "startDate, endDate, and reason are required" },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.findFirst({
      where: { email: session.user.email },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee record not found" },
        { status: 404 }
      );
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (start < now) {
      return NextResponse.json(
        { error: "Start date cannot be in the past" },
        { status: 400 }
      );
    }

    if (end < start) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      );
    }

    // Check for overlapping requests
    // @ts-expect-error - Prisma type will be available after server restart
    const existing = await prisma.remoteWorkRequest.findFirst({
      where: {
        employeeId: employee.id,
        state: { in: ["pending", "approved"] },
        OR: [
          {
            AND: [
              { startDate: { lte: start } },
              { endDate: { gte: start } },
            ],
          },
          {
            AND: [
              { startDate: { lte: end } },
              { endDate: { gte: end } },
            ],
          },
          {
            AND: [
              { startDate: { gte: start } },
              { endDate: { lte: end } },
            ],
          },
        ],
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: "You already have a remote work request for overlapping dates",
        },
        { status: 400 }
      );
    }

    // @ts-expect-error - Prisma type will be available after server restart
    const request = await prisma.remoteWorkRequest.create({
      data: {
        employeeId: employee.id,
        startDate: start,
        endDate: end,
        reason,
        state: "pending",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Remote work request submitted successfully",
      request: {
        id: request.id,
        startDate: request.startDate.toISOString().split("T")[0],
        endDate: request.endDate.toISOString().split("T")[0],
        reason: request.reason,
        state: request.state,
      },
    });
  } catch (err) {
    console.error("Remote work POST error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
