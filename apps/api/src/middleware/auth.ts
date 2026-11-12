import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ error: "Unauthorized" });
  }
}

export function registerAuthHook(app: FastifyInstance) {
  app.decorate("authenticate", authenticate);
}
