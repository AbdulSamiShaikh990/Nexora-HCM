const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const MIXED_SENTIMENT = [
  {
    employeeName: 'Farhan Hussain',
    employeeEmail: 'farhan@nexora.com',
    sentimentLabel: 'positive',
    confidenceScore: 0.94,
    text: 'Seeded sentiment: Team support is great and workload feels manageable.'
  },
  {
    employeeName: 'Ibrahim Ansari',
    employeeEmail: 'ibrahim@nexora.com',
    sentimentLabel: 'positive',
    confidenceScore: 0.9,
    text: 'Seeded sentiment: I am satisfied with my role and growth opportunities.'
  },
  {
    employeeName: 'Areeba Khan',
    employeeEmail: 'areeba@nexora.com',
    sentimentLabel: 'positive',
    confidenceScore: 0.88,
    text: 'Seeded sentiment: Manager feedback is helpful and project direction is clear.'
  },
  {
    employeeName: 'Hamza Qureshi',
    employeeEmail: 'hamza.q@nexora.com',
    sentimentLabel: 'neutral',
    confidenceScore: 0.76,
    text: 'Seeded sentiment: Work is fine overall, but process improvements are needed.'
  },
  {
    employeeName: 'Sana Rauf',
    employeeEmail: 'sana.rauf@nexora.com',
    sentimentLabel: 'neutral',
    confidenceScore: 0.73,
    text: 'Seeded sentiment: Some days are productive, some are slower.'
  },
  {
    employeeName: 'Usama Khalid',
    employeeEmail: 'usama@nexora.com',
    sentimentLabel: 'neutral',
    confidenceScore: 0.71,
    text: 'Seeded sentiment: No major issues right now, but communication can improve.'
  },
  {
    employeeName: 'Minal Tariq',
    employeeEmail: 'minal@nexora.com',
    sentimentLabel: 'negative',
    confidenceScore: 0.92,
    text: 'Seeded sentiment: Deadlines are too tight and stress has increased recently.'
  },
  {
    employeeName: 'Bilal Noor',
    employeeEmail: 'bilal.noor@nexora.com',
    sentimentLabel: 'negative',
    confidenceScore: 0.89,
    text: 'Seeded sentiment: I am concerned about workload balance across the team.'
  },
  {
    employeeName: 'Nadia Aslam',
    employeeEmail: 'nadia@nexora.com',
    sentimentLabel: 'negative',
    confidenceScore: 0.86,
    text: 'Seeded sentiment: Frequent context switching is affecting focus and quality.'
  },
  {
    employeeName: 'Saad Hassan',
    employeeEmail: 'saad.hassan@nexora.com',
    sentimentLabel: 'positive',
    confidenceScore: 0.85,
    text: 'Seeded sentiment: Collaboration is improving and recent sprint planning helped.'
  }
];

async function seedMixedSentiment() {
  try {
    await prisma.sentimentResponse.deleteMany({
      where: {
        text: { startsWith: 'Seeded sentiment:' }
      }
    });

    const toInsert = MIXED_SENTIMENT.slice(0, 10);

    for (let i = 0; i < toInsert.length; i += 1) {
      const entry = toInsert[i];

      await prisma.sentimentResponse.create({
        data: {
          employeeId: 0,
          employeeName: entry.employeeName,
          employeeEmail: entry.employeeEmail,
          text: entry.text,
          sentimentLabel: entry.sentimentLabel,
          confidenceScore: entry.confidenceScore
        }
      });
    }

    const summary = await prisma.sentimentResponse.groupBy({
      by: ['sentimentLabel'],
      _count: { id: true },
      where: {
        text: { startsWith: 'Seeded sentiment:' }
      }
    });

    console.log(`Sentiment responses created: ${toInsert.length}`);
    summary
      .sort((a, b) => a.sentimentLabel.localeCompare(b.sentimentLabel))
      .forEach((item) => console.log(`${item.sentimentLabel}: ${item._count.id}`));
  } catch (error) {
    console.error('Sentiment seed failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

seedMixedSentiment();
