import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma, BuildStatus, Trade, TaskStatus } from '@builderos/database';
import { requireOrg } from '../middleware/auth';
import { BuildService } from '../services/build.service';

const buildService = new BuildService();

// Schemas
const buildCreateSchema = z.object({
  lotId: z.string(),
  floorPlanId: z.string().optional(),
  landCost: z.number().positive(),
  budgetHard: z.number().positive(),
  budgetSoft: z.number().positive(),
  projectedSalePrice: z.number().positive().optional(),
});

const buildUpdateSchema = z.object({
  status: z.nativeEnum(BuildStatus).optional(),
  floorPlanId: z.string().optional(),
  budgetHard: z.number().positive().optional(),
  budgetSoft: z.number().positive().optional(),
  contractPrice: z.number().positive().optional(),
  projectedSalePrice: z.number().positive().optional(),
  permitSubmitted: z.coerce.date().optional(),
  permitApproved: z.coerce.date().optional(),
  startDate: z.coerce.date().optional(),
  estimatedComplete: z.coerce.date().optional(),
  actualComplete: z.coerce.date().optional(),
  closingDate: z.coerce.date().optional(),
});

const taskCreateSchema = z.object({
  name: z.string().min(1),
  phase: z.nativeEnum(BuildStatus),
  trade: z.nativeEnum(Trade),
  duration: z.number().positive(),
  scheduledStart: z.coerce.date().optional(),
  scheduledEnd: z.coerce.date().optional(),
  subcontractorId: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  budgetAmount: z.number().optional(),
  notes: z.string().optional(),
});

const taskUpdateSchema = z.object({
  name: z.string().optional(),
  phase: z.nativeEnum(BuildStatus).optional(),
  trade: z.nativeEnum(Trade).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  scheduledStart: z.coerce.date().optional(),
  scheduledEnd: z.coerce.date().optional(),
  actualStart: z.coerce.date().optional(),
  actualEnd: z.coerce.date().optional(),
  subcontractorId: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  blockedBy: z.array(z.string()).optional(),
  budgetAmount: z.number().optional(),
  actualAmount: z.number().optional(),
  notes: z.string().optional(),
});

export async function buildRoutes(fastify: FastifyInstance) {
  // List builds
  fastify.get('/', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Querystring: { status?: string; page?: number; limit?: number } }>) => {
    const { status, page = 1, limit = 20 } = request.query;

    const where: Record<string, unknown> = {
      organizationId: request.organizationId,
    };

    if (status) {
      where.status = { in: status.split(',') };
    }

    const [builds, total] = await Promise.all([
      prisma.build.findMany({
        where,
        include: {
          lot: {
            select: {
              address: true,
              city: true,
            },
          },
          floorPlan: {
            select: {
              name: true,
              sqft: true,
            },
          },
          _count: {
            select: {
              tasks: true,
              inspections: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.build.count({ where }),
    ]);

    return {
      success: true,
      data: builds,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  });

  // Create build from lot
  fastify.post('/', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Body: z.infer<typeof buildCreateSchema> }>, reply) => {
    const data = buildCreateSchema.parse(request.body);

    // Verify lot exists and belongs to org
    const lot = await prisma.lot.findFirst({
      where: {
        id: data.lotId,
        organizationId: request.organizationId,
      },
    });

    if (!lot) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Lot not found' },
      });
    }

    // Check if lot already has a build
    const existingBuild = await prisma.build.findUnique({
      where: { lotId: data.lotId },
    });

    if (existingBuild) {
      return reply.status(409).send({
        success: false,
        error: { code: 'ALREADY_EXISTS', message: 'Build already exists for this lot' },
      });
    }

    const build = await prisma.build.create({
      data: {
        organizationId: request.organizationId!,
        lotId: data.lotId,
        floorPlanId: data.floorPlanId,
        landCost: data.landCost,
        budgetHard: data.budgetHard,
        budgetSoft: data.budgetSoft,
        budgetTotal: data.landCost + data.budgetHard + data.budgetSoft,
        projectedSalePrice: data.projectedSalePrice,
      },
      include: {
        lot: true,
        floorPlan: true,
      },
    });

    // Update lot status
    await prisma.lot.update({
      where: { id: data.lotId },
      data: { status: 'PURCHASED' },
    });

    return reply.status(201).send({ success: true, data: build });
  });

  // Get build by ID
  fastify.get('/:id', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const build = await prisma.build.findFirst({
      where: {
        id: request.params.id,
        organizationId: request.organizationId,
      },
      include: {
        lot: true,
        floorPlan: true,
        tasks: {
          include: {
            subcontractor: {
              select: {
                id: true,
                companyName: true,
              },
            },
          },
          orderBy: { scheduledStart: 'asc' },
        },
        inspections: {
          orderBy: { scheduledDate: 'asc' },
        },
        _count: {
          select: {
            photos: true,
            purchaseOrders: true,
            draws: true,
          },
        },
      },
    });

    if (!build) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Build not found' },
      });
    }

    return { success: true, data: build };
  });

  // Update build
  fastify.patch('/:id', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: z.infer<typeof buildUpdateSchema> }>, reply) => {
    const data = buildUpdateSchema.parse(request.body);

    const result = await prisma.build.updateMany({
      where: {
        id: request.params.id,
        organizationId: request.organizationId,
      },
      data,
    });

    if (result.count === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Build not found' },
      });
    }

    const build = await prisma.build.findUnique({
      where: { id: request.params.id },
      include: { lot: true, floorPlan: true },
    });

    return { success: true, data: build };
  });

  // Get build timeline (Gantt data)
  fastify.get('/:id/timeline', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Params: { id: string } }>) => {
    const timeline = await buildService.getTimeline(
      request.params.id,
      request.organizationId!
    );
    return { success: true, data: timeline };
  });

  // Add task to build
  fastify.post('/:id/tasks', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: z.infer<typeof taskCreateSchema> }>, reply) => {
    const data = taskCreateSchema.parse(request.body);

    // Verify build exists
    const build = await prisma.build.findFirst({
      where: {
        id: request.params.id,
        organizationId: request.organizationId,
      },
    });

    if (!build) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Build not found' },
      });
    }

    const task = await prisma.buildTask.create({
      data: {
        buildId: request.params.id,
        name: data.name,
        phase: data.phase,
        trade: data.trade,
        duration: data.duration,
        scheduledStart: data.scheduledStart,
        scheduledEnd: data.scheduledEnd,
        subcontractorId: data.subcontractorId,
        dependencies: data.dependencies || [],
        budgetAmount: data.budgetAmount,
        notes: data.notes,
      },
      include: {
        subcontractor: {
          select: { id: true, companyName: true },
        },
      },
    });

    return reply.status(201).send({ success: true, data: task });
  });

  // Update task
  fastify.patch('/:id/tasks/:taskId', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Params: { id: string; taskId: string }; Body: z.infer<typeof taskUpdateSchema> }>, reply) => {
    const data = taskUpdateSchema.parse(request.body);

    // Verify build belongs to org
    const build = await prisma.build.findFirst({
      where: {
        id: request.params.id,
        organizationId: request.organizationId,
      },
    });

    if (!build) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Build not found' },
      });
    }

    const task = await prisma.buildTask.update({
      where: { id: request.params.taskId },
      data,
      include: {
        subcontractor: {
          select: { id: true, companyName: true },
        },
      },
    });

    return { success: true, data: task };
  });

  // Get financials
  fastify.get('/:id/financials', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Params: { id: string } }>) => {
    const financials = await buildService.getFinancials(
      request.params.id,
      request.organizationId!
    );
    return { success: true, data: financials };
  });

  // Upload photos
  fastify.post('/:id/photos', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: { url: string; category: string; description?: string } }>, reply) => {
    const { url, category, description } = request.body;

    // Get build to determine current phase
    const build = await prisma.build.findFirst({
      where: {
        id: request.params.id,
        organizationId: request.organizationId,
      },
    });

    if (!build) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Build not found' },
      });
    }

    const photo = await prisma.buildPhoto.create({
      data: {
        buildId: request.params.id,
        url,
        category: category as never,
        phase: build.status,
        description,
        uploadedBy: request.userId,
      },
    });

    return reply.status(201).send({ success: true, data: photo });
  });
}
