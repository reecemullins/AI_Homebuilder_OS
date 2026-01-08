import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@builderos/database';

// Extend FastifyRequest to include user and organization context
declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    organizationId?: string;
    userRole?: string;
  }
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid authorization header',
      },
    });
  }

  const token = authHeader.slice(7);

  try {
    // In production, verify token with Clerk
    // For now, we'll decode and validate the token structure
    // The actual Clerk verification would be:
    // const session = await clerk.verifyToken(token);

    // Mock verification for development
    if (process.env.NODE_ENV === 'development' && token === 'dev-token') {
      request.userId = 'dev-user';
      return;
    }

    // TODO: Implement actual Clerk token verification
    // const payload = await verifyClerkToken(token);
    // request.userId = payload.sub;

    // For now, extract user ID from token (placeholder)
    request.userId = token;
  } catch (error) {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
      },
    });
  }
}

export async function orgContextMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.userId) {
    return;
  }

  try {
    // Get organization context from header or user's default
    const orgIdHeader = request.headers['x-organization-id'] as string | undefined;

    if (orgIdHeader) {
      // Verify user has access to this organization
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { id: request.userId },
            { clerkId: request.userId },
          ],
          organizationId: orgIdHeader,
        },
        select: {
          id: true,
          organizationId: true,
          role: true,
        },
      });

      if (user) {
        request.userId = user.id;
        request.organizationId = user.organizationId;
        request.userRole = user.role;
        return;
      }
    }

    // Fall back to user's default organization
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: request.userId },
          { clerkId: request.userId },
        ],
      },
      select: {
        id: true,
        organizationId: true,
        role: true,
      },
    });

    if (user) {
      request.userId = user.id;
      request.organizationId = user.organizationId;
      request.userRole = user.role;
    }
  } catch (error) {
    request.log.error(error, 'Error fetching organization context');
  }
}

export function requireOrg(
  request: FastifyRequest,
  reply: FastifyReply
): void {
  if (!request.organizationId) {
    reply.status(403).send({
      success: false,
      error: {
        code: 'NO_ORGANIZATION',
        message: 'Organization context required',
      },
    });
  }
}

export function requireRole(allowedRoles: string[]) {
  return function (request: FastifyRequest, reply: FastifyReply): void {
    if (!request.userRole || !allowedRoles.includes(request.userRole)) {
      reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      });
    }
  };
}
