import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Leave } from "@prisma/client";

interface LeaveTypeCount {
  type: string;
  count: number;
}

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

    // Fetch ALL leave records for this employee (no date filter for history)
    const leaves = await prisma.leave.findMany({
      where: {
        employeeId: employee.id
      },
      orderBy: {
        startDate: 'desc'
      }
    });

    // All leaves for calculations (same as above now)
    const allLeaves = leaves;

    // Calculate statistics (matching status values: Pending | Approved | Rejected)
    const totalLeaves = leaves.length;
    const approvedLeaves = leaves.filter((l: Leave) => l.status === 'Approved').length;
    const pendingLeaves = leaves.filter((l: Leave) => l.status === 'Pending').length;
    const rejectedLeaves = leaves.filter((l: Leave) => l.status === 'Rejected').length;

    // Calculate leave by type
    const leaveByType = leaves.reduce((acc: LeaveTypeCount[], leave: Leave) => {
      const existing = acc.find((item: LeaveTypeCount) => item.type === leave.type);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ type: leave.type, count: 1 });
      }
      return acc;
    }, []);

    // Calculate used days by type from actual leave data (only approved leaves)
    const calculateDays = (leaveList: Leave[], type: string, status?: string): number => {
      return leaveList
        .filter((l: Leave) => l.type === type && (status ? l.status === status : true))
        .reduce((sum: number, l: Leave) => {
          const start = new Date(l.startDate);
          const end = new Date(l.endDate);
          const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          return sum + days;
        }, 0);
    };

    // Get unique leave types from actual database records
    const uniqueTypes = [...new Set(allLeaves.map((l: Leave) => l.type))];
    
    // Build detailed breakdown by type from real data
    const balanceByType = uniqueTypes.map((type: string) => ({
      type,
      approved: calculateDays(allLeaves, type, 'Approved'),
      pending: calculateDays(allLeaves, type, 'Pending'),
      rejected: calculateDays(allLeaves, type, 'Rejected'),
      total: calculateDays(allLeaves, type)
    }));

    // Use employee's actual leaveBalance from database
    const totalUsedDays = balanceByType.reduce((sum, item) => sum + item.approved, 0);
    const remainingBalance = employee.leaveBalance ?? 0;

    // Format leaves for table
    const formattedLeaves = leaves.map((leave: Leave) => {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      return {
        type: leave.type,
        startDate: leave.startDate,
        endDate: leave.endDate,
        days,
        status: leave.status,
        reason: leave.reason,
        isPaid: leave.isPaid
      };
    });

    return NextResponse.json({
      totalLeaves,
      approvedLeaves,
      pendingLeaves,
      rejectedLeaves,
      remainingBalance,
      totalUsedDays,
      leaveByType,
      balanceByType,
      leaves: formattedLeaves
    });

  } catch (error) {
    console.error("Error fetching leave report:", error);
    return NextResponse.json(
      { error: "Failed to fetch leave report" },
      { status: 500 }
    );
  }
}
