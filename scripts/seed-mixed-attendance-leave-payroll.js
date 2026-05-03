const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const ATTENDANCE_DAYS = 21;

function dateOnlyUtc(date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

function withTimeUtc(baseDate, hour, minute) {
  return new Date(
    Date.UTC(
      baseDate.getUTCFullYear(),
      baseDate.getUTCMonth(),
      baseDate.getUTCDate(),
      hour,
      minute,
      0,
      0
    )
  );
}

function statusFor(employeeIndex, dayIndex) {
  const pattern = ['Present', 'Late', 'Half-day', 'Absent', 'Present', 'Late', 'Present'];
  return pattern[(employeeIndex + dayIndex) % pattern.length];
}

function buildTimes(dayDate, status, dayIndex) {
  if (status === 'Absent') return { checkIn: null, checkOut: null };

  if (status === 'Late') {
    const checkIn = withTimeUtc(dayDate, 10, (dayIndex % 2) * 10);
    const checkOut = withTimeUtc(dayDate, 19, (dayIndex % 3) * 10);
    return { checkIn, checkOut };
  }

  if (status === 'Half-day') {
    const checkIn = withTimeUtc(dayDate, 9, 10);
    const checkOut = withTimeUtc(dayDate, 13, 15);
    return { checkIn, checkOut };
  }

  const checkIn = withTimeUtc(dayDate, 8, 55);
  const checkOut = withTimeUtc(dayDate, 18, dayIndex % 2 === 0 ? 20 : 0);
  return { checkIn, checkOut };
}

async function seedAttendance(employees) {
  let upserted = 0;
  const today = new Date();

  for (let dayOffset = ATTENDANCE_DAYS - 1; dayOffset >= 0; dayOffset -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - dayOffset);
    const attendanceDate = dateOnlyUtc(day);

    for (let employeeIndex = 0; employeeIndex < employees.length; employeeIndex += 1) {
      const employee = employees[employeeIndex];
      const status = statusFor(employeeIndex, dayOffset);
      const times = buildTimes(attendanceDate, status, dayOffset);

      await prisma.attendance.upsert({
        where: {
          employeeId_date: {
            employeeId: employee.id,
            date: attendanceDate
          }
        },
        update: {
          status,
          checkIn: times.checkIn,
          checkOut: times.checkOut
        },
        create: {
          employeeId: employee.id,
          date: attendanceDate,
          status,
          checkIn: times.checkIn,
          checkOut: times.checkOut
        }
      });

      upserted += 1;
    }
  }

  const summary = await prisma.attendance.groupBy({
    by: ['status'],
    _count: { id: true },
    where: {
      employeeId: { in: employees.map((employee) => employee.id) },
      date: { gte: dateOnlyUtc(new Date(today.getFullYear(), today.getMonth(), today.getDate() - ATTENDANCE_DAYS + 1)) }
    }
  });

  return { upserted, summary };
}

async function seedLeaves(employees) {
  const leaveTypes = ['Annual', 'Sick', 'Casual'];
  const leaveStatuses = ['Approved', 'Pending', 'Rejected'];
  const today = new Date();

  await prisma.leave.deleteMany({
    where: {
      employeeId: { in: employees.map((employee) => employee.id) },
      reason: { startsWith: 'Seeded mixed leave' }
    }
  });

  let created = 0;
  for (let index = 0; index < employees.length; index += 1) {
    const employee = employees[index];
    const type = leaveTypes[index % leaveTypes.length];
    const status = leaveStatuses[index % leaveStatuses.length];
    const span = (index % 3) + 1;

    const start = new Date(today);
    start.setDate(today.getDate() - ((index % 8) + 2));
    const end = new Date(start);
    end.setDate(start.getDate() + span - 1);

    await prisma.leave.create({
      data: {
        employeeId: employee.id,
        type,
        startDate: dateOnlyUtc(start),
        endDate: dateOnlyUtc(end),
        status,
        isPaid: status === 'Approved' ? index % 2 === 0 : null,
        reason: `Seeded mixed leave (${status})`
      }
    });
    created += 1;
  }

  const statusSummary = await prisma.leave.groupBy({
    by: ['status'],
    _count: { id: true },
    where: {
      employeeId: { in: employees.map((employee) => employee.id) },
      reason: { startsWith: 'Seeded mixed leave' }
    }
  });

  return { created, statusSummary };
}

async function seedPayrollWithBonusAndOvertime(employees) {
  const now = new Date();
  const periodYear = now.getFullYear();
  const periodMonth = now.getMonth() + 1;
  const payDate = new Date(Date.UTC(periodYear, now.getMonth(), Math.min(28, now.getDate())));

  const run = await prisma.payrollRun.upsert({
    where: {
      periodYear_periodMonth: { periodYear, periodMonth }
    },
    update: {
      status: 'processed',
      processedAt: new Date()
    },
    create: {
      periodYear,
      periodMonth,
      status: 'processed',
      processedAt: new Date()
    }
  });

  await prisma.payrollRecord.deleteMany({
    where: { runId: run.id }
  });

  let created = 0;
  for (let index = 0; index < employees.length; index += 1) {
    const employee = employees[index];
    const baseSalary = Math.round(employee.salary || 100000);
    const overtimeHours = Number((1.5 + (index % 6) * 1.25).toFixed(1));
    const bonus = Math.round(4000 + overtimeHours * 2300 + (index % 3) * 1800);
    const deductions = Math.round(baseSalary * (0.04 + (index % 4) * 0.01));
    const netPay = Math.max(0, baseSalary + bonus - deductions);

    await prisma.payrollRecord.create({
      data: {
        runId: run.id,
        employeeId: employee.id,
        department: employee.department || null,
        baseSalary,
        bonus,
        deductions,
        netPay,
        overtimeHours,
        unpaidLeaveDays: index % 2,
        paidLeaveDays: index % 3,
        absentDays: index % 2,
        chargeableLeave: (index % 2) + (index % 3),
        workingDays: 22,
        status: index % 3 === 0 ? 'Processed' : 'Pending',
        payDate: index % 3 === 0 ? payDate : null,
        periodYear,
        periodMonth
      }
    });
    created += 1;
  }

  const totals = await prisma.payrollRecord.aggregate({
    where: { runId: run.id },
    _sum: { bonus: true, overtimeHours: true }
  });

  return {
    created,
    periodYear,
    periodMonth,
    totalBonus: totals._sum.bonus || 0,
    totalOvertimeHours: totals._sum.overtimeHours || 0
  };
}

async function run() {
  try {
    const employees = await prisma.employee.findMany({
      where: { email: { endsWith: '@nexora.pk' } },
      select: { id: true, firstName: true, lastName: true, department: true, salary: true },
      orderBy: { id: 'asc' }
    });

    if (employees.length === 0) {
      console.log('No seeded employees found. Run seed-20-pakistani-employees.js first.');
      return;
    }

    const attendanceResult = await seedAttendance(employees);
    const leaveResult = await seedLeaves(employees);
    const payrollResult = await seedPayrollWithBonusAndOvertime(employees);

    console.log(`Attendance upserted: ${attendanceResult.upserted}`);
    attendanceResult.summary.forEach((item) => {
      console.log(`Attendance ${item.status}: ${item._count.id}`);
    });

    console.log(`Leaves created: ${leaveResult.created}`);
    leaveResult.statusSummary.forEach((item) => {
      console.log(`Leave ${item.status}: ${item._count.id}`);
    });

    console.log(
      `Payroll records created: ${payrollResult.created} for ${payrollResult.periodYear}-${String(
        payrollResult.periodMonth
      ).padStart(2, '0')}`
    );
    console.log(`Total overtime hours: ${Number(payrollResult.totalOvertimeHours).toFixed(1)}`);
    console.log(`Total bonus amount: ${Math.round(payrollResult.totalBonus)}`);
  } catch (error) {
    console.error('Mixed seed failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

run();
