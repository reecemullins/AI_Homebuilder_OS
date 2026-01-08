import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma, LotStatus, LotSource } from '@builderos/database';
import { requireOrg } from '../middleware/auth';
import { LotService } from '../services/lot.service';

const lotService = new LotService();

// Schemas
const lotCreateSchema = z.object({
  address: z.string().min(1),
  city: z.string().min(1),
  county: z.string().min(1),
  state: z.string().default('GA'),
  zip: z.string().min(5),
  latitude: z.number(),
  longitude: z.number(),
  acreage: z.number().positive(),
  source: z.nativeEnum(LotSource),
  sourceId: z.string().optional(),
  listPrice: z.number().positive().optional(),
  parcelId: z.string().optional(),
  zoning: z.string().optional(),
  utilities: z.object({
    water: z.boolean().optional(),
    sewer: z.boolean().optional(),
    electric: z.boolean().optional(),
    gas: z.boolean().optional(),
  }).optional(),
  topography: z.string().optional(),
});

const lotUpdateSchema = z.object({
  status: z.nativeEnum(LotStatus).optional(),
  listPrice: z.number().positive().optional(),
  estimatedValue: z.number().positive().optional(),
  zoning: z.string().optional(),
  zoningCompatible: z.boolean().optional(),
  utilities: z.object({
    water: z.boolean().optional(),
    sewer: z.boolean().optional(),
    electric: z.boolean().optional(),
    gas: z.boolean().optional(),
  }).optional(),
  topography: z.string().optional(),
  sellerMotivation: z.number().min(0).max(1).optional(),
});

const lotQuerySchema = z.object({
  status: z.string().optional(),
  minScore: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  source: z.string().optional(),
  sortBy: z.enum(['score', 'price', 'created', 'dom']).default('score'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
});

export async function lotRoutes(fastify: FastifyInstance) {
  // List lots with filters
  fastify.get('/', {
    preHandler: [requireOrg],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          minScore: { type: 'number' },
          maxPrice: { type: 'number' },
          source: { type: 'string' },
          sortBy: { type: 'string' },
          sortOrder: { type: 'string' },
          page: { type: 'number' },
          limit: { type: 'number' },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: z.infer<typeof lotQuerySchema> }>) => {
    const query = lotQuerySchema.parse(request.query);

    const where: Record<string, unknown> = {
      organizationId: request.organizationId,
    };

    if (query.status) {
      where.status = { in: query.status.split(',') };
    }
    if (query.minScore) {
      where.overallScore = { gte: query.minScore };
    }
    if (query.maxPrice) {
      where.listPrice = { lte: query.maxPrice };
    }
    if (query.source) {
      where.source = { in: query.source.split(',') };
    }

    const orderBy: Record<string, string> = {};
    switch (query.sortBy) {
      case 'score':
        orderBy.overallScore = query.sortOrder;
        break;
      case 'price':
        orderBy.listPrice = query.sortOrder;
        break;
      case 'created':
        orderBy.createdAt = query.sortOrder;
        break;
      case 'dom':
        orderBy.daysOnMarket = query.sortOrder;
        break;
    }

    const [lots, total] = await Promise.all([
      prisma.lot.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.lot.count({ where }),
    ]);

    return {
      success: true,
      data: lots,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  });

  // Create lot
  fastify.post('/', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Body: z.infer<typeof lotCreateSchema> }>, reply) => {
    const data = lotCreateSchema.parse(request.body);

    const lot = await prisma.lot.create({
      data: {
        ...data,
        organizationId: request.organizationId!,
        utilities: data.utilities || {},
      },
    });

    return reply.status(201).send({
      success: true,
      data: lot,
    });
  });

  // Get lot by ID
  fastify.get('/:id', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const lot = await prisma.lot.findFirst({
      where: {
        id: request.params.id,
        organizationId: request.organizationId,
      },
      include: {
        comparables: true,
        notes: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        contacts: {
          orderBy: { sentAt: 'desc' },
          take: 10,
        },
        build: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!lot) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Lot not found' },
      });
    }

    return { success: true, data: lot };
  });

  // Update lot
  fastify.patch('/:id', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: z.infer<typeof lotUpdateSchema> }>, reply) => {
    const data = lotUpdateSchema.parse(request.body);

    const lot = await prisma.lot.updateMany({
      where: {
        id: request.params.id,
        organizationId: request.organizationId,
      },
      data: {
        ...data,
        utilities: data.utilities ? data.utilities : undefined,
      },
    });

    if (lot.count === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Lot not found' },
      });
    }

    const updated = await prisma.lot.findUnique({
      where: { id: request.params.id },
    });

    return { success: true, data: updated };
  });

  // Delete lot
  fastify.delete('/:id', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const result = await prisma.lot.deleteMany({
      where: {
        id: request.params.id,
        organizationId: request.organizationId,
      },
    });

    if (result.count === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Lot not found' },
      });
    }

    return { success: true, message: 'Lot deleted' };
  });

  // Score/rescore lot
  fastify.post('/:id/score', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: { forceRefresh?: boolean; includeComps?: boolean } }>) => {
    const result = await lotService.scoreLot(
      request.params.id,
      request.organizationId!,
      request.body
    );
    return { success: true, data: result };
  });

  // Get comparables
  fastify.get('/:id/comparables', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Params: { id: string } }>) => {
    const comparables = await prisma.comparable.findMany({
      where: { lotId: request.params.id },
      orderBy: { distance: 'asc' },
    });
    return { success: true, data: comparables };
  });

  // Log contact attempt
  fastify.post('/:id/contact', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: { type: string; direction: string; channel: string; content?: string } }>, reply) => {
    const contact = await prisma.lotContact.create({
      data: {
        lotId: request.params.id,
        type: request.body.type as never,
        direction: request.body.direction as never,
        channel: request.body.channel as never,
        content: request.body.content,
      },
    });

    return reply.status(201).send({ success: true, data: contact });
  });

  // Daily digest
  fastify.get('/digest', {
    preHandler: [requireOrg],
  }, async (request) => {
    const digest = await lotService.generateDailyDigest(request.organizationId!);
    return { success: true, data: digest };
  });
}
