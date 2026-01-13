import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/attendance/admin/remote - Get all notifications (remote work + attendance corrections)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // Get all remote work requests with employee details
    // @ts-expect-error - Prisma type will be available after server restart
    const remoteWorkRequests = await prisma.remoteWorkRequest.findMany({
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            department: true,
            jobTitle: true,
          },
        },
      },
      orderBy: [
        { state: "asc" }, // pending first
        { createdAt: "desc" }, // newest first
      ],
    });

    // Get all attendance correction requests with employee details
    const correctionRequests = await prisma.attendanceCorrection.findMany({
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            department: true,
            jobTitle: true,
          },
        },
      },
      orderBy: [
        { state: "asc" }, // pending first
        { createdAt: "desc" }, // newest first
      ],
    });

    // Format remote work requests
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedRemoteWork = remoteWorkRequests.map((req: any) => ({
      id: req.id,
      type: "remote_work",
      employeeId: req.employee.id,
      employeeName: `${req.employee.firstName} ${req.employee.lastName}`,
      employeeEmail: req.employee.email,
      department: req.employee.department,
      jobTitle: req.employee.jobTitle,
      startDate: req.startDate.toISOString(),
      endDate: req.endDate.toISOString(),
      reason: req.reason,
      state: req.state,
      approvedBy: req.approvedBy,
      approvedAt: req.approvedAt?.toISOString() || null,
      createdAt: req.createdAt.toISOString(),
    }));

    // Format correction requests
    const formattedCorrections = correctionRequests.map((req) => ({
      id: req.id,
      type: "attendance_correction",
      employeeId: req.employee.id,
      employeeName: `${req.employee.firstName} ${req.employee.lastName}`,
      employeeEmail: req.employee.email,
      department: req.employee.department,
      jobTitle: req.employee.jobTitle,
      date: req.date.toISOString(),
      issue: req.issue,
      requestedCheckIn: req.requestedCheckIn?.toISOString() || null,
      requestedCheckOut: req.requestedCheckOut?.toISOString() || null,
      note: req.note,
      state: req.state,
      createdAt: req.createdAt.toISOString(),
    }));

    // Combine and sort all notifications
    const allNotifications = [...formattedRemoteWork, ...formattedCorrections].sort((a, b) => {
      // Sort by state (pending first) then by date (newest first)
      if (a.state === "pending" && b.state !== "pending") return -1;
      if (a.state !== "pending" && b.state === "pending") return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({ 
      requests: allNotifications,
      pendingCount: allNotifications.filter(r => r.state === "pending").length 
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/attendance/admin/remote - Approve or reject a request (remote work or correction)
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { requestId, action, type } = body;

    if (!requestId || !action || !type) {
      return NextResponse.json({ error: "Request ID, action, and type are required" }, { status: 400 });
    }

    if (action !== "approved" && action !== "rejected") {
      return NextResponse.json({ error: "Action must be 'approved' or 'rejected'" }, { status: 400 });
    }

    let updatedRequest;

    if (type === "remote_work") {
      // Update remote work request
      // @ts-expect-error - Prisma type will be available after server restart
      updatedRequest = await prisma.remoteWorkRequest.update({
        where: { id: requestId },
        data: {
          state: action,
          approvedBy: session.user.email,
          approvedAt: new Date(),
        },
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });
    } else if (type === "attendance_correction") {
      // Get the correction request first to access its data
      const correctionRequest = await prisma.attendanceCorrection.findUnique({
        where: { id: requestId },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      if (!correctionRequest) {
        return NextResponse.json({ error: "Correction request not found" }, { status: 404 });
      }

      // Update correction request state
      updatedRequest = await prisma.attendanceCorrection.update({
        where: { id: requestId },
        data: {
          state: action,
          updatedAt: new Date(),
        },
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // If approved, apply the correction to the actual attendance record
      if (action === "approved") {
        const correctionDate = new Date(correctionRequest.date);
        correctionDate.setHours(0, 0, 0, 0);

        // Find or create attendance record for that date
        const existingAttendance = await prisma.attendance.findUnique({
          where: {
            employeeId_date: {
              employeeId: correctionRequest.employeeId,
              date: correctionDate,
            },
          },
        });

        // Prepare update data based on the correction issue
        const updateData: {
          checkIn?: Date | null;
          checkOut?: Date | null;
          status?: string;
        } = {};

        if (correctionRequest.requestedCheckIn) {
          updateData.checkIn = new Date(correctionRequest.requestedCheckIn);
        }

        if (correctionRequest.requestedCheckOut) {
          updateData.checkOut = new Date(correctionRequest.requestedCheckOut);
        }

        // Update status based on the issue type and corrected times
        if (correctionRequest.issue === "Forgot to check in" && updateData.checkIn) {
          updateData.status = "present";
        } else if (correctionRequest.issue === "Forgot to check out" && updateData.checkOut) {
          updateData.status = "present";
        } else if (correctionRequest.issue === "Wrong check-in time" || correctionRequest.issue === "Wrong check-out time") {
          // Keep or set status based on corrected time
          if (updateData.checkIn) {
            const checkInTime = new Date(updateData.checkIn);
            const shiftStart = new Date(correctionDate);
            shiftStart.setHours(9, 15, 0, 0); // 9:15 AM late threshold
            updateData.status = checkInTime > shiftStart ? "late" : "present";
          } else {
            updateData.status = existingAttendance?.status || "present";
          }
        } else if (correctionRequest.issue === "Location issue") {
          // Just update the status to present if location was the issue
          updateData.status = "present";
        }

        if (existingAttendance) {
          // Update existing attendance
          await prisma.attendance.update({
            where: {
              employeeId_date: {
                employeeId: correctionRequest.employeeId,
                date: correctionDate,
              },
            },
            data: updateData,
          });
        } else {
          // Create new attendance record
          await prisma.attendance.create({
            data: {
              employeeId: correctionRequest.employeeId,
              date: correctionDate,
              checkIn: updateData.checkIn || null,
              checkOut: updateData.checkOut || null,
              status: updateData.status || "present",
            },
          });
        }
      }
    } else {
      return NextResponse.json({ error: "Invalid request type" }, { status: 400 });
    }

    return NextResponse.json({
      message: `Request ${action} successfully`,
      request: updatedRequest,
    });
  } catch (error) {
    console.error("Error updating request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
