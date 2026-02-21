import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateSalaries() {
  try {
    // Update all employees with salary = 0 or null
    const result = await prisma.employee.updateMany({
      where: {
        OR: [
          { salary: 0 },
          { salary: null }
        ]
      },
      data: {
        salary: 50000 // Default salary
      }
    });

    console.log(`✅ Updated ${result.count} employees with default salary of Rs 50,000`);

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
