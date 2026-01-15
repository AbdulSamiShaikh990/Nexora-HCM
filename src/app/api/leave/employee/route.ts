import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface EmployeeRecord {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  leaveBalance: number | null;
}

interface LeaveRecord {
  id: number;
  type: string;
  startDate: Date;
  endDate: Date;
  reason: string | null;
  status: string;
  employeeId: number;
}

// GET /api/leave/employee - Fetch leaves for the current logged-in employee
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized - Please login" },
        { status: 401 }
      );
    }

    // Find employee by email using raw query to avoid type issues
    const employees = await prisma.$queryRaw<EmployeeRecord[]>`
      SELECT * FROM "Employee" WHERE email = ${session.user.email}
    `;

    if (!employees || employees.length === 0) {
      return NextResponse.json(
        { error: "Employee record not found" },
        { status: 404 }
      );
    }

    const employee = employees[0];
    const employeeId = employee.id;

    // Fetch all leave requests for this employee
    const leaves = await prisma.leave.findMany({
      where: { employeeId },
      orderBy: { startDate: "desc" }
    }) as LeaveRecord[];

    // Map to frontend format
    const data = leaves.map((leave) => ({
      id: leave.id,
      type: leave.type,
      startDate: new Date(leave.startDate).toISOString(),
      endDate: new Date(leave.endDate).toISOString(),
      days: Math.max(
        1,
        Math.ceil(
          (new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime() + 1) /
            (1000 * 60 * 60 * 24)
        )
      ),
      reason: leave.reason || "-",
      status: leave.status,
      employeeId: leave.employeeId,
    }));

    // Calculate stats
    const approved = data.filter((r) => r.status === "Approved").length;
    const pending = data.filter((r) => r.status === "Pending").length;
    const rejected = data.filter((r) => r.status === "Rejected").length;
    const totalDays = data.reduce((sum, r) => sum + r.days, 0);

    return NextResponse.json({
      success: true,
      data,
      stats: {
        totalThisMonth: totalDays,
        approved,
        pending,
        rejected,
        totalRequests: data.length,
      },
      employee: {
        id: employeeId,
        name: `${employee.firstName} ${employee.lastName}`,
        email: employee.email,
        department: employee.department,
        leaveBalance: employee.leaveBalance ?? 10,
      }
    });
  } catch (error) {
    console.error("Error fetching employee leaves:", error);
    return NextResponse.json(
      { error: "Failed to fetch leave data" },
      { status: 500 }
    );
  }
}
