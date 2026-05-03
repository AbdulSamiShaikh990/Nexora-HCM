const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const salaryByTitle = {
  'Software Engineer': 180000,
  'HR Specialist': 120000,
  'Financial Analyst': 160000,
  'Marketing Executive': 110000,
  'Operations Officer': 100000,
  'Frontend Developer': 170000,
  'Backend Developer': 190000,
  'Support Specialist': 90000,
  'QA Engineer': 140000,
  'UI/UX Designer': 150000,
  'Sales Executive': 130000,
  'Talent Acquisition Officer': 115000,
  'DevOps Engineer': 220000,
  'Compliance Analyst': 145000,
  'Product Associate': 155000,
  Accountant: 125000,
  'Logistics Coordinator': 105000,
  'Content Strategist': 135000,
  'Customer Success Manager': 165000,
  'Data Analyst': 175000
};

async function updateSalaries() {
  try {
    const targetEmployees = await prisma.employee.findMany({
      where: {
        email: {
          endsWith: '@nexora.pk'
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        jobTitle: true
      }
    });

    let updatedCount = 0;

    for (const employee of targetEmployees) {
      const salary = salaryByTitle[employee.jobTitle];
      if (!salary) continue;

      await prisma.employee.update({
        where: { id: employee.id },
        data: { salary }
      });

      updatedCount += 1;
    }

    console.log(`Updated ${updatedCount} employee(s) with designation-based salaries.`);

    const employees = await prisma.employee.findMany({
      where: {
        email: {
          endsWith: '@nexora.pk'
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        salary: true
      }
    });

    console.log('\nPakistani seeded employees salary list:');
    employees.forEach((emp) => {
      console.log(`- ${emp.firstName} ${emp.lastName}: Rs ${emp.salary} | ${emp.jobTitle}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateSalaries();
