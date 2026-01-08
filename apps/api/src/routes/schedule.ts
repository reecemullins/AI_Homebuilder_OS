import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma, Trade, ScheduleStatus } from '@builderos/database';
import { requireOrg } from '../middleware/auth';
import { ScheduleService } from '../services/schedule.service';

const scheduleService = new ScheduleService();

// Schemas
const scheduleCreateSchema = z.object({
  buildId: z.string(),
  subcontractorId: z.string().optional(),
  taskId: z.string().optional(),
  trade: z.nativeEnum(Trade),
  description: z.string(),
  scheduledDate: z.coerce.date(),
  scheduledTime: z.string().optional(),
  estimatedDuration: z.number().positive(),
  notes: z.string().optional(),
});

const scheduleUpdateSchema = z.object({
  subcontractorId: z.string().optional(),
  scheduledDate: z.coerce.date().optional(),
  scheduledTime: z.string().optional(),
  estimatedDuration: z.number().positive().optional(),
  status: z.nativeEnum(ScheduleStatus).optional(),
  confirmedAt: z.coerce.date().optional(),
  arrivedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
  weatherDelay: z.boolean().optional(),
  notes: z.string().optional(),
});

const optimizeSchema = z.object({
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

const resequenceSchema = z.object({
  buildId: z.string(),
  delayedTaskId: z.string(),
  newCompletionDate: z.string(),
  reason: z.string(),
});

export async function scheduleRoutes(fastify: FastifyInstance) {
  // Get schedule (calendar view)
  fastify.get('/', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Querystring: { buildId?: string; startDate?: string; endDate?: string; subId?: string } }>) => {
    const { buildId, startDate, endDate, subId } = request.query;

    const where: Record<string, unknown> = {};

    if (buildId) {
      // Verify build belongs to org
      const build = await prisma.build.findFirst({
        where: { id: buildId, organizationId: request.organizationId },
      });
      if (build) {
        where.buildId = buildId;
      }
    } else {
      // Get all builds for org
      const builds = await prisma.build.findMany({
        where: { organizationId: request.organizationId },
        select: { id: true },
      });
      where.buildId = { in: builds.map(b => b.id) };
    }

    if (startDate) {
      where.scheduledDate = { ...((where.scheduledDate as Record<string, unknown>) || {}), gte: new Date(startDate) };
    }
    if (endDate) {
      where.scheduledDate = { ...((where.scheduledDate as Record<string, unknown>) || {}), lte: new Date(endDate) };
    }
    if (subId) {
      where.subcontractorId = subId;
    }

    const entries = await prisma.scheduleEntry.findMany({
      where,
      include: {
        build: {
          select: {
            id: true,
            lot: {
              select: { address: true, city: true },
            },
          },
        },
        subcontractor: {
          select: { id: true, companyName: true, contactName: true, phone: true },
        },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    return { success: true, data: entries };
  });

  // Create schedule entry
  fastify.post('/', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Body: z.infer<typeof scheduleCreateSchema> }>, reply) => {
    const data = scheduleCreateSchema.parse(request.body);

    // Verify build belongs to org
    const build = await prisma.build.findFirst({
      where: { id: data.buildId, organizationId: request.organizationId },
    });

    if (!build) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Build not found' },
      });
    }

    const entry = await prisma.scheduleEntry.create({
      data: {
        buildId: data.buildId,
        subcontractorId: data.subcontractorId,
        taskId: data.taskId,
        trade: data.trade,
        description: data.description,
        scheduledDate: data.scheduledDate,
        scheduledTime: data.scheduledTime,
        estimatedDuration: data.estimatedDuration,
        notes: data.notes,
      },
      include: {
        build: {
          select: {
            lot: { select: { address: true } },
          },
        },
        subcontractor: {
          select: { id: true, companyName: true },
        },
      },
    });

    // Schedule confirmation messages if sub is assigned
    if (data.subcontractorId) {
      await scheduleService.scheduleConfirmations(entry.id);
    }

    return reply.status(201).send({ success: true, data: entry });
  });

  // Update schedule entry
  fastify.patch('/:id', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: z.infer<typeof scheduleUpdateSchema> }>, reply) => {
    const data = scheduleUpdateSchema.parse(request.body);

    // Verify entry belongs to org's build
    const existing = await prisma.scheduleEntry.findFirst({
      where: { id: request.params.id },
      include: { build: { select: { organizationId: true } } },
    });

    if (!existing || existing.build.organizationId !== request.organizationId) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Schedule entry not found' },
      });
    }

    const entry = await prisma.scheduleEntry.update({
      where: { id: request.params.id },
      data,
      include: {
        subcontractor: {
          select: { id: true, companyName: true },
        },
      },
    });

    return { success: true, data: entry };
  });

  // AI schedule optimization
  fastify.post('/optimize', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Body: z.infer<typeof optimizeSchema> }>) => {
    const data = optimizeSchema.parse(request.body);

    const result = await scheduleService.optimizeSchedule(
      data.buildId,
      request.organizationId!,
      data.constraints,
      data.preferences
    );

    return { success: true, data: result };
  });

  // Handle delay cascading
  fastify.post('/resequence', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Body: z.infer<typeof resequenceSchema> }>) => {
    const data = resequenceSchema.parse(request.body);

    const result = await scheduleService.resequence(
      data.buildId,
      request.organizationId!,
      data.delayedTaskId,
      data.newCompletionDate,
      data.reason
    );

    return { success: true, data: result };
  });
}
