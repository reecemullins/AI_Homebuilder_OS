import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import { authMiddleware, orgContextMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error-handler';

// Routes
import { lotRoutes } from './routes/lots';
import { buildRoutes } from './routes/builds';
import { scheduleRoutes } from './routes/schedule';
import { subRoutes } from './routes/subs';
import { inspectionRoutes } from './routes/inspections';
import { procurementRoutes } from './routes/procurement';
import { drawRoutes } from './routes/draws';
import { analyticsRoutes } from './routes/analytics';
import { aiRoutes } from './routes/ai';

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    } : undefined,
  },
});

async function main() {
  // Register plugins
  await server.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  await server.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  });

  await server.register(swagger, {
    openapi: {
      info: {
        title: 'BuilderOS API',
        description: 'AI-powered operational system for residential construction management',
        version: '1.0.0',
      },
      servers: [
        { url: 'http://localhost:3001', description: 'Development server' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
          },
        },
      },
    },
  });

  await server.register(swaggerUi, {
    routePrefix: '/docs',
  });

  // Global error handler
  server.setErrorHandler(errorHandler);

  // Health check
  server.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Register middleware and routes with /api/v1 prefix
  await server.register(async (fastify) => {
    // Apply auth middleware to all routes in this scope
    fastify.addHook('preHandler', authMiddleware);
    fastify.addHook('preHandler', orgContextMiddleware);

    // Register routes
    await fastify.register(lotRoutes, { prefix: '/lots' });
    await fastify.register(buildRoutes, { prefix: '/builds' });
    await fastify.register(scheduleRoutes, { prefix: '/schedule' });
    await fastify.register(subRoutes, { prefix: '/subs' });
    await fastify.register(inspectionRoutes, { prefix: '/inspections' });
    await fastify.register(procurementRoutes, { prefix: '/procurement' });
    await fastify.register(drawRoutes, { prefix: '/draws' });
    await fastify.register(analyticsRoutes, { prefix: '/analytics' });
    await fastify.register(aiRoutes, { prefix: '/ai' });
  }, { prefix: '/api/v1' });

  // Start server
  const port = parseInt(process.env.PORT || '3001', 10);
  const host = process.env.HOST || '0.0.0.0';

  try {
    await server.listen({ port, host });
    console.log(`Server running at http://${host}:${port}`);
    console.log(`API docs available at http://${host}:${port}/docs`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    console.log(`Received ${signal}, shutting down gracefully...`);
    await server.close();
    process.exit(0);
  });
});

main();
