import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    // Check if user is admin
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized - admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const department = searchParams.get("department");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: any = {};
    if (status && status !== "all") {
      where.status = status;
    }
    if (department && department !== "all") {
      where.employee = { department };
    }

    const skip = (page - 1) * limit;

    const [leaves, total] = await Promise.all([
      prisma.leave.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              department: true,
              jobTitle: true,
              phone: true,
              leaveBalance: true,
            },
          },
        },
        orderBy: { startDate: "desc" },
        skip,
        take: limit,
      }),
      prisma.leave.count({ where }),
    ]);

    // Get current month for calculations
    const now = new Date();
    const monthsInYear = now.getMonth() + 1;

    const data = leaves.map((leave: any) => {
      const days = Math.max(
        1,
        Math.ceil(
          (leave.endDate.getTime() - leave.startDate.getTime() + 1) /
            (1000 * 60 * 60 * 24)
        )
      );

      // Calculate total balance for this leave type
      let totalBalance = 0;
      if (leave.type === "Annual") {
        totalBalance = 14;
      } else if (leave.type === "Sick") {
        totalBalance = 3 * monthsInYear;
      } else if (leave.type === "Casual") {
        totalBalance = 2 * monthsInYear;
      } else if (leave.type === "Emergency") {
        totalBalance = 1 * monthsInYear;
      }

      // Calculate used leaves for this type
      const usedLeaves = leaves
        .filter(
          (l: any) =>
            l.type === leave.type &&
            l.status === "Approved" &&
            l.employeeId === leave.employeeId
        )
        .reduce((sum, l: any) => {
          const d = Math.max(
            1,
            Math.ceil(
              (l.endDate.getTime() - l.startDate.getTime() + 1) /
                (1000 * 60 * 60 * 24)
            )
          );
          return sum + d;
        }, 0);

      const remaining = Math.max(0, totalBalance - usedLeaves);

      return {
        id: leave.id,
        type: leave.type,
        startDate: leave.startDate.toISOString().split("T")[0],
        endDate: leave.endDate.toISOString().split("T")[0],
        days,
        reason: leave.reason || "-",
        status: leave.status,
        employeeId: leave.employeeId,
        employee: `${leave.employee.firstName} ${leave.employee.lastName}`,
        employeeEmail: leave.employee.email,
        employeeJobTitle: leave.employee.jobTitle,
        employeePhone: leave.employee.phone || "-",
        department: leave.employee.department,
        leaveBalance: remaining, // Type-specific remaining balance
        totalLeaveBalance: totalBalance, // Total available for this type
        isPaid: leave.isPaid,
        approvedBy: "-",
        approvedAt: null,
        approverComment: "-",
        createdAt: new Date().toISOString(),
      };
    });

    // Get stats
    const stats = {
      total: total,
      approved: await prisma.leave.count({ where: { ...where, status: "Approved" } }),
      pending: await prisma.leave.count({ where: { ...where, status: "Pending" } }),
      rejected: await prisma.leave.count({ where: { ...where, status: "Rejected" } }),
    };

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats,
    });
  } catch (error: any) {
    console.error("[Admin Leave API Error]", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch leave requests" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    // Check if user is admin
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized - admin access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id, status, approverComment, paid, paidDays } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: "Leave ID and status are required" },
        { status: 400 }
      );
    }

    const leave = await prisma.leave.findUnique({
      where: { id: parseInt(id) },
      include: { employee: true },
    });

    if (!leave) {
      return NextResponse.json(
        { error: "Leave request not found" },
        { status: 404 }
      );
    }

    // Handle approval/rejection with balance update
    const days = Math.max(
      1,
      Math.ceil(
        (leave.endDate.getTime() - leave.startDate.getTime() + 1) /
          (1000 * 60 * 60 * 24)
      )
    );

    let balanceChange = 0;
    if (status === "Approved" && leave.status !== "Approved") {
      // Deduct balance on approval
      balanceChange = -days;
    } else if (status === "Rejected" && leave.status === "Approved") {
      // Restore balance on rejection
      balanceChange = days;
    }

    const updatedLeave = await prisma.$transaction(async (tx) => {
      // Update leave
      const updated = await tx.leave.update({
        where: { id: parseInt(id) },
        data: {
          status,
          // Only update isPaid since Leave model doesn't have paidDays
          isPaid: paid !== undefined ? paid : undefined,
        },
      });

      // Update employee balance if needed
      if (balanceChange !== 0) {
        const currentBalance = leave.employee.leaveBalance || 0;
        await tx.employee.update({
          where: { id: leave.employeeId },
          data: {
            leaveBalance: Math.max(0, currentBalance + balanceChange),
          },
        });
      }

      // Create notification for employee
      await tx.notification.create({
        data: {
          type: "LEAVE_RESPONSE",
          payload: {
            leaveId: updated.id,
            employeeId: leave.employeeId,
            status,
            approverComment,
            message:
              status === "Approved"
                ? "Your leave request has been approved"
                : "Your leave request has been rejected",
          },
        },
      });

      // Log action
      await tx.auditLog.create({
        data: {
          action: `LEAVE_${status.toUpperCase()}`,
          by: session?.user?.email || "admin",
          employeeId: leave.employeeId,
        },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedLeave.id,
        status: updatedLeave.status,
        message: `Leave request has been ${status.toLowerCase()}`,
      },
    });
  } catch (error: any) {
    console.error("[Admin Leave Update API Error]", error);
    return NextResponse.json(
      { error: error.message || "Failed to update leave request" },
      { status: 500 }
    );
  }
}
