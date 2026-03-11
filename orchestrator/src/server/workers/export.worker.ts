/**
 * Export Worker
 * 
 * Processes export jobs asynchronously (PDF, JSON, etc.)
 */

import { Job, Worker } from 'bullmq';
import { redisConnection } from '../queues';
import type { ExportJobData, ExportJobResult } from '../queues/types';
import { getJobById } from '../repositories/jobs';

/**
 * Process an export job
 */
async function processExportJob(job: Job<ExportJobData>): Promise<ExportJobResult> {
  const startTime = Date.now();
  const { jobId, format, includeTracerLinks } = job.data;

  console.log(`🔄 [Export Worker] Starting job ${job.id} for jobId: ${jobId}, format: ${format}`);
  
  try {
    // Update job progress
    await job.updateProgress(10);

    // Fetch job from database
    const jobData = await getJobById(jobId);
    if (!jobData) {
      throw new Error(`Job ${jobId} not found in database`);
    }

    await job.updateProgress(30);

    // TODO: Call the actual export service based on format
    console.log(`📄 [Export Worker] Exporting job ${jobId} as ${format}...`, {
      includeTracerLinks,
    });

    await job.updateProgress(50);

    // Simulate export process
    await new Promise(resolve => setTimeout(resolve, 2000));

    await job.updateProgress(80);

    // Mock export result
    const filePath = `/exports/${jobId}_export.${format}`;

    await job.updateProgress(100);

    const result: ExportJobResult = {
      success: true,
      data: {
        jobId,
        filePath,
        format,
      },
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };

    console.log(`✅ [Export Worker] Completed job ${job.id} in ${result.duration}ms`);
    
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ [Export Worker] Failed job ${job.id}:`, errorMessage);
    
    throw new Error(`Export failed: ${errorMessage}`);
  }
}

/**
 * Create and start the export worker
 */
export function createExportWorker() {
  const worker = new Worker<ExportJobData, ExportJobResult>(
    'export',
    processExportJob,
    {
      connection: redisConnection,
      concurrency: 4, // Process 4 export jobs concurrently
      limiter: {
        max: 30, // Max 30 jobs
        duration: 60000, // Per 60 seconds
      },
    }
  );

  // Event handlers
  worker.on('completed', (job, result) => {
    console.log(`✅ [Export Worker] Job ${job.id} completed:`, result.data);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ [Export Worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('❌ [Export Worker] Worker error:', err);
  });

  console.log('🚀 [Export Worker] Started');
  
  return worker;
}
