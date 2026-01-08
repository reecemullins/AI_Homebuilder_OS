import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma, DrawStatus } from '@builderos/database';
import { requireOrg } from '../middleware/auth';

// Schemas
const drawCreateSchema = z.object({
  buildId: z.string(),
  amount: z.number().positive(),
  invoices: z.array(z.object({
    vendor: z.string(),
    amount: z.number(),
    invoiceUrl: z.string().optional(),
  })).optional(),
  photos: z.array(z.string()).optional(),
  inspectionId: z.string().optional(),
  notes: z.string().optional(),
});

const drawUpdateSchema = z.object({
  amount: z.number().positive().optional(),
  status: z.nativeEnum(DrawStatus).optional(),
  invoices: z.array(z.object({
    vendor: z.string(),
    amount: z.number(),
    invoiceUrl: z.string().optional(),
  })).optional(),
  photos: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export async function drawRoutes(fastify: FastifyInstance) {
  // List draws
  fastify.get('/', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Querystring: { buildId?: string; status?: string } }>) => {
    const { buildId, status } = request.query;

    // Get builds for org
    const builds = await prisma.build.findMany({
      where: { organizationId: request.organizationId },
      select: { id: true },
    });
    const buildIds = builds.map(b => b.id);

    const where: Record<string, unknown> = {
      buildId: buildId && buildIds.includes(buildId) ? buildId : { in: buildIds },
    };

    if (status) {
      where.status = { in: status.split(',') };
    }

    const draws = await prisma.draw.findMany({
      where,
      include: {
        build: {
          select: {
            lot: { select: { address: true } },
          },
        },
      },
      orderBy: [{ buildId: 'asc' }, { drawNumber: 'asc' }],
    });

    return { success: true, data: draws };
  });

  // Create draw request
  fastify.post('/', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Body: z.infer<typeof drawCreateSchema> }>, reply) => {
    const data = drawCreateSchema.parse(request.body);

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

    // Get next draw number
    const lastDraw = await prisma.draw.findFirst({
      where: { buildId: data.buildId },
      orderBy: { drawNumber: 'desc' },
    });
    const drawNumber = (lastDraw?.drawNumber || 0) + 1;

    const draw = await prisma.draw.create({
      data: {
        buildId: data.buildId,
        drawNumber,
        amount: data.amount,
        invoices: data.invoices || [],
        photos: data.photos || [],
        inspectionId: data.inspectionId,
        notes: data.notes,
      },
    });

    return reply.status(201).send({ success: true, data: draw });
  });

  // Get draw by ID
  fastify.get('/:id', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const draw = await prisma.draw.findFirst({
      where: { id: request.params.id },
      include: {
        build: {
          select: {
            organizationId: true,
            lot: { select: { address: true } },
            budgetTotal: true,
            actualHard: true,
            actualSoft: true,
          },
        },
      },
    });

    if (!draw || draw.build.organizationId !== request.organizationId) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Draw not found' },
      });
    }

    return { success: true, data: draw };
  });

  // Update draw
  fastify.patch('/:id', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: z.infer<typeof drawUpdateSchema> }>, reply) => {
    const data = drawUpdateSchema.parse(request.body);

    // Verify draw belongs to org
    const existing = await prisma.draw.findFirst({
      where: { id: request.params.id },
      include: { build: { select: { organizationId: true } } },
    });

    if (!existing || existing.build.organizationId !== request.organizationId) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Draw not found' },
      });
    }

    const draw = await prisma.draw.update({
      where: { id: request.params.id },
      data: {
        ...data,
        invoices: data.invoices,
        photos: data.photos,
      },
    });

    return { success: true, data: draw };
  });

  // Submit draw to lender
  fastify.post('/:id/submit', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    // Verify draw belongs to org
    const existing = await prisma.draw.findFirst({
      where: { id: request.params.id },
      include: { build: { select: { organizationId: true } } },
    });

    if (!existing || existing.build.organizationId !== request.organizationId) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Draw not found' },
      });
    }

    if (existing.status !== 'PREPARING') {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Draw has already been submitted' },
      });
    }

    const draw = await prisma.draw.update({
      where: { id: request.params.id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });

    return { success: true, data: draw };
  });
}
