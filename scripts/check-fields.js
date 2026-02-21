const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFields() {
  try {
    // Check Employee fields
    const employee = await prisma.employee.findFirst({
      select: {
        id: true,
        salary: true,
        performanceRating: true,
        department: true,
        jobTitle: true,
        joinDate: true,
      }
    });

    console.log('✅ Employee Table Fields:');
    console.log('- salary:', employee?.salary || 'NULL');
    console.log('- performanceRating:', employee?.performanceRating || 'NULL');
    console.log('- department:', employee?.department || 'NULL');
    console.log('- jobTitle:', employee?.jobTitle || 'NULL');
    console.log('- joinDate:', employee?.joinDate || 'NULL');

    if (employee) {
      const years = Math.floor((Date.now() - new Date(employee.joinDate).getTime()) / (1000*60*60*24*365));
      console.log('- yearsAtCompany (calculated):', years);
    }

    // Check PayrollRecord for overtime
    const payroll = await prisma.payrollRecord.findFirst({
      where: { employeeId: employee?.id },
      select: { overtimeHours: true }
    });

    console.log('\n⚠️ PayrollRecord Table:');
    console.log('- overtimeHours:', payroll?.overtimeHours || 'NULL');

    // Check PerformanceReview for managerRating
    const review = await prisma.performanceReview.findFirst({
      where: { employeeId: employee?.id },
      select: { managerRating: true }
    });

    console.log('\n⚠️ PerformanceReview Table:');
    console.log('- managerRating:', review?.managerRating || 'NULL');

    console.log('\n📊 Summary:');
    console.log('✅ Available: salary, performanceRating, department, jobTitle, yearsAtCompany');
    console.log(payroll ? '✅ Available: overtimeHours' : '❌ Missing: overtimeHours');
    console.log(review ? '✅ Available: managerRating' : '❌ Missing: managerRating');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFields();
