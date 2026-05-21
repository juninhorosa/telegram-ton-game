import { FastifyRequest, FastifyReply } from "fastify";

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({ error: "Unauthorized" });
  }
}

export async function adminMiddleware(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
    const user = request.user as { role?: string };
    if (!user.role || !["super_admin", "admin", "viewer"].includes(user.role)) {
      reply.status(403).send({ error: "Forbidden" });
    }
  } catch (err) {
    reply.status(401).send({ error: "Unauthorized" });
  }
}

export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { role?: string };
    if (!user.role || !roles.includes(user.role)) {
      reply.status(403).send({ error: "Insufficient permissions" });
    }
  };
}
