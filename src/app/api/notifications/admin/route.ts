import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Normalize statuses to lowercase variants used by UI
const normalizeState = (value: string | null | undefined): "pending" | "approved" | "rejected" => {
  const v = (value || "").toLowerCase();
  if (v === "approved") return "approved";
  if (v === "rejected" || v === "declined") return "rejected";
  return "pending";
};

const dateLabel = (value: Date) =>
  value.toLocaleDateString("en-US", { month: "short", day: "numeric" });

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    const role = session?.user?.role || (session as any)?.user?.role; // fallback for lowercase

    if (!email || (role !== "ADMIN" && role !== "admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [remote, corrections, leaves] = await Promise.all([
      prisma.remoteWorkRequest.findMany({
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
        orderBy: { createdAt: "desc" },
      }) as any,
      prisma.attendanceCorrection.findMany({
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
        orderBy: { createdAt: "desc" },
      }),
      prisma.leave.findMany({
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
        orderBy: { startDate: "desc" },
      }),
    ]);

    const notifications: Array<{
      id: string;
      type: "remote_work" | "attendance_correction" | "leave";
      state: "pending" | "approved" | "rejected";
      title: string;
      message: string;
      employeeName: string;
      employeeEmail: string;
      department: string | null;
      jobTitle: string | null;
      createdAt: string;
    }> = [];

    remote.forEach((r: any) => {
      const state = normalizeState(r.state);
      notifications.push({
        id: String(r.id),
        type: "remote_work",
        state,
        title: state === "pending" ? "Remote work request" : `Remote work ${state}`,
        message: `${r.employee.firstName} ${r.employee.lastName} requested remote work ${dateLabel(r.startDate)} - ${dateLabel(r.endDate)}.`,
        employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
        employeeEmail: r.employee.email,
        department: r.employee.department,
        jobTitle: r.employee.jobTitle,
        createdAt: r.createdAt.toISOString(),
      });
    });

    corrections.forEach((c) => {
      const state = normalizeState(c.state);
      const day = dateLabel(c.date);
      notifications.push({
        id: String(c.id),
        type: "attendance_correction",
        state,
        title: state === "pending" ? "Attendance correction" : `Attendance ${state}`,
        message: `${c.employee.firstName} ${c.employee.lastName} reported "${c.issue}" for ${day}.`,
        employeeName: `${c.employee.firstName} ${c.employee.lastName}`,
        employeeEmail: c.employee.email,
        department: c.employee.department,
        jobTitle: c.employee.jobTitle,
        createdAt: c.createdAt.toISOString(),
      });
    });

    leaves.forEach((l) => {
      const state = normalizeState(l.status);
      const range = `${dateLabel(l.startDate)} - ${dateLabel(l.endDate)}`;
      notifications.push({
        id: String(l.id),
        type: "leave",
        state,
        title: state === "pending" ? "Leave request" : `Leave ${state}`,
        message: `${l.employee.firstName} ${l.employee.lastName} requested ${l.type} leave (${range}).`,
        employeeName: `${l.employee.firstName} ${l.employee.lastName}`,
        employeeEmail: l.employee.email,
        department: l.employee.department,
        jobTitle: l.employee.jobTitle,
        createdAt: (l.updatedAt || l.startDate || l.createdAt).toISOString(),
      });
    });

    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const pendingCount = notifications.filter((n) => n.state === "pending").length;

    return NextResponse.json({ notifications, pendingCount });
  } catch (error) {
    console.error("Admin notifications error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
