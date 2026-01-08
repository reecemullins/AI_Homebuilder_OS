import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma, Trade, SubStatus, PricingTier, PaymentMethod } from '@builderos/database';
import { requireOrg } from '../middleware/auth';
import { SubService } from '../services/sub.service';

const subService = new SubService();

// Schemas
const subCreateSchema = z.object({
  companyName: z.string().min(1),
  contactName: z.string().min(1),
  phone: z.string().min(10),
  email: z.string().email().optional(),
  address: z.string().optional(),
  trades: z.array(z.nativeEnum(Trade)),
  crewSize: z.number().positive().optional(),
  maxConcurrent: z.number().positive().default(1),
  serviceRadius: z.number().positive().optional(),
  licenseNumber: z.string().optional(),
  licenseExpiry: z.coerce.date().optional(),
  insuranceExpiry: z.coerce.date().optional(),
  insuranceAmount: z.number().positive().optional(),
  pricingTier: z.nativeEnum(PricingTier).default('MARKET'),
  preferredPayment: z.nativeEnum(PaymentMethod).default('CHECK'),
  paymentTerms: z.number().default(7),
});

const subUpdateSchema = z.object({
  companyName: z.string().optional(),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  trades: z.array(z.nativeEnum(Trade)).optional(),
  crewSize: z.number().positive().optional(),
  maxConcurrent: z.number().positive().optional(),
  serviceRadius: z.number().positive().optional(),
  licenseNumber: z.string().optional(),
  licenseExpiry: z.coerce.date().optional(),
  insuranceExpiry: z.coerce.date().optional(),
  insuranceAmount: z.number().positive().optional(),
  w9OnFile: z.boolean().optional(),
  pricingTier: z.nativeEnum(PricingTier).optional(),
  status: z.nativeEnum(SubStatus).optional(),
  preferredPayment: z.nativeEnum(PaymentMethod).optional(),
  paymentTerms: z.number().optional(),
});

const ratingSchema = z.object({
  buildId: z.string(),
  taskId: z.string(),
  arrivedOnTime: z.boolean(),
  completedOnTime: z.boolean(),
  qualityScore: z.number().min(1).max(5),
  communicationScore: z.number().min(1).max(5),
  cleanupScore: z.number().min(1).max(5),
  wouldRehire: z.boolean(),
  notes: z.string().optional(),
});

const recommendSchema = z.object({
  trade: z.nativeEnum(Trade),
  buildId: z.string(),
  scheduledDate: z.string(),
  duration: z.number().positive(),
  priority: z.enum(['COST', 'RELIABILITY', 'SPEED']).default('RELIABILITY'),
});

export async function subRoutes(fastify: FastifyInstance) {
  // List subcontractors
  fastify.get('/', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Querystring: { status?: string; trade?: string; page?: number; limit?: number } }>) => {
    const { status, trade, page = 1, limit = 20 } = request.query;

    const where: Record<string, unknown> = {
      organizationId: request.organizationId,
    };

    if (status) {
      where.status = { in: status.split(',') };
    }
    if (trade) {
      where.trades = { hasSome: trade.split(',') as Trade[] };
    }

    const [subs, total] = await Promise.all([
      prisma.subcontractor.findMany({
        where,
        orderBy: { reliabilityScore: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.subcontractor.count({ where }),
    ]);

    return {
      success: true,
      data: subs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  });

  // Create subcontractor
  fastify.post('/', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Body: z.infer<typeof subCreateSchema> }>, reply) => {
    const data = subCreateSchema.parse(request.body);

    const sub = await prisma.subcontractor.create({
      data: {
        organizationId: request.organizationId!,
        ...data,
      },
    });

    return reply.status(201).send({ success: true, data: sub });
  });

  // Get subcontractor by ID with history
  fastify.get('/:id', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const sub = await prisma.subcontractor.findFirst({
      where: {
        id: request.params.id,
        organizationId: request.organizationId,
      },
      include: {
        ratings: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        tasks: {
          where: { status: 'COMPLETE' },
          orderBy: { actualEnd: 'desc' },
          take: 10,
          include: {
            build: {
              select: {
                lot: { select: { address: true } },
              },
            },
          },
        },
        _count: {
          select: {
            tasks: true,
            scheduleEntries: true,
          },
        },
      },
    });

    if (!sub) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Subcontractor not found' },
      });
    }

    return { success: true, data: sub };
  });

  // Update subcontractor
  fastify.patch('/:id', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: z.infer<typeof subUpdateSchema> }>, reply) => {
    const data = subUpdateSchema.parse(request.body);

    const result = await prisma.subcontractor.updateMany({
      where: {
        id: request.params.id,
        organizationId: request.organizationId,
      },
      data,
    });

    if (result.count === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Subcontractor not found' },
      });
    }

    const sub = await prisma.subcontractor.findUnique({
      where: { id: request.params.id },
    });

    return { success: true, data: sub };
  });

  // Add rating
  fastify.post('/:id/rate', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: z.infer<typeof ratingSchema> }>, reply) => {
    const data = ratingSchema.parse(request.body);

    // Verify sub belongs to org
    const sub = await prisma.subcontractor.findFirst({
      where: {
        id: request.params.id,
        organizationId: request.organizationId,
      },
    });

    if (!sub) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Subcontractor not found' },
      });
    }

    const rating = await prisma.subRating.create({
      data: {
        subcontractorId: request.params.id,
        ...data,
      },
    });

    // Update reliability score
    await subService.updateReliabilityScore(request.params.id);

    return reply.status(201).send({ success: true, data: rating });
  });

  // Check availability
  fastify.get('/:id/availability', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Params: { id: string }; Querystring: { startDate: string; endDate: string } }>) => {
    const { startDate, endDate } = request.query;

    const availability = await subService.checkAvailability(
      request.params.id,
      new Date(startDate),
      new Date(endDate)
    );

    return { success: true, data: availability };
  });

  // AI sub recommendation
  fastify.get('/recommend', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Querystring: z.infer<typeof recommendSchema> }>) => {
    const data = recommendSchema.parse(request.query);

    const recommendations = await subService.recommendSubs(
      request.organizationId!,
      data.trade,
      data.buildId,
      new Date(data.scheduledDate),
      data.duration,
      data.priority
    );

    return { success: true, data: recommendations };
  });
}
