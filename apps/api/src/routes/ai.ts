import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { InspectionType } from '@builderos/database';
import { requireOrg } from '../middleware/auth';
import { LotService } from '../services/lot.service';
import { ScheduleService } from '../services/schedule.service';
import { InspectionService } from '../services/inspection.service';

const lotService = new LotService();
const scheduleService = new ScheduleService();
const inspectionService = new InspectionService();

// Schemas
const lotScoreSchema = z.object({
  lotId: z.string(),
  forceRefresh: z.boolean().default(false),
  includeComps: z.boolean().default(true),
});

const scheduleOptimizeSchema = z.object({
  buildId: z.string(),
  constraints: z.object({
    fixedDates: z.array(z.object({
      taskId: z.string(),
      date: z.string(),
    })).optional(),
    excludeDates: z.array(z.string()).optional(),
    maxConcurrentTrades: z.number().optional(),
  }).optional(),
  preferences: z.object({
    preferredSubs: z.record(z.string()).optional(),
    weatherBuffer: z.boolean().optional(),
    inspectionBuffer: z.number().optional(),
  }).optional(),
});

const photoAnalyzeSchema = z.object({
  photoUrl: z.string().url(),
  inspectionType: z.nativeEnum(InspectionType),
  context: z.string().optional(),
});

const checklistGenerateSchema = z.object({
  jurisdiction: z.string(),
  inspectionType: z.nativeEnum(InspectionType),
  buildDetails: z.object({
    sqft: z.number(),
    stories: z.number(),
    foundationType: z.string(),
  }),
});

export async function aiRoutes(fastify: FastifyInstance) {
  // Score a lot
  fastify.post('/lot-score', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Body: z.infer<typeof lotScoreSchema> }>) => {
    const data = lotScoreSchema.parse(request.body);

    const result = await lotService.scoreLot(
      data.lotId,
      request.organizationId!,
      { forceRefresh: data.forceRefresh, includeComps: data.includeComps }
    );

    return { success: true, data: result };
  });

  // Optimize schedule
  fastify.post('/schedule-optimize', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Body: z.infer<typeof scheduleOptimizeSchema> }>) => {
    const data = scheduleOptimizeSchema.parse(request.body);

    const result = await scheduleService.optimizeSchedule(
      data.buildId,
      request.organizationId!,
      data.constraints,
      data.preferences
    );

    return { success: true, data: result };
  });

  // Analyze inspection photo
  fastify.post('/photo-analyze', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Body: z.infer<typeof photoAnalyzeSchema> }>) => {
    const data = photoAnalyzeSchema.parse(request.body);

    const result = await inspectionService.analyzePhoto(
      data.photoUrl,
      data.inspectionType,
      data.context
    );

    return { success: true, data: result };
  });

  // Generate inspection checklist
  fastify.post('/checklist-generate', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Body: z.infer<typeof checklistGenerateSchema> }>) => {
    const data = checklistGenerateSchema.parse(request.body);

    const checklist = await inspectionService.generateChecklist(
      data.jurisdiction,
      data.inspectionType,
      data.buildDetails
    );

    return { success: true, data: checklist };
  });

  // Generate daily digest
  fastify.post('/daily-digest', {
    preHandler: [requireOrg],
  }, async (request) => {
    const digest = await lotService.generateDailyDigest(request.organizationId!);
    return { success: true, data: digest };
  });
}
