const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const taskTemplates = [
  { title: 'Prepare weekly report', description: 'Compile weekly team updates', priority: 'Medium', estimatedHours: 4 },
  { title: 'Fix critical bug', description: 'Resolve production blocking issue', priority: 'High', estimatedHours: 6 },
  { title: 'Update documentation', description: 'Refresh internal process docs', priority: 'Low', estimatedHours: 3 },
  { title: 'Client follow-up', description: 'Follow up with assigned client accounts', priority: 'Medium', estimatedHours: 2 },
  { title: 'Performance review prep', description: 'Prepare input for review cycle', priority: 'Medium', estimatedHours: 5 }
];

const statuses = ['Pending', 'InProgress', 'Completed'];

async function seedMixedTasks() {
  try {
    const employees = await prisma.employee.findMany({
      where: { email: { endsWith: '@nexora.pk' } },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { id: 'asc' }
    });

    if (employees.length < 2) {
      console.log('Need at least 2 employees to assign tasks.');
      return;
    }

    const assignedById = employees[0].id;
    let created = 0;

    for (let index = 1; index < employees.length; index += 1) {
      const employee = employees[index];

      for (let taskIndex = 0; taskIndex < taskTemplates.length; taskIndex += 1) {
        const template = taskTemplates[taskIndex];
        const status = statuses[(index + taskIndex) % statuses.length];
        const progress = status === 'Completed' ? 100 : status === 'InProgress' ? 45 : 0;
        const actualHours = status === 'Completed' ? template.estimatedHours : status === 'InProgress' ? 1.5 : 0;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (taskIndex + 2));

        await prisma.task.create({
          data: {
            title: `${template.title} - ${employee.firstName}`,
            description: template.description,
            status,
            priority: template.priority,
            dueDate,
            estimatedHours: template.estimatedHours,
            actualHours,
            progress,
            tags: ['seeded', status.toLowerCase()],
            assignedById,
            assignedToId: employee.id
          }
        });

        created += 1;
      }
    }

    const summary = await prisma.task.groupBy({
      by: ['status'],
      _count: { id: true },
      where: { tags: { has: 'seeded' } }
    });

    console.log(`Created ${created} tasks.`);
    summary.forEach((item) => {
      console.log(`${item.status}: ${item._count.id}`);
    });
  } catch (error) {
    console.error('Task seeding failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

seedMixedTasks();
