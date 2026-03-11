/**
 * Scraping Worker
 * 
 * Processes scraping jobs asynchronously
 */

import { Job, Worker } from 'bullmq';
import { redisConnection } from '../queues';
import type { ScrapingJobData, ScrapingJobResult } from '../queues/types';

/**
 * Process a scraping job
 */
async function processScrapingJob(job: Job<ScrapingJobData>): Promise<ScrapingJobResult> {
  const startTime = Date.now();
  const { source, searchTerms, location, maxJobs, filters, pipelineRunId } = job.data;

  console.log(`🔄 [Scraping Worker] Starting job ${job.id} for source: ${source}`);
  
  try {
    // Update job progress
    await job.updateProgress(10);

    // TODO: Import and call the appropriate extractor based on source
    // For now, simulate scraping
    console.log(`📡 [Scraping Worker] Scraping from ${source}...`, {
      searchTerms,
      location,
      maxJobs,
      filters,
      pipelineRunId,
    });

    // Simulate scraping delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    await job.updateProgress(50);

    // TODO: Actually call the extractors
    // Example: 
    // const extractor = getExtractor(source);
    // const jobs = await extractor.extract({ searchTerms, location, maxJobs });
    // Save jobs to database
    // await saveDiscoveredJobs(jobs);

    await job.updateProgress(90);

    const result: ScrapingJobResult = {
      success: true,
      data: {
        jobsDiscovered: 0, // TODO: Replace with actual count
        jobsProcessed: 0,
        source,
      },
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };

    await job.updateProgress(100);
    console.log(`✅ [Scraping Worker] Completed job ${job.id} in ${result.duration}ms`);
    
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ [Scraping Worker] Failed job ${job.id}:`, errorMessage);
    
    throw new Error(`Scraping failed: ${errorMessage}`);
  }
}

/**
 * Create and start the scraping worker
 */
export function createScrapingWorker() {
  const worker = new Worker<ScrapingJobData, ScrapingJobResult>(
    'scraping',
    processScrapingJob,
    {
      connection: redisConnection,
      concurrency: 2, // Process 2 scraping jobs concurrently
      limiter: {
        max: 10, // Max 10 jobs
        duration: 60000, // Per 60 seconds
      },
    }
  );

  // Event handlers
  worker.on('completed', (job, result) => {
    console.log(`✅ [Scraping Worker] Job ${job.id} completed:`, result.data);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ [Scraping Worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('❌ [Scraping Worker] Worker error:', err);
  });

  console.log('🚀 [Scraping Worker] Started');
  
  return worker;
}
