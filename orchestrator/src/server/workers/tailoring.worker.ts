/**
 * Tailoring Worker
 * 
 * Processes CV tailoring jobs asynchronously
 */

import { Job, Worker } from 'bullmq';
import { redisConnection } from '../queues';
import type { TailoringJobData, TailoringJobResult } from '../queues/types';
import { getJobById, updateJob } from '../repositories/jobs';

/**
 * Process a tailoring job
 */
async function processTailoringJob(job: Job<TailoringJobData>): Promise<TailoringJobResult> {
  const startTime = Date.now();
  const { jobId, regenerate, projectIds } = job.data;

  console.log(`🔄 [Tailoring Worker] Starting job ${job.id} for jobId: ${jobId}`);
  
  try {
    // Update job progress
    await job.updateProgress(10);

    // Fetch job from database
    const jobData = await getJobById(jobId);
    if (!jobData) {
      throw new Error(`Job ${jobId} not found in database`);
    }

    // Check if already tailored
    if (jobData.pdfPath && !regenerate) {
      console.log(`ℹ️ [Tailoring Worker] Job ${jobId} already has PDF, skipping`);
      return {
        success: true,
        data: {
          jobId,
          pdfPath: jobData.pdfPath,
          tailoredSummary: jobData.tailoredSummary || '',
        },
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    await job.updateProgress(20);

    // Call the actual PDF generation service
    const { generateFinalPdf } = await import('../pipeline/index');
    
    console.log(`✂️ [Tailoring Worker] Generating PDF for job ${jobId}...`, {
      projectIds,
      regenerate,
    });

    await job.updateProgress(40);

    const pdfResult = await generateFinalPdf(jobId, {
      requestOrigin: null,
    });

    if (!pdfResult.success) {
      throw new Error(pdfResult.error || 'PDF generation failed');
    }

    await job.updateProgress(70);

    // Get the updated job data after PDF generation
    const updatedJobData = await getJobById(jobId);
    if (!updatedJobData) {
      throw new Error(`Job ${jobId} not found after PDF generation`);
    }

    const tailoredSummary = updatedJobData.tailoredSummary || '';
    const tailoredHeadline = updatedJobData.tailoredHeadline || '';
    const pdfPath = updatedJobData.pdfPath || '';

    await job.updateProgress(90);

    await job.updateProgress(100);

    const result: TailoringJobResult = {
      success: true,
      data: {
        jobId,
        pdfPath,
        tailoredSummary,
      },
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };

    console.log(`✅ [Tailoring Worker] Completed job ${job.id} in ${result.duration}ms`);
    
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ [Tailoring Worker] Failed job ${job.id}:`, errorMessage);
    
    throw new Error(`Tailoring failed: ${errorMessage}`);
  }
}

/**
 * Create and start the tailoring worker
 */
export function createTailoringWorker() {
  const worker = new Worker<TailoringJobData, TailoringJobResult>(
    'tailoring',
    processTailoringJob,
    {
      connection: redisConnection,
      concurrency: 3, // Process 3 tailoring jobs concurrently
      limiter: {
        max: 20, // Max 20 jobs
        duration: 60000, // Per 60 seconds
      },
    }
  );

  // Event handlers
  worker.on('completed', (job, result) => {
    console.log(`✅ [Tailoring Worker] Job ${job.id} completed:`, result.data);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ [Tailoring Worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('❌ [Tailoring Worker] Worker error:', err);
  });

  console.log('🚀 [Tailoring Worker] Started');
  
  return worker;
}
