import { Worker, Job } from 'bullmq';
import {
  connection,
  LotImportJob,
  SubJob,
  InspectionJob,
  ProcurementJob,
  AnalyticsJob,
} from './index';
import { lotJobHandlers } from './lot-jobs';
import { subJobHandlers } from './sub-jobs';
import { inspectionJobHandlers } from './inspection-jobs';
import { procurementJobHandlers } from './procurement-jobs';
import { analyticsJobHandlers } from './analytics-jobs';

// Lot jobs worker
const lotWorker = new Worker<LotImportJob>(
  'lot-jobs',
  async (job: Job<LotImportJob>) => {
    console.log(`Processing lot job: ${job.name} (${job.data.type})`);

    switch (job.data.type) {
      case 'import-mls':
        return lotJobHandlers.importMLS();
      case 'score-new':
        return lotJobHandlers.scoreNewLots();
      case 'generate-digest':
        return lotJobHandlers.generateDailyDigest();
      case 'refresh-comps':
        return lotJobHandlers.refreshComparables();
      default:
        console.log(`Unknown lot job type: ${job.data.type}`);
    }
  },
  { connection }
);

// Sub jobs worker
const subWorker = new Worker<SubJob>(
  'sub-jobs',
  async (job: Job<SubJob>) => {
    console.log(`Processing sub job: ${job.name} (${job.data.type})`);

    switch (job.data.type) {
      case 'send-confirmation':
        return subJobHandlers.sendConfirmation(
          job.data.data.entryId!,
          job.data.data.hoursType!
        );
      case 'process-response':
        return subJobHandlers.processResponse(
          job.data.data.subId!,
          job.data.data.response!
        );
      case 'update-reliability':
        return subJobHandlers.updateReliabilityScores();
      default:
        console.log(`Unknown sub job type: ${job.data.type}`);
    }
  },
  { connection }
);

// Inspection jobs worker
const inspectionWorker = new Worker<InspectionJob>(
  'inspection-jobs',
  async (job: Job<InspectionJob>) => {
    console.log(`Processing inspection job: ${job.name} (${job.data.type})`);

    switch (job.data.type) {
      case 'pre-audit':
        return inspectionJobHandlers.runPreAudit(job.data.data.inspectionId!);
      case 'photo-analyze':
        return inspectionJobHandlers.analyzePhoto(
          job.data.data.photoUrl!,
          job.data.data.inspectionType!
        );
      default:
        console.log(`Unknown inspection job type: ${job.data.type}`);
    }
  },
  { connection }
);

// Procurement jobs worker
const procurementWorker = new Worker<ProcurementJob>(
  'procurement-jobs',
  async (job: Job<ProcurementJob>) => {
    console.log(`Processing procurement job: ${job.name} (${job.data.type})`);

    switch (job.data.type) {
      case 'track-prices':
        return procurementJobHandlers.trackPrices();
      case 'check-alerts':
        return procurementJobHandlers.checkAlerts();
      default:
        console.log(`Unknown procurement job type: ${job.data.type}`);
    }
  },
  { connection }
);

// Analytics jobs worker
const analyticsWorker = new Worker<AnalyticsJob>(
  'analytics-jobs',
  async (job: Job<AnalyticsJob>) => {
    console.log(`Processing analytics job: ${job.name} (${job.data.type})`);

    switch (job.data.type) {
      case 'daily-metrics':
        return analyticsJobHandlers.calculateDailyMetrics();
      case 'margin-analysis':
        return analyticsJobHandlers.runMarginAnalysis();
      default:
        console.log(`Unknown analytics job type: ${job.data.type}`);
    }
  },
  { connection }
);

// Error handling
[lotWorker, subWorker, inspectionWorker, procurementWorker, analyticsWorker].forEach(
  (worker) => {
    worker.on('completed', (job) => {
      console.log(`Job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed:`, err);
    });
  }
);

console.log('Workers started');

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down workers...');
  await Promise.all([
    lotWorker.close(),
    subWorker.close(),
    inspectionWorker.close(),
    procurementWorker.close(),
    analyticsWorker.close(),
  ]);
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
