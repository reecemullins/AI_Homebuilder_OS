import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';

// Redis connection
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Queue definitions
export const lotQueue = new Queue('lot-jobs', { connection });
export const subQueue = new Queue('sub-jobs', { connection });
export const inspectionQueue = new Queue('inspection-jobs', { connection });
export const procurementQueue = new Queue('procurement-jobs', { connection });
export const analyticsQueue = new Queue('analytics-jobs', { connection });

// Job types
export interface LotImportJob {
  type: 'import-mls' | 'score-new' | 'generate-digest' | 'refresh-comps';
  data?: Record<string, unknown>;
}

export interface SubJob {
  type: 'send-confirmation' | 'process-response' | 'update-reliability';
  data: {
    entryId?: string;
    subId?: string;
    response?: string;
    hoursType?: '48H' | '24H' | '2H';
  };
}

export interface InspectionJob {
  type: 'pre-audit' | 'photo-analyze';
  data: {
    inspectionId?: string;
    photoUrl?: string;
    inspectionType?: string;
  };
}

export interface ProcurementJob {
  type: 'track-prices' | 'check-alerts';
  data?: Record<string, unknown>;
}

export interface AnalyticsJob {
  type: 'daily-metrics' | 'margin-analysis';
  data?: Record<string, unknown>;
}

// Schedule recurring jobs
export async function scheduleRecurringJobs(): Promise<void> {
  // Lot jobs
  await lotQueue.add('import-mls', { type: 'import-mls' }, {
    repeat: { pattern: '0 6 * * *' }, // Daily at 6 AM
  });

  await lotQueue.add('score-new', { type: 'score-new' }, {
    repeat: { pattern: '0 7 * * *' }, // Daily at 7 AM
  });

  await lotQueue.add('generate-digest', { type: 'generate-digest' }, {
    repeat: { pattern: '0 8 * * *' }, // Daily at 8 AM
  });

  await lotQueue.add('refresh-comps', { type: 'refresh-comps' }, {
    repeat: { pattern: '0 0 * * 0' }, // Weekly on Sunday
  });

  // Sub reliability update
  await subQueue.add('update-reliability', { type: 'update-reliability' }, {
    repeat: { pattern: '0 0 * * *' }, // Daily at midnight
  });

  // Procurement price tracking
  await procurementQueue.add('track-prices', { type: 'track-prices' }, {
    repeat: { pattern: '0 9 * * 1,3,5' }, // Mon, Wed, Fri at 9 AM
  });

  await procurementQueue.add('check-alerts', { type: 'check-alerts' }, {
    repeat: { pattern: '0 10 * * *' }, // Daily at 10 AM
  });

  // Analytics
  await analyticsQueue.add('daily-metrics', { type: 'daily-metrics' }, {
    repeat: { pattern: '0 1 * * *' }, // Daily at 1 AM
  });

  await analyticsQueue.add('margin-analysis', { type: 'margin-analysis' }, {
    repeat: { pattern: '0 2 1 * *' }, // Monthly on 1st at 2 AM
  });

  console.log('Recurring jobs scheduled');
}

// Queue one-off confirmation job
export async function queueConfirmation(
  entryId: string,
  hoursType: '48H' | '24H' | '2H',
  delay: number
): Promise<void> {
  await subQueue.add(
    'send-confirmation',
    { type: 'send-confirmation', data: { entryId, hoursType } },
    { delay }
  );
}

// Queue inspection pre-audit
export async function queuePreAudit(inspectionId: string): Promise<void> {
  await inspectionQueue.add('pre-audit', {
    type: 'pre-audit',
    data: { inspectionId },
  });
}

// Queue photo analysis
export async function queuePhotoAnalysis(
  photoUrl: string,
  inspectionType: string
): Promise<void> {
  await inspectionQueue.add('photo-analyze', {
    type: 'photo-analyze',
    data: { photoUrl, inspectionType },
  });
}

export { connection };
