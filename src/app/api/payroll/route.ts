import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
// Use a loose handle to avoid TS property errors until migration is applied
const db: any = prisma as any;

// Types (in-file only; no DB models yet)
type PayrollStatus = "Processed" | "Pending";
interface PayrollRecordInput {
  employeeId: number;
  employeeName?: string;
  department?: string;
  baseSalary: number; // USD baseline
  bonus?: number; // USD baseline
  deductions?: number; // USD baseline
  payDate: string; // ISO or MM/DD/YYYY
  status?: PayrollStatus;
  period?: string; // e.g. 2025-10, 2025-W02
  currency?: "USD" | "PKR" | "EUR"; // client display only; storage is USD
}

// GET /api/payroll -> list payroll records (no data yet)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 20)));
    const period = searchParams.get("period") ?? undefined; // format: YYYY-MM
    const department = searchParams.get("department") ?? undefined;
    const status = (searchParams.get("status") as PayrollStatus | null) ?? undefined;
    const employeeId = searchParams.get("employeeId");

    let whereRun: any = {};
    if (period) {
      const [y, m] = period.split("-").map((n) => Number(n));
      if (!isFinite(y) || !isFinite(m)) return NextResponse.json({ error: "Invalid period" }, { status: 400 });
      whereRun = { periodYear: y, periodMonth: m };
    }

    const run = await db.payrollRun?.findFirst({ where: whereRun });

    const runId = run?.id;

    const where: any = {};
    if (runId) where.runId = runId;
    if (department) where.department = department;
    if (status) where.status = status;
    if (employeeId) where.employeeId = Number(employeeId);

    const total = await db.payrollRecord?.count({ where }) ?? 0;
    const data = await db.payrollRecord?.findMany({
      where,
      orderBy: { id: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { employee: true, run: true },
    }) ?? [];

    return NextResponse.json(
      {
        data,
        filters: { period, department, status, employeeId },
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Payroll GET error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Helpers
function businessDaysInMonth(year: number, month: number) {
  // month: 1-12
  const m = month - 1;
  const d = new Date(year, m, 1);
  let days = 0;
  while (d.getMonth() === m) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) days++;
    d.setDate(d.getDate() + 1);
  }
  return days || 22; // fallback
}

function overlapDays(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  const start = aStart > bStart ? aStart : bStart;
  const end = aEnd < bEnd ? aEnd : bEnd;
  const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1;
  return Math.max(0, Math.floor(diff));
}

// POST /api/payroll/run -> create or recalc a payroll run for year-month
export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get("year"));
    const month = Number(searchParams.get("month")); // 1-12
    if (!year || !month) return NextResponse.json({ error: "Provide year and month" }, { status: 400 });

    // upsert run
    const run = await db.payrollRun.upsert({
      where: { periodYear_periodMonth: { periodYear: year, periodMonth: month } },
      update: { status: "processing" },
      create: { periodYear: year, periodMonth: month, status: "processing", currency: "USD" },
    });

    const workingDays = businessDaysInMonth(year, month);
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0);

    const employees = await prisma.employee.findMany({ where: { status: "Active" } });

    // clear existing records for this run
    await db.payrollRecord.deleteMany({ where: { runId: run.id } });

    for (const emp of employees) {
      const base = Number(emp.salary ?? 0);
      // fetch approved leaves within period; deduct when isPaid=false
      const leaves = await prisma.leave.findMany({
        where: {
          employeeId: emp.id,
          status: "Approved",
          OR: [
            {
              startDate: { lte: periodEnd },
              endDate: { gte: periodStart },
            },
          ],
        },
      });

      let unpaidDays = 0;
      for (const lv of leaves) {
        const isPaid = lv.isPaid === true; // if false or null => treat as unpaid for deduction
        if (isPaid) continue; // do NOT deduct paid leaves
        const days = overlapDays(lv.startDate, lv.endDate, periodStart, periodEnd);
        unpaidDays += days;
      }

      const dailyRate = workingDays > 0 ? base / workingDays : 0;
      const leaveDeduction = Math.max(0, Math.round(dailyRate * unpaidDays));
      const bonus = 0;
      const otherDeductions = 0;
      const net = Math.max(0, base + bonus - (otherDeductions + leaveDeduction));

      await db.payrollRecord.create({
        data: {
          runId: run.id,
          employeeId: emp.id,
          department: emp.department,
          baseSalary: base,
          bonus,
          deductions: otherDeductions + leaveDeduction,
          netPay: net,
          status: "Pending",
          payDate: null,
        },
      });
    }

    await db.payrollRun.update({ where: { id: run.id }, data: { status: "processed", processedAt: new Date() } });

    return NextResponse.json({ success: true, runId: run.id }, { status: 201 });
  } catch (err) {
    console.error("Payroll POST error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PATCH /api/payroll?id=123 -> update record values & recompute netPay
export async function PATCH(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const body = await req.json();
    const record = await db.payrollRecord.findUnique({ where: { id } });
    if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const baseSalary = body.baseSalary ?? record.baseSalary;
    const bonus = body.bonus ?? record.bonus ?? 0;
    const deductions = body.deductions ?? record.deductions ?? 0; // includes leave deduction for now
    const netPay = Math.max(0, baseSalary + bonus - deductions);

    const updated = await db.payrollRecord.update({
      where: { id },
      data: {
        baseSalary,
        bonus,
        deductions,
        netPay,
        status: (body.status as PayrollStatus) ?? record.status,
        payDate: body.payDate ? new Date(body.payDate) : record.payDate,
      },
    });
    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (err) {
    console.error("Payroll PATCH error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Unsupported methods
export async function PUT() {
  return NextResponse.json({ error: "Not Implemented" }, { status: 501 });
}
export async function DELETE() {
  return NextResponse.json({ error: "Not Implemented" }, { status: 501 });
}