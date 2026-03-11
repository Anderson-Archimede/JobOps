/**
 * Scoring Worker
 * 
 * Processes job scoring asynchronously
 */

import { Job, Worker } from 'bullmq';
import { redisConnection } from '../queues';
import type { ScoringJobData, ScoringJobResult } from '../queues/types';
import { getJobById, updateJob } from '../repositories/jobs';

/**
 * Process a scoring job
 */
async function processScoringJob(job: Job<ScoringJobData>): Promise<ScoringJobResult> {
  const startTime = Date.now();
  const { jobId, forceRescore } = job.data;

  console.log(`🔄 [Scoring Worker] Starting job ${job.id} for jobId: ${jobId}`);
  
  try {
    // Update job progress
    await job.updateProgress(10);

    // Fetch job from database
    const jobData = await getJobById(jobId);
    if (!jobData) {
      throw new Error(`Job ${jobId} not found in database`);
    }

    // Check if already scored
    if (jobData.suitabilityScore !== null && !forceRescore) {
      console.log(`ℹ️ [Scoring Worker] Job ${jobId} already scored, skipping`);
      return {
        success: true,
        data: {
          jobId,
          suitabilityScore: jobData.suitabilityScore,
          suitabilityReason: jobData.suitabilityReason || '',
        },
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    await job.updateProgress(30);

    // Update job status to processing
    await updateJob(jobId, { status: 'processing' });

    await job.updateProgress(50);

    // Call the actual scoring service
    const { getProfile } = await import('../services/profile');
    const { scoreJobSuitability } = await import('../services/scorer');
    
    console.log(`🎯 [Scoring Worker] Fetching profile for scoring job ${jobId}...`);
    const profile = await getProfile();
    
    console.log(`🎯 [Scoring Worker] Scoring job ${jobId}...`);
    const { score, reason } = await scoreJobSuitability(jobData, profile);

    const suitabilityScore = score;
    const suitabilityReason = reason;

    await job.updateProgress(80);

    // Update job with scoring results
    await updateJob(jobId, {
      suitabilityScore,
      suitabilityReason,
      status: 'ready',
    });

    await job.updateProgress(100);

    const result: ScoringJobResult = {
      success: true,
      data: {
        jobId,
        suitabilityScore,
        suitabilityReason,
      },
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };

    console.log(`✅ [Scoring Worker] Completed job ${job.id} in ${result.duration}ms`);
    
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ [Scoring Worker] Failed job ${job.id}:`, errorMessage);
    
    // Update job status to failed in database
    try {
      await updateJob(jobId, { status: 'discovered' });
    } catch (dbError) {
      console.error(`❌ [Scoring Worker] Failed to update job status:`, dbError);
    }
    
    throw new Error(`Scoring failed: ${errorMessage}`);
  }
}

/**
 * Create and start the scoring worker
 */
export function createScoringWorker() {
  const worker = new Worker<ScoringJobData, ScoringJobResult>(
    'scoring',
    processScoringJob,
    {
      connection: redisConnection,
      concurrency: 5, // Process 5 scoring jobs concurrently
      limiter: {
        max: 50, // Max 50 jobs
        duration: 60000, // Per 60 seconds
      },
    }
  );

  // Event handlers
  worker.on('completed', (job, result) => {
    console.log(`✅ [Scoring Worker] Job ${job.id} completed:`, result.data);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ [Scoring Worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('❌ [Scoring Worker] Worker error:', err);
  });

  console.log('🚀 [Scoring Worker] Started');
  
  return worker;
}
