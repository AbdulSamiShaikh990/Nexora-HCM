const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedAttritionReview() {
  try {
    const employee = await prisma.employee.findFirst({
      where: { status: 'Active' },
      orderBy: { id: 'asc' },
      select: { id: true, firstName: true, lastName: true }
    });

    if (!employee) {
      console.log('❌ No active employees found. Create an employee first.');
      return;
    }

    let cycle = await prisma.reviewCycle.findFirst({
      where: { status: 'OPEN' },
      orderBy: { startDate: 'desc' }
    });

    if (!cycle) {
      cycle = await prisma.reviewCycle.create({
        data: {
          name: 'Attrition Sample Cycle',
          startDate: new Date(new Date().getFullYear(), 0, 1),
          endDate: new Date(new Date().getFullYear(), 11, 31),
          status: 'OPEN'
        }
      });
      console.log(`✅ Review cycle created: ${cycle.name} (ID: ${cycle.id})`);
    }

    const review = await prisma.performanceReview.upsert({
      where: {
        employeeId_cycleId: {
          employeeId: employee.id,
          cycleId: cycle.id
        }
      },
      update: {
        selfRating: 2,
        selfComment: 'Needs improvement in key areas',
        managerRating: 1,
        managerComment: 'Below expectations in multiple KPIs',
        status: 'FINALIZED'
      },
      create: {
        employeeId: employee.id,
        cycleId: cycle.id,
        selfRating: 2,
        selfComment: 'Needs improvement in key areas',
        managerRating: 1,
        managerComment: 'Below expectations in multiple KPIs',
        status: 'FINALIZED'
      }
    });

    console.log(`✅ Seeded review for ${employee.firstName} ${employee.lastName} (Review ID: ${review.id})`);
  } catch (error) {
    console.error('❌ Seed error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

seedAttritionReview();
