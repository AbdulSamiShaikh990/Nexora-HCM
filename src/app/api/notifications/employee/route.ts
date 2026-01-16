import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

type NotificationState = "pending" | "approved" | "rejected";
type NotificationType = "leave" | "remote_work" | "attendance_correction" | "task_assigned";

interface EmployeeNotification {
  id: string;
  type: NotificationType;
  state: NotificationState;
  title: string;
  message: string;
  createdAt: string;
}

const normalizeState = (value: string | null | undefined): NotificationState => {
  const normalized = (value || "").toLowerCase();
  if (normalized === "approved") return "approved";
  if (normalized === "rejected" || normalized === "declined") return "rejected";
  return "pending";
};

const formatRange = (start: Date, end: Date) => {
  const startLabel = new Date(start).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endLabel = new Date(end).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employee = await prisma.employee.findFirst({
      where: { email: session.user.email },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const [leaves, remoteRequests, corrections, taskNotifications] = await Promise.all([
      prisma.leave.findMany({
        where: { employeeId: employee.id },
        orderBy: { startDate: "desc" },
      }),
      // @ts-expect-error - Prisma type will be available after server restart
      prisma.remoteWorkRequest.findMany({
        where: { employeeId: employee.id },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.attendanceCorrection.findMany({
        where: { employeeId: employee.id },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.notification.findMany({
        where: { 
          type: "task_assigned",
          // @ts-expect-error - payload is Json type
          payload: {
            path: ["assignedToId"],
            equals: employee.id
          }
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    const notifications: EmployeeNotification[] = [];

    leaves.forEach((leave) => {
      const state = normalizeState(leave.status);
      notifications.push({
        id: `leave-${leave.id}`,
        type: "leave",
        state,
        title: state === "pending" ? "Leave request submitted" : `Leave ${state}`,
        message: `Your ${leave.type} leave (${formatRange(leave.startDate, leave.endDate)}) is ${state}.`,
        createdAt: leave.startDate.toISOString(),
      });
    });

    remoteRequests.forEach((request: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const state = normalizeState(request.state);
      notifications.push({
        id: `remote-${request.id}`,
        type: "remote_work",
        state,
        title: state === "pending" ? "Remote work requested" : `Remote work ${state}`,
        message: `Remote work ${formatRange(request.startDate, request.endDate)} ${state === "pending" ? "awaiting approval" : state === "approved" ? "approved" : "rejected"}.`,
        createdAt: (request.updatedAt || request.createdAt).toISOString(),
      });
    });

    corrections.forEach((correction) => {
      const state = normalizeState(correction.state);
      const dateLabel = new Date(correction.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      notifications.push({
        id: `correction-${correction.id}`,
        type: "attendance_correction",
        state,
        title: state === "pending" ? "Attendance correction submitted" : `Attendance ${state}`,
        message: `${correction.issue} for ${dateLabel} ${state === "pending" ? "awaiting review" : state === "approved" ? "is fixed" : "was rejected"}.`,
        createdAt: correction.updatedAt.toISOString(),
      });
    });

    taskNotifications.forEach((notification) => {
      const payload = notification.payload as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      notifications.push({
        id: `task-${notification.id}`,
        type: "task_assigned",
        state: "pending",
        title: "New Task Assigned",
        message: `${payload.taskTitle} - Priority: ${payload.priority} - Due: ${new Date(payload.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
        createdAt: notification.createdAt.toISOString(),
      });
    });

    notifications.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const pending = notifications.filter((n) => n.state === "pending").length;
    const actionable = notifications.filter((n) => n.state !== "pending").length;

    return NextResponse.json({
      notifications,
      counts: {
        total: notifications.length,
        pending,
        actionable,
      },
    });
  } catch (error) {
    console.error("Employee notifications error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
