const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const employees = [
  { firstName: 'Ahmed', lastName: 'Khan', department: 'Engineering', jobTitle: 'Software Engineer', email: 'ahmed.khan@nexora.pk' },
  { firstName: 'Fatima', lastName: 'Ali', department: 'HR', jobTitle: 'HR Specialist', email: 'fatima.ali@nexora.pk' },
  { firstName: 'Usman', lastName: 'Raza', department: 'Finance', jobTitle: 'Financial Analyst', email: 'usman.raza@nexora.pk' },
  { firstName: 'Ayesha', lastName: 'Malik', department: 'Marketing', jobTitle: 'Marketing Executive', email: 'ayesha.malik@nexora.pk' },
  { firstName: 'Bilal', lastName: 'Hussain', department: 'Operations', jobTitle: 'Operations Officer', email: 'bilal.hussain@nexora.pk' },
  { firstName: 'Hira', lastName: 'Siddiqui', department: 'Engineering', jobTitle: 'Frontend Developer', email: 'hira.siddiqui@nexora.pk' },
  { firstName: 'Zain', lastName: 'Qureshi', department: 'Engineering', jobTitle: 'Backend Developer', email: 'zain.qureshi@nexora.pk' },
  { firstName: 'Mariam', lastName: 'Sheikh', department: 'Support', jobTitle: 'Support Specialist', email: 'mariam.sheikh@nexora.pk' },
  { firstName: 'Hamza', lastName: 'Iqbal', department: 'Engineering', jobTitle: 'QA Engineer', email: 'hamza.iqbal@nexora.pk' },
  { firstName: 'Noor', lastName: 'Javed', department: 'Design', jobTitle: 'UI/UX Designer', email: 'noor.javed@nexora.pk' },
  { firstName: 'Saad', lastName: 'Nawaz', department: 'Sales', jobTitle: 'Sales Executive', email: 'saad.nawaz@nexora.pk' },
  { firstName: 'Sana', lastName: 'Yousaf', department: 'HR', jobTitle: 'Talent Acquisition Officer', email: 'sana.yousaf@nexora.pk' },
  { firstName: 'Ali', lastName: 'Shah', department: 'Engineering', jobTitle: 'DevOps Engineer', email: 'ali.shah@nexora.pk' },
  { firstName: 'Mehwish', lastName: 'Aslam', department: 'Compliance', jobTitle: 'Compliance Analyst', email: 'mehwish.aslam@nexora.pk' },
  { firstName: 'Danish', lastName: 'Butt', department: 'Product', jobTitle: 'Product Associate', email: 'danish.butt@nexora.pk' },
  { firstName: 'Rabia', lastName: 'Akhtar', department: 'Finance', jobTitle: 'Accountant', email: 'rabia.akhtar@nexora.pk' },
  { firstName: 'Farhan', lastName: 'Latif', department: 'Operations', jobTitle: 'Logistics Coordinator', email: 'farhan.latif@nexora.pk' },
  { firstName: 'Komal', lastName: 'Abbasi', department: 'Marketing', jobTitle: 'Content Strategist', email: 'komal.abbasi@nexora.pk' },
  { firstName: 'Tariq', lastName: 'Mehmood', department: 'Support', jobTitle: 'Customer Success Manager', email: 'tariq.mehmood@nexora.pk' },
  { firstName: 'Nida', lastName: 'Rehman', department: 'Engineering', jobTitle: 'Data Analyst', email: 'nida.rehman@nexora.pk' }
];

async function seedEmployees() {
  try {
    let handled = 0;

    for (const employee of employees) {
      const result = await prisma.employee.upsert({
        where: { email: employee.email },
        update: {
          firstName: employee.firstName,
          lastName: employee.lastName,
          department: employee.department,
          jobTitle: employee.jobTitle,
          status: 'Active',
          updatedAt: new Date()
        },
        create: {
          ...employee,
          status: 'Active',
          updatedAt: new Date()
        }
      });

      if (result) handled += 1;
    }

    console.log(`Done. Upserted employees: ${handled}`);
  } catch (error) {
    console.error('Seed failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

seedEmployees();
