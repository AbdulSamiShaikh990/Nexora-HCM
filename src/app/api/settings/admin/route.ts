import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Helper to check if user is admin
async function isAdmin(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true },
  });
  return user?.role === "ADMIN";
}

type AdminSettings = {
  timezone: string;
  dateFormat: string;
  workingDays: number[];
  workingHoursStart: string;
  workingHoursEnd: string;
  defaultLeaveBalance: number;
  probationPeriod: number;
  notifications: {
    emailNotifications: boolean;
    leaveRequestAlerts: boolean;
    attendanceAlerts: boolean;
    payrollNotifications: boolean;
    performanceReminders: boolean;
    birthdayWishes: boolean;
  };
};

const defaultSettings: AdminSettings = {
  timezone: "Asia/Karachi",
  dateFormat: "DD/MM/YYYY",
  workingDays: [1, 2, 3, 4, 5],
  workingHoursStart: "09:00",
  workingHoursEnd: "18:00",
  defaultLeaveBalance: 15,
  probationPeriod: 3,
  notifications: {
    emailNotifications: true,
    leaveRequestAlerts: true,
    attendanceAlerts: true,
    payrollNotifications: true,
    performanceReminders: true,
    birthdayWishes: true,
  },
};

const globalForSettings = globalThis as unknown as {
  __adminSettings?: Map<string, AdminSettings>;
};

const settingsStore = globalForSettings.__adminSettings ?? new Map<string, AdminSettings>();
if (!globalForSettings.__adminSettings) {
  globalForSettings.__adminSettings = settingsStore;
}

// GET - Fetch admin profile and settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin role
    if (!(await isAdmin(session.user.email))) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const storedSettings = settingsStore.get(session.user.email) ?? defaultSettings;

    return NextResponse.json({
      success: true,
      data: {
        admin: {
          id: user.id,
          name: user.name || "Admin User",
          email: user.email,
          role: user.role,
        },
        settings: storedSettings,
      },
    });
  } catch (error) {
    console.error("Error fetching admin settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// PUT - Update admin settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin role
    if (!(await isAdmin(session.user.email))) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const {
      timezone,
      dateFormat,
      workingDays,
      workingHoursStart,
      workingHoursEnd,
      defaultLeaveBalance,
      probationPeriod,
      notifications,
    } = body || {};

    const sanitizedSettings: AdminSettings = {
      timezone: typeof timezone === "string" && timezone ? timezone : defaultSettings.timezone,
      dateFormat: typeof dateFormat === "string" && dateFormat ? dateFormat : defaultSettings.dateFormat,
      workingDays: Array.isArray(workingDays)
        ? workingDays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
        : defaultSettings.workingDays,
      workingHoursStart:
        typeof workingHoursStart === "string" && workingHoursStart
          ? workingHoursStart
          : defaultSettings.workingHoursStart,
      workingHoursEnd:
        typeof workingHoursEnd === "string" && workingHoursEnd
          ? workingHoursEnd
          : defaultSettings.workingHoursEnd,
      defaultLeaveBalance:
        typeof defaultLeaveBalance === "number" && defaultLeaveBalance >= 0
          ? defaultLeaveBalance
          : defaultSettings.defaultLeaveBalance,
      probationPeriod:
        typeof probationPeriod === "number" && probationPeriod >= 0
          ? probationPeriod
          : defaultSettings.probationPeriod,
      notifications: {
        emailNotifications:
          typeof notifications?.emailNotifications === "boolean"
            ? notifications.emailNotifications
            : defaultSettings.notifications.emailNotifications,
        leaveRequestAlerts:
          typeof notifications?.leaveRequestAlerts === "boolean"
            ? notifications.leaveRequestAlerts
            : defaultSettings.notifications.leaveRequestAlerts,
        attendanceAlerts:
          typeof notifications?.attendanceAlerts === "boolean"
            ? notifications.attendanceAlerts
            : defaultSettings.notifications.attendanceAlerts,
        payrollNotifications:
          typeof notifications?.payrollNotifications === "boolean"
            ? notifications.payrollNotifications
            : defaultSettings.notifications.payrollNotifications,
        performanceReminders:
          typeof notifications?.performanceReminders === "boolean"
            ? notifications.performanceReminders
            : defaultSettings.notifications.performanceReminders,
        birthdayWishes:
          typeof notifications?.birthdayWishes === "boolean"
            ? notifications.birthdayWishes
            : defaultSettings.notifications.birthdayWishes,
      },
    };

    settingsStore.set(session.user.email, sanitizedSettings);

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully",
      data: sanitizedSettings,
    });
  } catch (error) {
    console.error("Error updating admin settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
