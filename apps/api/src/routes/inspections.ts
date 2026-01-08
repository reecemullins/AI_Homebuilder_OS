import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma, InspectionType, InspectionStatus, InspectionResult } from '@builderos/database';
import { requireOrg } from '../middleware/auth';
import { InspectionService } from '../services/inspection.service';

const inspectionService = new InspectionService();

// Schemas
const inspectionCreateSchema = z.object({
  buildId: z.string(),
  type: z.nativeEnum(InspectionType),
  jurisdiction: z.string(),
  scheduledDate: z.coerce.date().optional(),
  scheduledTime: z.string().optional(),
  inspectorId: z.string().optional(),
});

const inspectionUpdateSchema = z.object({
  scheduledDate: z.coerce.date().optional(),
  scheduledTime: z.string().optional(),
  inspectorId: z.string().optional(),
  status: z.nativeEnum(InspectionStatus).optional(),
  result: z.nativeEnum(InspectionResult).optional(),
  failedItems: z.array(z.object({
    itemId: z.string(),
    description: z.string(),
    correctionRequired: z.string(),
  })).optional(),
  notes: z.string().optional(),
});

export async function inspectionRoutes(fastify: FastifyInstance) {
  // List inspections
  fastify.get('/', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Querystring: { buildId?: string; status?: string; type?: string } }>) => {
    const { buildId, status, type } = request.query;

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
    if (type) {
      where.type = { in: type.split(',') };
    }

    const inspections = await prisma.inspection.findMany({
      where,
      include: {
        build: {
          select: {
            lot: { select: { address: true, city: true } },
          },
        },
        inspector: {
          select: { id: true, name: true, phone: true },
        },
        _count: {
          select: { photos: true },
        },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    return { success: true, data: inspections };
  });

  // Schedule inspection
  fastify.post('/', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Body: z.infer<typeof inspectionCreateSchema> }>, reply) => {
    const data = inspectionCreateSchema.parse(request.body);

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

    // Generate checklist if available
    let checklistId: string | undefined;
    const checklist = await prisma.inspectionChecklist.findFirst({
      where: {
        jurisdiction: data.jurisdiction,
        type: data.type,
      },
      orderBy: { version: 'desc' },
    });
    if (checklist) {
      checklistId = checklist.id;
    }

    const inspection = await prisma.inspection.create({
      data: {
        buildId: data.buildId,
        type: data.type,
        jurisdiction: data.jurisdiction,
        scheduledDate: data.scheduledDate,
        scheduledTime: data.scheduledTime,
        inspectorId: data.inspectorId,
        checklistId,
        status: data.scheduledDate ? 'SCHEDULED' : 'NOT_SCHEDULED',
      },
      include: {
        inspector: true,
        checklist: true,
      },
    });

    return reply.status(201).send({ success: true, data: inspection });
  });

  // Get inspection by ID
  fastify.get('/:id', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const inspection = await prisma.inspection.findFirst({
      where: { id: request.params.id },
      include: {
        build: {
          select: {
            organizationId: true,
            lot: { select: { address: true, city: true } },
          },
        },
        inspector: true,
        checklist: true,
        photos: {
          orderBy: { capturedAt: 'desc' },
        },
      },
    });

    if (!inspection || inspection.build.organizationId !== request.organizationId) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Inspection not found' },
      });
    }

    return { success: true, data: inspection };
  });

  // Update inspection
  fastify.patch('/:id', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: z.infer<typeof inspectionUpdateSchema> }>, reply) => {
    const data = inspectionUpdateSchema.parse(request.body);

    // Verify inspection belongs to org
    const existing = await prisma.inspection.findFirst({
      where: { id: request.params.id },
      include: { build: { select: { organizationId: true } } },
    });

    if (!existing || existing.build.organizationId !== request.organizationId) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Inspection not found' },
      });
    }

    const updateData: Record<string, unknown> = { ...data };
    if (data.result === 'PASS') {
      updateData.passedAt = new Date();
      updateData.status = 'PASSED';
    } else if (data.result === 'FAIL') {
      updateData.status = 'FAILED';
    }

    const inspection = await prisma.inspection.update({
      where: { id: request.params.id },
      data: updateData,
      include: {
        inspector: true,
        checklist: true,
      },
    });

    return { success: true, data: inspection };
  });

  // Get/generate checklist
  fastify.get('/:id/checklist', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Params: { id: string } }>) => {
    const checklist = await inspectionService.getOrGenerateChecklist(
      request.params.id,
      request.organizationId!
    );
    return { success: true, data: checklist };
  });

  // Upload inspection photos
  fastify.post('/:id/photos', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: { url: string; category: string; checklistItemId?: string } }>, reply) => {
    const { url, category, checklistItemId } = request.body;

    // Verify inspection belongs to org
    const inspection = await prisma.inspection.findFirst({
      where: { id: request.params.id },
      include: { build: { select: { organizationId: true } } },
    });

    if (!inspection || inspection.build.organizationId !== request.organizationId) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Inspection not found' },
      });
    }

    const photo = await prisma.inspectionPhoto.create({
      data: {
        inspectionId: request.params.id,
        url,
        category,
        checklistItemId,
      },
    });

    return reply.status(201).send({ success: true, data: photo });
  });

  // Run AI pre-audit
  fastify.post('/:id/pre-audit', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: { photos?: string[] } }>) => {
    const result = await inspectionService.runPreAudit(
      request.params.id,
      request.organizationId!,
      request.body.photos
    );
    return { success: true, data: result };
  });
}
