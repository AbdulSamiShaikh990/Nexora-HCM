const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addPerformanceData() {
  try {
    console.log('🔍 Fetching active employees...');
    
    const employees = await prisma.employee.findMany({
      where: { status: 'Active' },
      select: { id: true, firstName: true, lastName: true }
    });

    console.log(`✅ Found ${employees.length} active employee(s)`);

    if (employees.length === 0) {
      console.log('❌ No employees found');
      return;
    }

    // Review cycle banao
    console.log('\n📅 Creating review cycle...');
    const cycle = await prisma.reviewCycle.create({
      data: {
        name: 'Q1 2026',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-03-31'),
        status: 'CLOSED'
      }
    });
    console.log(`✅ Review cycle created: ${cycle.name} (ID: ${cycle.id})`);

    // Har employee ke liye performance review add karo
    console.log('\n📊 Adding performance reviews...');
    
    for (const emp of employees) {
      // Sample data: Good performance (4/5 rating)
      const review = await prisma.performanceReview.create({
        data: {
          employeeId: emp.id,
          cycleId: cycle.id,
          selfRating: 4,
          selfComment: 'Met all objectives and exceeded expectations in key areas',
          managerRating: 4,
          managerComment: 'Strong performer with consistent delivery',
          status: 'FINALIZED'
        }
      });

      console.log(`✅ ${emp.firstName} ${emp.lastName}: Manager Rating = ${review.managerRating}/5`);
    }

    // Legacy Performance table mein bhi add karo (backup)
    console.log('\n📈 Adding legacy performance records...');
    
    for (const emp of employees) {
      // Last 3 months ka data
      const months = [
        { year: 2025, month: 12, score: 82 },
        { year: 2026, month: 1, score: 85 },
        { year: 2026, month: 2, score: 88 }
      ];

      for (const m of months) {
        await prisma.performance.upsert({
          where: {
            employeeId_periodYear_periodMonth: {
              employeeId: emp.id,
              periodYear: m.year,
              periodMonth: m.month
            }
          },
          update: { score: m.score },
          create: {
            employeeId: emp.id,
            periodYear: m.year,
            periodMonth: m.month,
            score: m.score
          }
        });
      }

      console.log(`✅ ${emp.firstName} ${emp.lastName}: 3 months legacy data added (Avg: 85%)`);
    }

    console.log('\n✅ All performance data added successfully!');
    console.log('\n📝 Summary:');
    console.log(`- Review Cycle: ${cycle.name}`);
    console.log(`- Performance Reviews: ${employees.length}`);
    console.log(`- Legacy Records: ${employees.length * 3}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addPerformanceData();
