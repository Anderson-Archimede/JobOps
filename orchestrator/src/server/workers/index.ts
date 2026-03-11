/**
 * Workers Index
 * 
 * Central file to start all BullMQ workers
 */

import { createScrapingWorker } from './scraping.worker';
import { createScoringWorker } from './scoring.worker';
import { createTailoringWorker } from './tailoring.worker';
import { createExportWorker } from './export.worker';

/**
 * Start all workers
 */
export function startWorkers() {
  console.log('🚀 [Workers] Starting all workers...');
  
  const workers = {
    scraping: createScrapingWorker(),
    scoring: createScoringWorker(),
    tailoring: createTailoringWorker(),
    export: createExportWorker(),
  };

  console.log('✅ [Workers] All workers started successfully');
  
  return workers;
}

/**
 * Stop all workers gracefully
 */
export async function stopWorkers(workers: ReturnType<typeof startWorkers>) {
  console.log('🛑 [Workers] Stopping all workers...');
  
  await Promise.all([
    workers.scraping.close(),
    workers.scoring.close(),
    workers.tailoring.close(),
    workers.export.close(),
  ]);

  console.log('✅ [Workers] All workers stopped');
}

// Auto-start workers if this file is executed directly
if (require.main === module) {
  const workers = startWorkers();

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('🛑 [Workers] SIGTERM received');
    await stopWorkers(workers);
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('🛑 [Workers] SIGINT received');
    await stopWorkers(workers);
    process.exit(0);
  });
}
