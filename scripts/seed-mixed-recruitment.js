const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const JOBS = [
  {
    title: 'Seeded - Frontend Engineer',
    department: 'Engineering',
    location: 'Karachi',
    type: 'Full-time',
    description: 'Build responsive web experiences and collaborate with product teams.',
    status: 'open'
  },
  {
    title: 'Seeded - Backend Engineer',
    department: 'Engineering',
    location: 'Lahore',
    type: 'Full-time',
    description: 'Design APIs, optimize data access, and improve system reliability.',
    status: 'open'
  },
  {
    title: 'Seeded - HR Executive',
    department: 'HR',
    location: 'Islamabad',
    type: 'Full-time',
    description: 'Handle hiring coordination, interviews, and employee onboarding.',
    status: 'open'
  },
  {
    title: 'Seeded - Sales Associate',
    department: 'Sales',
    location: 'Faisalabad',
    type: 'Full-time',
    description: 'Manage leads, customer demos, and pipeline progression.',
    status: 'open'
  }
];

const STAGE_PLAN = [
  'applied',
  'applied',
  'applied',
  'applied',
  'screening',
  'screening',
  'screening',
  'interview',
  'interview',
  'interview',
  'offer',
  'offer',
  'hired',
  'hired',
  'rejected',
  'rejected',
  'rejected'
];

const CANDIDATES = [
  { name: 'Adeel Farooq', email: 'adeel.farooq.candidate@nexora.pk', phone: '+923001100001', skills: ['React', 'TypeScript', 'CSS'] },
  { name: 'Maham Iqbal', email: 'maham.iqbal.candidate@nexora.pk', phone: '+923001100002', skills: ['Node.js', 'SQL', 'REST'] },
  { name: 'Sarmad Khan', email: 'sarmad.khan.candidate@nexora.pk', phone: '+923001100003', skills: ['Recruitment', 'Communication', 'MS Office'] },
  { name: 'Iqra Naveed', email: 'iqra.naveed.candidate@nexora.pk', phone: '+923001100004', skills: ['Sales', 'CRM', 'Negotiation'] },
  { name: 'Umair Raza', email: 'umair.raza.candidate@nexora.pk', phone: '+923001100005', skills: ['Next.js', 'Tailwind', 'Testing'] },
  { name: 'Nimra Ashraf', email: 'nimra.ashraf.candidate@nexora.pk', phone: '+923001100006', skills: ['PostgreSQL', 'Prisma', 'API Design'] },
  { name: 'Saqib Bashir', email: 'saqib.bashir.candidate@nexora.pk', phone: '+923001100007', skills: ['Sourcing', 'Interviewing', 'Onboarding'] },
  { name: 'Hania Tariq', email: 'hania.tariq.candidate@nexora.pk', phone: '+923001100008', skills: ['Lead Gen', 'Presentation', 'Excel'] },
  { name: 'Adnan Waheed', email: 'adnan.waheed.candidate@nexora.pk', phone: '+923001100009', skills: ['React', 'Redux', 'UI Performance'] },
  { name: 'Eman Javed', email: 'eman.javed.candidate@nexora.pk', phone: '+923001100010', skills: ['Express', 'Caching', 'MongoDB'] },
  { name: 'Hamna Bilal', email: 'hamna.bilal.candidate@nexora.pk', phone: '+923001100011', skills: ['Employee Relations', 'Policy', 'Coordination'] },
  { name: 'Talha Noman', email: 'talha.noman.candidate@nexora.pk', phone: '+923001100012', skills: ['Outbound Sales', 'Follow-ups', 'Closing'] },
  { name: 'Faisal Amin', email: 'faisal.amin.candidate@nexora.pk', phone: '+923001100013', skills: ['JavaScript', 'Accessibility', 'Jest'] },
  { name: 'Saba Shehzad', email: 'saba.shehzad.candidate@nexora.pk', phone: '+923001100014', skills: ['Microservices', 'Security', 'Docker'] },
  { name: 'Muneeb Tariq', email: 'muneeb.tariq.candidate@nexora.pk', phone: '+923001100015', skills: ['Hiring Ops', 'Candidate Care', 'Scheduling'] },
  { name: 'Tooba Arif', email: 'tooba.arif.candidate@nexora.pk', phone: '+923001100016', skills: ['Prospecting', 'Pitching', 'Account Mgmt'] },
  { name: 'Waqas Latif', email: 'waqas.latif.candidate@nexora.pk', phone: '+923001100017', skills: ['Web Perf', 'GraphQL', 'Component Design'] }
];

async function clearOldSeededRecruitment() {
  const seededJobs = await prisma.job.findMany({
    where: {
      title: {
        startsWith: 'Seeded - '
      }
    },
    select: { id: true }
  });

  if (seededJobs.length === 0) return;

  const jobIds = seededJobs.map((job) => job.id);
  await prisma.application.deleteMany({
    where: { jobId: { in: jobIds } }
  });
  await prisma.job.deleteMany({
    where: { id: { in: jobIds } }
  });
}

async function createJobs() {
  const createdJobs = [];
  for (const job of JOBS) {
    const created = await prisma.job.create({
      data: {
        ...job,
        testEnabled: false,
        testPassingPercent: null
      }
    });
    createdJobs.push(created);
  }
  return createdJobs;
}

function scoreForStage(stage, index) {
  if (stage === 'applied') return null;
  if (stage === 'screening') return 55 + (index % 10);
  if (stage === 'interview') return 68 + (index % 12);
  if (stage === 'offer') return 82 + (index % 8);
  if (stage === 'hired') return 88 + (index % 6);
  return 40 + (index % 15);
}

function passedForStage(stage) {
  if (stage === 'rejected') return false;
  if (stage === 'applied') return null;
  return true;
}

async function createApplications(jobs) {
  let createdCount = 0;
  for (let index = 0; index < STAGE_PLAN.length; index += 1) {
    const stage = STAGE_PLAN[index];
    const candidate = CANDIDATES[index];
    const job = jobs[index % jobs.length];

    await prisma.application.create({
      data: {
        jobId: job.id,
        candidateName: candidate.name,
        candidateEmail: candidate.email,
        candidatePhone: candidate.phone,
        candidateSkills: candidate.skills,
        stage,
        notes: `Seeded application in ${stage} stage`,
        scorePercent: scoreForStage(stage, index),
        passed: passedForStage(stage)
      }
    });

    createdCount += 1;
  }
  return createdCount;
}

async function printSummary() {
  const totalJobs = await prisma.job.count({
    where: { title: { startsWith: 'Seeded - ' } }
  });

  const grouped = await prisma.application.groupBy({
    by: ['stage'],
    _count: { id: true },
    where: {
      notes: { startsWith: 'Seeded application in ' }
    }
  });

  console.log(`Seeded jobs: ${totalJobs}`);
  grouped
    .sort((a, b) => a.stage.localeCompare(b.stage))
    .forEach((item) => console.log(`${item.stage}: ${item._count.id}`));
}

async function seedRecruitment() {
  try {
    await clearOldSeededRecruitment();
    const jobs = await createJobs();
    const applicationsCount = await createApplications(jobs);

    console.log(`Applications created: ${applicationsCount}`);
    await printSummary();
  } catch (error) {
    console.error('Recruitment seed failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

seedRecruitment();
