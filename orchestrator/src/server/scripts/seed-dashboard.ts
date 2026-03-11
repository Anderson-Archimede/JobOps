
import { db } from '../db';
import { jobs, datasets, postApplicationMessages } from '../db/schema';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  console.log('🌱 Seeding dashboard data...');

  try {
    // 1. Seed Datasets
    const datasetTypes = ['job_postings', 'cv_versions', 'applications', 'custom'];
    const fakeDatasets = [
      { id: uuidv4(), name: 'Global Tech Jobs 2024', type: 'job_postings', rowCount: 1250, sizeBytes: 1540000 },
      { id: uuidv4(), name: 'Tailored CVs - Q1', type: 'cv_versions', rowCount: 45, sizeBytes: 2500000 },
      { id: uuidv4(), name: 'Applied Jobs Tracker', type: 'applications', rowCount: 120, sizeBytes: 85000 },
      { id: uuidv4(), name: 'Skill Gap Analysis', type: 'custom', rowCount: 300, sizeBytes: 45000 },
    ];

    for (const d of fakeDatasets) {
      await db.insert(datasets).values({
        ...d,
        description: `Sample dataset for ${d.name}`,
        updatedAt: new Date(),
        createdAt: new Date(),
      }).onConflictDoNothing();
    }
    console.log('✅ Seeded datasets');

    // 2. Seed Jobs
    const companies = ['Google', 'Meta', 'Amazon', 'Microsoft', 'Netflix', 'Apple', 'NVIDIA', 'Tesla', 'OpenAI', 'DeepMind'];
    const titles = ['Software Engineer', 'Frontend Developer', 'Fullstack Developer', 'AI Researcher', 'Data Scientist', 'DevOps Engineer'];
    const statuses: Array<"discovered" | "processing" | "ready" | "applied" | "in_progress" | "skipped" | "expired"> = ['ready', 'applied', 'in_progress', 'applied', 'applied'];
    const outcomes: Array<"rejected" | "offer_accepted" | "offer_declined" | "withdrawn" | "no_response" | "ghosted"> = ['rejected', 'no_response', 'offer_accepted', 'rejected', 'rejected'];

    const now = new Date();

    for (let i = 0; i < 50; i++) {
      const company = companies[Math.floor(Math.random() * companies.length)];
      const title = titles[Math.floor(Math.random() * titles.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const suitabilityScore = 60 + Math.floor(Math.random() * 35); // 60-95
      
      const createdAt = new Date(now);
      createdAt.setDate(now.getDate() - Math.floor(Math.random() * 30));
      
      const appliedAt = status === 'applied' || status === 'in_progress' ? new Date(createdAt) : null;
      if (appliedAt) appliedAt.setHours(appliedAt.getHours() + 2);

      await db.insert(jobs).values({
        id: uuidv4(),
        title,
        employer: company,
        jobUrl: `https://example.com/job/${uuidv4()}`,
        source: 'manual',
        status,
        suitabilityScore,
        outcome: (status === 'applied' || status === 'in_progress') ? outcomes[Math.floor(Math.random() * outcomes.length)] : null,
        createdAt,
        updatedAt: new Date(),
        appliedAt,
        discoveredAt: createdAt,
      }).onConflictDoNothing();
    }
    console.log('✅ Seeded 50 jobs');

    // 3. Seed Email Messages
    for (let i = 0; i < 5; i++) {
        await db.insert(postApplicationMessages).values({
            id: uuidv4(),
            provider: 'gmail',
            externalMessageId: `msg_${uuidv4()}`,
            fromAddress: 'recruitment@tech-corp.com',
            subject: 'Invitation to Interview',
            snippet: 'We were impressed by your profile and would like to invite you...',
            receivedAt: Math.floor(Date.now() / 1000) - (i * 86400),
            createdAt: new Date(),
            updatedAt: new Date(),
        }).onConflictDoNothing();
    }
    console.log('✅ Seeded 5 email messages');

    console.log('🎉 Dashboard seeding complete!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  }
}

seed();
