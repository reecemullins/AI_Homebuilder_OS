import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma, SupplierCategory, POStatus } from '@builderos/database';
import { requireOrg } from '../middleware/auth';
import { ProcurementService } from '../services/procurement.service';

const procurementService = new ProcurementService();

// Schemas
const supplierCreateSchema = z.object({
  name: z.string().min(1),
  category: z.nativeEnum(SupplierCategory),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  paymentTerms: z.number().default(30),
  creditLimit: z.number().optional(),
  volumeDiscounts: z.array(z.object({
    threshold: z.number(),
    discountPct: z.number(),
  })).optional(),
  isBackup: z.boolean().default(false),
});

const supplierUpdateSchema = z.object({
  name: z.string().optional(),
  category: z.nativeEnum(SupplierCategory).optional(),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  avgLeadTime: z.number().optional(),
  onTimeRate: z.number().min(0).max(1).optional(),
  qualityRating: z.number().min(0).max(1).optional(),
  paymentTerms: z.number().optional(),
  creditLimit: z.number().optional(),
  volumeDiscounts: z.array(z.object({
    threshold: z.number(),
    discountPct: z.number(),
  })).optional(),
  isBackup: z.boolean().optional(),
});

const poCreateSchema = z.object({
  buildId: z.string(),
  supplierId: z.string(),
  items: z.array(z.object({
    sku: z.string(),
    description: z.string(),
    qty: z.number().positive(),
    unitPrice: z.number().positive(),
    total: z.number().positive(),
  })),
  expectedDelivery: z.coerce.date().optional(),
  notes: z.string().optional(),
});

const aggregateSchema = z.object({
  buildIds: z.array(z.string()),
  category: z.nativeEnum(SupplierCategory),
});

export async function procurementRoutes(fastify: FastifyInstance) {
  // List suppliers
  fastify.get('/suppliers', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Querystring: { category?: string } }>) => {
    const { category } = request.query;

    const where: Record<string, unknown> = {
      organizationId: request.organizationId,
    };

    if (category) {
      where.category = category;
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return { success: true, data: suppliers };
  });

  // Add supplier
  fastify.post('/suppliers', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Body: z.infer<typeof supplierCreateSchema> }>, reply) => {
    const data = supplierCreateSchema.parse(request.body);

    const supplier = await prisma.supplier.create({
      data: {
        organizationId: request.organizationId!,
        ...data,
        volumeDiscounts: data.volumeDiscounts || [],
      },
    });

    return reply.status(201).send({ success: true, data: supplier });
  });

  // Update supplier
  fastify.patch('/suppliers/:id', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: z.infer<typeof supplierUpdateSchema> }>, reply) => {
    const data = supplierUpdateSchema.parse(request.body);

    const result = await prisma.supplier.updateMany({
      where: {
        id: request.params.id,
        organizationId: request.organizationId,
      },
      data: {
        ...data,
        volumeDiscounts: data.volumeDiscounts,
      },
    });

    if (result.count === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Supplier not found' },
      });
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id: request.params.id },
    });

    return { success: true, data: supplier };
  });

  // Get material prices
  fastify.get('/prices', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Querystring: { material?: string; category?: string; startDate?: string; endDate?: string } }>) => {
    const { material, category, startDate, endDate } = request.query;

    const where: Record<string, unknown> = {};

    if (material) {
      where.material = { contains: material, mode: 'insensitive' };
    }
    if (category) {
      where.category = category;
    }
    if (startDate || endDate) {
      where.recordedAt = {};
      if (startDate) {
        (where.recordedAt as Record<string, unknown>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.recordedAt as Record<string, unknown>).lte = new Date(endDate);
      }
    }

    const prices = await prisma.materialPrice.findMany({
      where,
      orderBy: { recordedAt: 'desc' },
      take: 100,
    });

    return { success: true, data: prices };
  });

  // Price forecast
  fastify.get('/prices/forecast', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Querystring: { material: string; days?: number } }>) => {
    const { material, days = 30 } = request.query;

    const forecast = await procurementService.getPriceForecast(material, days);
    return { success: true, data: forecast };
  });

  // Create purchase order
  fastify.post('/po', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Body: z.infer<typeof poCreateSchema> }>, reply) => {
    const data = poCreateSchema.parse(request.body);

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

    // Calculate totals
    const subtotal = data.items.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.08; // 8% tax rate
    const total = subtotal + tax;

    // Generate PO number
    const poCount = await prisma.purchaseOrder.count();
    const poNumber = `PO-${String(poCount + 1).padStart(6, '0')}`;

    const po = await prisma.purchaseOrder.create({
      data: {
        buildId: data.buildId,
        supplierId: data.supplierId,
        poNumber,
        items: data.items,
        subtotal,
        tax,
        total,
        expectedDelivery: data.expectedDelivery,
        notes: data.notes,
      },
      include: {
        supplier: { select: { name: true } },
        build: {
          select: { lot: { select: { address: true } } },
        },
      },
    });

    return reply.status(201).send({ success: true, data: po });
  });

  // Get purchase order
  fastify.get('/po/:id', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const po = await prisma.purchaseOrder.findFirst({
      where: { id: request.params.id },
      include: {
        supplier: true,
        build: {
          select: {
            organizationId: true,
            lot: { select: { address: true } },
          },
        },
      },
    });

    if (!po || po.build.organizationId !== request.organizationId) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Purchase order not found' },
      });
    }

    return { success: true, data: po };
  });

  // Update PO status
  fastify.patch('/po/:id', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: { status?: POStatus; deliveredAt?: string } }>, reply) => {
    const { status, deliveredAt } = request.body;

    // Verify PO belongs to org
    const existing = await prisma.purchaseOrder.findFirst({
      where: { id: request.params.id },
      include: { build: { select: { organizationId: true } } },
    });

    if (!existing || existing.build.organizationId !== request.organizationId) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Purchase order not found' },
      });
    }

    const updateData: Record<string, unknown> = {};
    if (status) {
      updateData.status = status;
      if (status === 'SUBMITTED') {
        updateData.orderedAt = new Date();
      }
    }
    if (deliveredAt) {
      updateData.deliveredAt = new Date(deliveredAt);
    }

    const po = await prisma.purchaseOrder.update({
      where: { id: request.params.id },
      data: updateData,
      include: { supplier: { select: { name: true } } },
    });

    return { success: true, data: po };
  });

  // Generate consolidated order
  fastify.post('/aggregate', {
    preHandler: [requireOrg],
  }, async (request: FastifyRequest<{ Body: z.infer<typeof aggregateSchema> }>) => {
    const data = aggregateSchema.parse(request.body);

    const consolidated = await procurementService.generateConsolidatedOrder(
      data.buildIds,
      data.category,
      request.organizationId!
    );

    return { success: true, data: consolidated };
  });
}
