const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateSalaries() {
  try {
    // Update all employees with salary = 0 or null
    const result = await prisma.$executeRaw`
      UPDATE "Employee" 
      SET salary = 50000 
      WHERE salary IS NULL OR salary = 0
    `;

    console.log(`✅ Updated ${result} employee(s) with default salary of Rs 50,000`);

    // Show all employees
    const employees = await prisma.employee.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        salary: true,
        performanceRating: true,
      }
    });

    console.log('\n📊 Current Employees:');
    employees.forEach(emp => {
      console.log(`- ${emp.firstName} ${emp.lastName}: Rs ${emp.salary} | ${emp.jobTitle} | Rating: ${emp.performanceRating}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateSalaries();
