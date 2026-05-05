const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedAttritionMediumRisk() {
  try {
    const cycle = await prisma.reviewCycle.findUnique({
      where: { id: 999001 },
      select: { id: true, name: true }
    });

    if (!cycle) {
      console.log('Attrition cycle 999001 not found. Run seed-attrition-performance-mix.js first.');
      return;
    }

    const employees = await prisma.employee.findMany({
      where: {
        status: 'Active',
        email: { endsWith: '@nexora.pk' }
      },
      orderBy: { id: 'asc' },
      select: { id: true, firstName: true, lastName: true }
    });

    if (employees.length < 10) {
      console.log('Not enough seeded employees found.');
      return;
    }

    const mediumTargets = [
      { employeeId: employees[5].id, salary: 82000 },
      { employeeId: employees[6].id, salary: 78000 },
      { employeeId: employees[7].id, salary: 76000 },
      { employeeId: employees[8].id, salary: 80000 },
      { employeeId: employees[9].id, salary: 74000 }
    ];

    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;
    let updated = 0;

    for (const target of mediumTargets) {
      const employee = employees.find((e) => e.id === target.employeeId);
      if (!employee) continue;

      await prisma.employee.update({
        where: { id: target.employeeId },
        data: {
          salary: target.salary,
          performanceRating: 3
        }
      });

      await prisma.performanceReview.upsert({
        where: {
          employeeId_cycleId: {
            employeeId: target.employeeId,
            cycleId: cycle.id
          }
        },
        update: {
          selfRating: 3,
          selfComment: 'Balanced performance with moderate consistency.',
          managerRating: 3,
          managerComment: 'Average performer with improvement potential.',
          status: 'FINALIZED'
        },
        create: {
          employeeId: target.employeeId,
          cycleId: cycle.id,
          selfRating: 3,
          selfComment: 'Balanced performance with moderate consistency.',
          managerRating: 3,
          managerComment: 'Average performer with improvement potential.',
          status: 'FINALIZED'
        }
      });

      await prisma.performance.upsert({
        where: {
          employeeId_periodYear_periodMonth: {
            employeeId: target.employeeId,
            periodYear: year,
            periodMonth: month
          }
        },
        update: {
          score: 62
        },
        create: {
          employeeId: target.employeeId,
          periodYear: year,
          periodMonth: month,
          score: 62
        }
      });

      updated += 1;
      console.log(`Set medium target: ${employee.firstName} ${employee.lastName} | salary=${target.salary} | rating=3`);
    }

    const distribution = await prisma.performanceReview.groupBy({
      by: ['managerRating'],
      _count: { id: true },
      where: {
        cycleId: cycle.id,
        status: 'FINALIZED',
        managerRating: { not: null }
      }
    });

    console.log(`Cycle: ${cycle.name} (${cycle.id})`);
    console.log(`Medium targets updated: ${updated}`);
    distribution
      .sort((a, b) => (a.managerRating || 0) - (b.managerRating || 0))
      .forEach((row) => {
        console.log(`Rating ${row.managerRating}: ${row._count.id}`);
      });
  } catch (error) {
    console.error('Medium risk seed failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

seedAttritionMediumRisk();
