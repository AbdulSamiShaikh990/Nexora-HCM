import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

// Types for leave query
interface LeaveWhereInput {
  AND?: Prisma.LeaveWhereInput[];
  startDate?: { lte?: Date; gte?: Date };
  endDate?: { lte?: Date; gte?: Date };
  status?: string;
  type?: string;
  employeeId?: number;
  employee?: {
    department?: string;
    OR?: Array<{
      firstName?: { contains: string; mode: Prisma.QueryMode };
      lastName?: { contains: string; mode: Prisma.QueryMode };
      email?: { contains: string; mode: Prisma.QueryMode };
    }>;
  };
}

// Placeholder API for Leave management. Replace with Prisma logic later.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const q = searchParams.get("q");
    const department = searchParams.get("department");
    const month = searchParams.get("month"); // YYYY-MM
    const employeeId = searchParams.get("employeeId");
    const page = parseInt(searchParams.get("page") || "1");
    const size = parseInt(searchParams.get("size") || "20");

    const where: LeaveWhereInput = {};
    // Build a combined date window [winStart, winEnd] using month and/or from/to
    let winStart: Date | null = null;
    let winEnd: Date | null = null;
    if (month) {
      const [y, m] = month.split("-").map(Number);
      winStart = new Date(Date.UTC(y, (m - 1), 1, 0, 0, 0));
      winEnd = new Date(Date.UTC(y, (m - 1) + 1, 0, 23, 59, 59));
    }
    if (from) {
      const f = new Date(from + "T00:00:00.000Z");
      winStart = winStart ? new Date(Math.max(winStart.getTime(), f.getTime())) : f;
    }
    if (to) {
      const t = new Date(to + "T23:59:59.999Z");
      winEnd = winEnd ? new Date(Math.min(winEnd.getTime(), t.getTime())) : t;
    }
    if (winStart && winEnd) {
      // Overlap filter: leave overlaps with [winStart, winEnd]
      where.AND = [
        { startDate: { lte: winEnd } },
        { endDate: { gte: winStart } },
      ];
    } else if (winStart) {
      where.endDate = { gte: winStart };
    } else if (winEnd) {
      where.startDate = { lte: winEnd };
    }
    if (status && status !== "all") where.status = status;
    if (type && type !== "all") where.type = type;
    if (department && department !== "all") where.employee = { department };
    if (employeeId) where.employeeId = parseInt(employeeId);
    if (q) {
      where.employee = {
        ...(where.employee || {}),
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      };
    }

    const skip = (page - 1) * size;
    const [rows, total] = await Promise.all([
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
              leaveBalance: true,
              jobTitle: true,
              phone: true,
              status: true
            }
          },
        },
        orderBy: { startDate: "desc" },
        skip,
        take: size,
      }),
      prisma.leave.count({ where }),
    ]);

    const data = rows.map((r) => {
      const leaveRecord = r as typeof r & { isPaid?: boolean | null };
      return {
        id: r.id,
        type: r.type,
        startDate: r.startDate.toISOString(),
        endDate: r.endDate.toISOString(),
        days: Math.max(1, Math.ceil((r.endDate.getTime() - r.startDate.getTime() + 1) / (1000 * 60 * 60 * 24))),
        reason: r.reason || "-",
        status: r.status,
        employeeId: r.employeeId,
        employee: `${r.employee.firstName} ${r.employee.lastName}`,
        employeeEmail: r.employee.email,
        employeeJobTitle: r.employee.jobTitle,
        employeePhone: r.employee.phone || "-",
        employeeStatus: r.employee.status,
        department: r.employee.department,
        leaveBalance: r.employee.leaveBalance ?? 0,
        isPaid: leaveRecord.isPaid ?? null,
        paid: /annual|sick|vacation/i.test(r.type) ? true : false,
      };
    });

    // Stats for dashboard cards (scoped to current filter month if provided)
    let monthStart: Date | null = null;
    let monthEnd: Date | null = null;
    if (month) {
      const [y, m] = month.split("-").map(Number);
      monthStart = new Date(Date.UTC(y, (m - 1), 1, 0, 0, 0));
      monthEnd = new Date(Date.UTC(y, (m - 1) + 1, 0, 23, 59, 59));
    }

    const statsWhere: LeaveWhereInput = { ...where };
    if (monthStart && monthEnd) {
      statsWhere.startDate = { gte: monthStart, lte: monthEnd };
    }
    const monthRows = await prisma.leave.findMany({
      where: statsWhere,
      include: { employee: { select: { id: true, department: true, firstName: true, lastName: true } } },
    });
    const totalThisMonth = monthRows.length;
    const pendingThisMonth = monthRows.filter((r) => r.status === "Pending").length;
    const employeesInMonth = new Set(monthRows.map((r) => r.employeeId)).size || 1;
    const totalDaysInMonth = monthRows.reduce((acc, r) => acc + Math.max(1, Math.ceil((r.endDate.getTime() - r.startDate.getTime() + 1) / (1000 * 60 * 60 * 24))), 0);
    const avgPerEmployee = Number((totalDaysInMonth / employeesInMonth).toFixed(2));

    // Simple insights & alerts
    // Calendar day status (highest severity: Rejected > Pending > Approved)
    const dayStatus: Record<string, "Approved" | "Pending" | "Rejected"> = {};
    const severity: Record<string, number> = { Approved: 1, Pending: 2, Rejected: 3 };
    for (const r of monthRows) {
      const d = r.startDate.toISOString().slice(0, 10);
      if (!dayStatus[d] || severity[r.status] > severity[dayStatus[d]]) dayStatus[d] = r.status as "Approved" | "Pending" | "Rejected";
    }

    // Per-employee counts to detect suspicious patterns
    const countsByEmp: Record<number, number> = {};
    for (const r of monthRows) countsByEmp[r.employeeId] = (countsByEmp[r.employeeId] || 0) + 1;
    const highAbsenteeism = Object.entries(countsByEmp).filter(([, c]) => c >= 4).length;

    // Overlap alerts per department per day (rough)
    const overlapsByDept: Record<string, number> = {};
    for (const r of monthRows) overlapsByDept[r.employee.department] = (overlapsByDept[r.employee.department] || 0) + 1;

    // Row-level suggestions
    const suggestions = data.map((r) => {
      let suggestion = "review";
      if (r.leaveBalance >= r.days && r.status === "Pending") suggestion = "approve";
      if (/emergency|urgent/i.test(r.reason)) suggestion = "approve";
      const category = /sick|medical/i.test(r.reason) ? "health" : /vacation|trip|travel/i.test(r.reason) ? "vacation" : /personal|family/i.test(r.reason) ? "personal" : "other";
      return { id: r.id, suggestion, category };
    });

    return NextResponse.json({
      data,
      pagination: { page, size, total, totalPages: Math.ceil(total / size) },
      stats: { totalThisMonth, pendingThisMonth, avgPerEmployee },
      calendar: dayStatus,
      alerts: {
        overlappingDepartments: Object.entries(overlapsByDept).map(([dept, count]) => ({ department: dept, count })),
        nearingLeaveLimits: data.filter((r) => r.leaveBalance <= 2).map((r) => ({ employeeId: r.employeeId, employee: r.employee })),
        highAbsenteeism,
      },
      insights: suggestions,
    });
  } catch (e) {
    console.error("[Leave API GET Error]", e);
    const message = e instanceof Error ? e.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { employeeId, type, startDate, endDate, reason } = body;
    if (!employeeId || !type || !startDate || !endDate) {
      return NextResponse.json({ error: "employeeId, type, startDate, endDate are required" }, { status: 400 });
    }
    const empId = parseInt(String(employeeId));
    const s = new Date(startDate);
    const e = new Date(endDate);
    const days = Math.max(1, Math.ceil((e.getTime() - s.getTime() + 1) / (1000 * 60 * 60 * 24)));

    // Auto-approve: enough balance and no overlaps
    const emp = await prisma.employee.findUnique({ where: { id: empId }, select: { leaveBalance: true, department: true } });
    let nextStatus: string = "Pending";
    if (emp) {
      const overlaps = await prisma.leave.count({
        where: {
          status: "Approved",
          OR: [{ startDate: { lte: e }, endDate: { gte: s } }],
          employee: { department: emp.department },
        },
      });
      const okBalance = (emp.leaveBalance ?? 0) >= days;
      const okOverlap = overlaps < 2;
      if (okBalance && okOverlap) nextStatus = "Approved";
    }

    // Auto-approve path: balance deduction should always occur if auto-approved
    let row;
    if (nextStatus === "Approved") {
      // create leave and optionally decrement balance if paid
      row = await prisma.$transaction(async (tx) => {
        const created = await tx.leave.create({
          data: {
            employeeId: empId,
            type,
            startDate: s,
            endDate: e,
            reason: reason || null,
            status: nextStatus,
          },
        });
        // Always deduct balance on auto-approve
        const empCurrent = await tx.employee.findUnique({ where: { id: empId }, select: { leaveBalance: true } });
        const newBal = Math.max(0, (empCurrent?.leaveBalance ?? 0) - days);
        await tx.employee.update({ where: { id: empId }, data: { leaveBalance: newBal } });
        return created;
      });
    } else {
      row = await prisma.leave.create({
        data: {
          employeeId: empId,
          type,
          startDate: s,
          endDate: e,
          reason: reason || null,
          status: nextStatus,
        },
      });
    }
    return NextResponse.json({ success: true, data: row }, { status: 201 });
  } catch (e) {
    console.error("[Leave API POST Error]", e);
    const message = e instanceof Error ? e.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, status, reason, maxOverlap } = body as { id: number; status: string; reason?: string; maxOverlap?: number };
    if (!id || !status) return NextResponse.json({ error: "id and status are required" }, { status: 400 });
    const updateData: { status: string; reason?: string } = { status };
    if (reason) updateData.reason = reason; // store approver/rejector comment visibly
    // Overlap prevention when approving
    if (status === "Approved") {
      const threshold = typeof maxOverlap === "number" ? maxOverlap : 2;
      const target = await prisma.leave.findUnique({ where: { id: parseInt(String(id)) }, include: { employee: { select: { department: true, id: true, leaveBalance: true } } } });
      if (!target) return NextResponse.json({ error: "Leave not found" }, { status: 404 });
      const overlaps = await prisma.leave.findMany({
        where: {
          id: { not: target.id },
          status: "Approved",
          employee: { department: target.employee.department },
          OR: [
            { startDate: { lte: target.endDate }, endDate: { gte: target.startDate } },
          ],
        },
      });
      if (overlaps.length >= threshold) {
        return NextResponse.json({ error: `Too many overlapping leaves in department (${overlaps.length}/${threshold}).` }, { status: 409 });
      }
      // Determine paid status (salary only); balance deduction is independent and always on first approval
      const days = Math.max(1, Math.ceil((target.endDate.getTime() - target.startDate.getTime() + 1) / (1000 * 60 * 60 * 24)));
      const row = await prisma.$transaction(async (tx) => {
        const before = await tx.leave.findUnique({ where: { id: target.id } });
        const updated = await tx.leave.update({ where: { id: target.id }, data: { ...updateData } });
        if (before?.status !== "Approved") {
          // First time approval: always deduct leave balance by days (clamped at 0)
          const emp = await tx.employee.findUnique({ where: { id: target.employee.id }, select: { leaveBalance: true } });
          const newBal = Math.max(0, (emp?.leaveBalance ?? 0) - days);
          await tx.employee.update({ where: { id: target.employee.id }, data: { leaveBalance: newBal } });
        }
        return updated;
      });
      try {
        await prisma.auditLog.create({
          data: {
            action: `LEAVE_${status.toUpperCase()}`,
            by: "system",
            employeeId: row.employeeId,
          },
        });
      } catch {}
      return NextResponse.json({ success: true, data: row }, { status: 200 });
    }

    // Non-approve statuses: Reject restores balance if previously Approved
    if (status === "Rejected") {
      const target = await prisma.leave.findUnique({ where: { id: parseInt(String(id)) } });
      if (!target) return NextResponse.json({ error: "Leave not found" }, { status: 404 });
      const days = Math.max(1, Math.ceil((target.endDate.getTime() - target.startDate.getTime() + 1) / (1000 * 60 * 60 * 24)));
      const row = await prisma.$transaction(async (tx) => {
        const before = await tx.leave.findUnique({ where: { id: target.id } });
        const updated = await tx.leave.update({ where: { id: target.id }, data: updateData });
        if (before?.status === "Approved") {
          // Restore balance
          const emp = await tx.employee.findUnique({ where: { id: target.employeeId }, select: { leaveBalance: true } });
          const newBal = (emp?.leaveBalance ?? 0) + days;
          await tx.employee.update({ where: { id: target.employeeId }, data: { leaveBalance: newBal } });
        }
        return updated;
      });
      try {
        await prisma.auditLog.create({
          data: { action: `LEAVE_${status.toUpperCase()}`, by: "system", employeeId: row.employeeId },
        });
      } catch {}
      return NextResponse.json({ success: true, data: row }, { status: 200 });
    }

    // Other statuses follow normal path
    const row = await prisma.leave.update({ where: { id: parseInt(String(id)) }, data: updateData });
    try {
      await prisma.auditLog.create({
        data: {
          action: `LEAVE_${status.toUpperCase()}`,
          by: "system",
          employeeId: row.employeeId,
        },
      });
    } catch {}
    return NextResponse.json({ success: true, data: row }, { status: 200 });
  } catch (e) {
    console.error("[Leave API PUT Error]", e);
    const message = e instanceof Error ? e.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const leave = await prisma.leave.findUnique({ where: { id: parseInt(String(id)) }, include: { employee: true } });
    if (!leave) return NextResponse.json({ error: "Leave not found" }, { status: 404 });
    await prisma.leave.delete({ where: { id: leave.id } });
    return NextResponse.json({ success: true, data: leave }, { status: 200 });
  } catch (e) {
    console.error("[Leave API DELETE Error]", e);
    const message = e instanceof Error ? e.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
