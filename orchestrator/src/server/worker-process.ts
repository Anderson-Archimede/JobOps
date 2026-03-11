/**
 * Worker Process
 * 
 * Standalone process to run BullMQ workers
 * Run with: npm run workers
 */

import 'dotenv/config';
import { startWorkers, stopWorkers } from './workers';

console.log('🚀 [Worker Process] Starting...');
console.log('📍 [Worker Process] Redis URL:', process.env.REDIS_URL || 'redis://localhost:6379');
console.log('📍 [Worker Process] Database URL:', process.env.DATABASE_URL ? '✅ Configured' : '❌ Not configured');

// Start all workers
const workers = startWorkers();

console.log('✅ [Worker Process] All workers started successfully');
console.log('💡 [Worker Process] Press Ctrl+C to stop gracefully');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n🛑 [Worker Process] SIGTERM received, shutting down gracefully...');
  try {
    await stopWorkers(workers);
    console.log('✅ [Worker Process] Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ [Worker Process] Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('\n🛑 [Worker Process] SIGINT received, shutting down gracefully...');
  try {
    await stopWorkers(workers);
    console.log('✅ [Worker Process] Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ [Worker Process] Error during shutdown:', error);
    process.exit(1);
  }
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ [Worker Process] Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ [Worker Process] Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
