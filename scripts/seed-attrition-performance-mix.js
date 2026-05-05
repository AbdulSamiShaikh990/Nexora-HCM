const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function commentForRating(rating) {
  if (rating <= 1) return 'Critical performance concerns and low goal completion.';
  if (rating <= 2) return 'Needs significant improvement in consistency and delivery.';
  if (rating === 4) return 'Strong performer with reliable outcomes and good ownership.';
  return 'Top performer with excellent delivery and leadership impact.';
}

function scoreForRating(rating) {
  if (rating <= 1) return 30;
  if (rating <= 2) return 45;
  if (rating === 4) return 82;
  return 95;
}

async function seedAttritionPerformanceMix() {
  try {
    const employees = await prisma.employee.findMany({
      where: {
        status: 'Active',
        email: { endsWith: '@nexora.pk' }
      },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: { id: 'asc' }
    });

    if (employees.length < 5) {
      console.log('At least 5 active seeded employees are required.');
      return;
    }

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;

    const cycle = await prisma.reviewCycle.upsert({
      where: { id: 999001 },
      update: {
        name: `Attrition Mix ${year}`,
        startDate: new Date(`${year}-01-01`),
        endDate: new Date(`${year}-12-31`),
        status: 'CLOSED'
      },
      create: {
        id: 999001,
        name: `Attrition Mix ${year}`,
        startDate: new Date(`${year}-01-01`),
        endDate: new Date(`${year}-12-31`),
        status: 'CLOSED'
      }
    });

    const ratings = [];
    ratings.push(...Array(2).fill(1)); // 2 employees => rating 1
    ratings.push(...Array(3).fill(2)); // 3 employees => rating 2

    const remaining = employees.length - ratings.length;
    const forFour = Math.ceil(remaining / 2);
    const forFive = remaining - forFour;
    ratings.push(...Array(forFour).fill(4));
    ratings.push(...Array(forFive).fill(5));

    const counts = { 1: 0, 2: 0, 4: 0, 5: 0 };

    for (let index = 0; index < employees.length; index += 1) {
      const employee = employees[index];
      const rating = ratings[index];
      const note = commentForRating(rating);
      const score = scoreForRating(rating);

      await prisma.employee.update({
        where: { id: employee.id },
        data: { performanceRating: rating }
      });

      await prisma.performanceReview.upsert({
        where: {
          employeeId_cycleId: {
            employeeId: employee.id,
            cycleId: cycle.id
          }
        },
        update: {
          selfRating: rating,
          selfComment: note,
          managerRating: rating,
          managerComment: note,
          status: 'FINALIZED'
        },
        create: {
          employeeId: employee.id,
          cycleId: cycle.id,
          selfRating: rating,
          selfComment: note,
          managerRating: rating,
          managerComment: note,
          status: 'FINALIZED'
        }
      });

      await prisma.performance.upsert({
        where: {
          employeeId_periodYear_periodMonth: {
            employeeId: employee.id,
            periodYear: year,
            periodMonth: month
          }
        },
        update: { score },
        create: {
          employeeId: employee.id,
          periodYear: year,
          periodMonth: month,
          score
        }
      });

      counts[rating] += 1;
    }

    console.log(`Cycle used: ${cycle.name} (ID: ${cycle.id})`);
    console.log(`Employees updated: ${employees.length}`);
    console.log(`Rating 1: ${counts[1]}`);
    console.log(`Rating 2: ${counts[2]}`);
    console.log(`Rating 4: ${counts[4]}`);
    console.log(`Rating 5: ${counts[5]}`);
  } catch (error) {
    console.error('Performance mix seed failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

seedAttritionPerformanceMix();
