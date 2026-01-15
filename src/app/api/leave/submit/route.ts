import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    // Get session to identify employee
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized - please login first" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { type, startDate, endDate, reason, attachments } = body;

    if (!type || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Leave type, start date, and end date are required" },
        { status: 400 }
      );
    }

    // Normalize leave type - capitalize first letter
    const leaveTypeMap: Record<string, string> = {
      annual: "Annual",
      sick: "Sick",
      casual: "Casual",
      emergency: "Emergency",
    };
    const normalizedType = leaveTypeMap[type.toLowerCase()] || type;

    // Get employee from database using email
    const employee = await prisma.employee.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        department: true,
        leaveBalance: true,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee profile not found" },
        { status: 404 }
      );
    }

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    // Calculate number of days
    const days = Math.max(
      1,
      Math.ceil(
        (endDateObj.getTime() - startDateObj.getTime() + 1) / 
        (1000 * 60 * 60 * 24)
      )
    );

    // Check leave balance (note: we allow exceeding balance with user confirmation)
    const currentBalance = employee.leaveBalance ?? 10;

    // Auto-approve ONLY if:
    // 1. Leave is exactly 1 day
    // 2. Employee has sufficient balance
    let status = "Pending";
    if (days === 1 && currentBalance >= days) {
      status = "Approved";
    }

    // Create leave record in transaction
    const leave = await prisma.$transaction(async (tx) => {
      // Create leave record
      const createdLeave = await tx.leave.create({
        data: {
          type: normalizedType,
          startDate: startDateObj,
          endDate: endDateObj,
          reason: reason || null,
          status,
          employeeId: employee.id,
          isPaid: /annual|sick|casual/i.test(normalizedType),
        },
      });

      // If auto-approved, deduct from balance
      if (status === "Approved") {
        await tx.employee.update({
          where: { id: employee.id },
          data: {
            leaveBalance: Math.max(0, currentBalance - days),
          },
        });
      }

      // Log the action
      await tx.auditLog.create({
        data: {
          action: `LEAVE_SUBMITTED_${status}`,
          by: session.user?.name || employee.email,
          employeeId: employee.id,
        },
      });

      // Create notification for admin
      await tx.notification.create({
        data: {
          type: "LEAVE_REQUEST",
          payload: {
            leaveId: createdLeave.id,
            employeeId: employee.id,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            leaveType: normalizedType,
            startDate: startDateObj.toISOString(),
            endDate: endDateObj.toISOString(),
            days,
            status,
            reason,
          },
        },
      });

      return createdLeave;
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: leave.id,
          type: leave.type,
          startDate: leave.startDate.toISOString(),
          endDate: leave.endDate.toISOString(),
          status,
          message:
            status === "Approved"
              ? `Your leave has been auto-approved. ${days} days deducted from your balance.`
              : "Your leave request has been submitted and is pending approval.",
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Leave Submit API Error]", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit leave request" },
      { status: 500 }
    );
  }
}
