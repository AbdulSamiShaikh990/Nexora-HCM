import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type PayrollStatus = "Processed" | "Pending";

// GET /api/payroll -> list payroll records
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

    const run = await prisma.payrollRun.findFirst({ where: whereRun });
    const runId = run?.id;

    const where: any = {};
    if (runId) where.runId = runId;
    if (department) where.department = department;
    if (status) where.status = status;
    if (employeeId) where.employeeId = Number(employeeId);

    const total = await prisma.payrollRecord.count({ where });
    const data = await prisma.payrollRecord.findMany({
      where,
      orderBy: { id: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { employee: true, run: true },
    });

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

function hoursBetween(checkIn?: Date | null, checkOut?: Date | null) {
  if (!checkIn || !checkOut) return 0;
  const diffMs = checkOut.getTime() - checkIn.getTime();
  return Math.max(0, diffMs / (1000 * 60 * 60));
}

// POST /api/payroll/run -> create or recalc a payroll run for year-month
export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get("year"));
    const month = Number(searchParams.get("month")); // 1-12
    const taxRate = Number(searchParams.get("taxRate") || 0); // Tax rate in percentage (e.g., 10 for 10%)
    if (!year || !month) return NextResponse.json({ error: "Provide year and month" }, { status: 400 });

    const workingDays = businessDaysInMonth(year, month);
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0);

    const run = await prisma.payrollRun.upsert({
      where: { periodYear_periodMonth: { periodYear: year, periodMonth: month } },
      update: { status: "processing" },
      create: { periodYear: year, periodMonth: month, status: "processing", currency: "PKR" },
    });

    const employees = await prisma.employee.findMany({ where: { status: "Active" } });

    if (employees.length === 0) {
      return NextResponse.json(
        { error: "No active employees found. Please add employees with Active status first." },
        { status: 400 }
      );
    }

    // clear existing records for this run
    await prisma.payrollRecord.deleteMany({ where: { runId: run.id } });

    for (const emp of employees) {
      // Use employee's actual salary from database
      const base = Number(emp.salary ?? 0);
      const allowance = Math.max(0, emp.leaveBalance ?? 0);

      // Get approved leaves for this period
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

      // Calculate leave days
      let paidLeaveDays = 0;
      let unpaidLeaveDays = 0;
      const approvedLeaveDates = new Set<string>(); // Track dates with approved leave
      
      for (const lv of leaves) {
        const days = overlapDays(lv.startDate, lv.endDate, periodStart, periodEnd);
        if (lv.isPaid === true) {
          paidLeaveDays += days;
        } else {
          unpaidLeaveDays += days;
        }
        // Mark all dates in this leave as approved
        const lvStart = lv.startDate > periodStart ? lv.startDate : periodStart;
        const lvEnd = lv.endDate < periodEnd ? lv.endDate : periodEnd;
        const d = new Date(lvStart);
        while (d <= lvEnd) {
          approvedLeaveDates.add(d.toISOString().split('T')[0]);
          d.setDate(d.getDate() + 1);
        }
      }

      // Get attendance records for this period
      const attendances = await prisma.attendance.findMany({
        where: {
          employeeId: emp.id,
          date: { gte: periodStart, lte: periodEnd },
        },
      });

      // Create a map of dates with attendance records
      const attendanceDates = new Map<string, typeof attendances[0]>();
      for (const a of attendances) {
        const dateStr = a.date.toISOString().split('T')[0];
        attendanceDates.set(dateStr, a);
      }

      // Calculate overtime and absent days
      let overtimeHours = 0;
      let absentWithoutLeave = 0;
      
      console.log(`Processing attendance for ${emp.firstName} ${emp.lastName}:`);
      console.log(`Found ${attendances.length} attendance records`);

      // Loop through all weekdays (Mon-Fri) in the period
      const today = new Date();
      const currentDate = new Date(periodStart);
      
      while (currentDate <= periodEnd && currentDate <= today) {
        const dayOfWeek = currentDate.getDay();
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // Skip weekends (Saturday=6, Sunday=0)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          const attendance = attendanceDates.get(dateStr);
          
          if (!attendance) {
            // No check-in record for this weekday
            if (!approvedLeaveDates.has(dateStr)) {
              // No attendance AND no approved leave = Absent
              absentWithoutLeave += 1;
              console.log(`${emp.firstName}: NO CHECK-IN (Absent) on ${dateStr}`);
            } else {
              console.log(`${emp.firstName}: On leave (approved) on ${dateStr}`);
            }
          } else if (attendance.status === "Absent") {
            // Marked as absent explicitly
            if (!approvedLeaveDates.has(dateStr)) {
              absentWithoutLeave += 1;
              console.log(`${emp.firstName}: Marked ABSENT on ${dateStr}`);
            }
          } else if (attendance.status === "Present" || attendance.status === "Late") {
            // Calculate overtime for present/late days
            const hours = hoursBetween(attendance.checkIn, attendance.checkOut);
            const extraHours = Math.max(0, hours - 8);
            overtimeHours += extraHours;
            if (extraHours > 0) {
              console.log(`${emp.firstName}: ${dateStr} - Worked ${hours.toFixed(1)}h, Overtime: ${extraHours.toFixed(1)}h`);
            }
          }
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      console.log(`${emp.firstName} Total: Overtime=${overtimeHours.toFixed(1)}h, Absent=${absentWithoutLeave} days`);

      // Calculate deductions
      const dailyRate = workingDays > 0 ? base / workingDays : 0;
      const hourlyRate = workingDays > 0 ? base / (workingDays * 8) : 0;
      
      // Unpaid leave deduction
      const unpaidLeaveDeduction = Math.round(dailyRate * unpaidLeaveDays);
      
      // Absent without leave deduction (full day deduction)
      const absentDeduction = Math.round(dailyRate * absentWithoutLeave);
      
      // Paid leave over allowance deduction
      const totalLeaveDays = paidLeaveDays + unpaidLeaveDays;
      const excessOverAllowance = Math.max(0, totalLeaveDays - allowance);
      const excessDeduction = Math.round(dailyRate * excessOverAllowance);
      
      // Total chargeable leave = unpaid + absent without leave + excess over allowance
      const chargeableLeave = unpaidLeaveDays + absentWithoutLeave + excessOverAllowance;
      const totalLeaveDeduction = unpaidLeaveDeduction + absentDeduction + excessDeduction;
      
      // Overtime pay (1.5x hourly rate)
      const overtimePay = Math.round(overtimeHours * hourlyRate * 1.5);
      const bonus = overtimePay;
      
      // Tax deduction (applied on gross pay = base + bonus)
      const grossPay = base + bonus;
      const taxDeduction = Math.round((grossPay * taxRate) / 100);
      
      // Total deductions = leave deductions + tax
      const totalDeductions = totalLeaveDeduction + taxDeduction;
      
      // Net pay calculation - ensure it never goes below zero
      const grossTotal = base + bonus;
      const net = Math.max(0, grossTotal - totalDeductions);
      
      // If deductions exceed gross pay, cap deductions at gross pay amount
      const finalDeductions = totalDeductions > grossTotal ? grossTotal : totalDeductions;

      await prisma.payrollRecord.create({
        data: {
          runId: run.id,
          employeeId: emp.id,
          department: emp.department,
          baseSalary: base,
          bonus,
          deductions: finalDeductions,
          netPay: net,
          status: "Pending",
          payDate: null,
          periodYear: year,
          periodMonth: month,
          overtimeHours,
          unpaidLeaveDays: unpaidLeaveDays,
          paidLeaveDays: paidLeaveDays,
          absentDays: absentWithoutLeave, // Store absent days separately
          chargeableLeave: chargeableLeave,
          workingDays,
        },
      });
    }

    await prisma.payrollRun.update({ where: { id: run.id }, data: { status: "processed", processedAt: new Date() } });

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
    const record = await prisma.payrollRecord.findUnique({ where: { id } });
    if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const baseSalary = body.baseSalary ?? record.baseSalary;
    const bonus = body.bonus ?? record.bonus ?? 0;
    const deductions = body.deductions ?? record.deductions ?? 0; // includes leave deduction for now
    const netPay = Math.max(0, baseSalary + bonus - deductions);

    const updated = await prisma.payrollRecord.update({
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