import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma, TimeCategory } from '@builderos/database';
import { requireOrg } from '../middleware/auth';
import { AnalyticsService } from '../services/analytics.service';

const analyticsService = new AnalyticsService();

// Schemas
const timeEntrySchema = z.object({
  buildId: z.string().optional(),
  category: z.nativeEnum(TimeCategory),
  subcategory: z.string().optional(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date().optional(),
  description: z.string().optional(),
});

export async function analyticsRoutes(fastify: FastifyInstance) {
  // Main dashboard data
  fastify.get('/dashboard', {
    preHandler: [requireOrg],
  }, async (request) => {
    const metrics = await analyticsService.getDashboardMetrics(request.organizationId!);
    return { success: true, data: metrics };
  });

  // Time tracking analysis
  fastify.get('/time', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Querystring: { startDate?: string; endDate?: string; buildId?: string } }>) => {
    const { startDate, endDate, buildId } = request.query;

    const analysis = await analyticsService.getTimeAnalysis(
      request.organizationId!,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      buildId
    );

    return { success: true, data: analysis };
  });

  // Log time entry
  fastify.post('/time', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Body: z.infer<typeof timeEntrySchema> }>, reply) => {
    const data = timeEntrySchema.parse(request.body);

    let duration: number | undefined;
    if (data.endTime) {
      duration = Math.round((data.endTime.getTime() - data.startTime.getTime()) / 60000);
    }

    const entry = await prisma.timeEntry.create({
      data: {
        userId: request.userId!,
        buildId: data.buildId,
        category: data.category,
        subcategory: data.subcategory,
        startTime: data.startTime,
        endTime: data.endTime,
        duration,
        description: data.description,
      },
    });

    return reply.status(201).send({ success: true, data: entry });
  });

  // Margin analysis
  fastify.get('/margins', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Querystring: { startDate?: string; endDate?: string } }>) => {
    const { startDate, endDate } = request.query;

    const analysis = await analyticsService.getMarginAnalysis(
      request.organizationId!,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );

    return { success: true, data: analysis };
  });

  // Sub performance report
  fastify.get('/subs/performance', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Querystring: { startDate?: string; endDate?: string } }>) => {
    const { startDate, endDate } = request.query;

    const report = await analyticsService.getSubPerformanceReport(
      request.organizationId!,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );

    return { success: true, data: report };
  });
}
