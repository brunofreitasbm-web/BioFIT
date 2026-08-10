import fastifyJwt from "@fastify/jwt";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Role } from "@biofit/shared";

export interface JwtPayload {
  sub: string;
  role: Role;
  personalId?: string | null;
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

export async function registerAuth(app: FastifyInstance) {
  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET ?? "dev-secret-change-in-production",
  });

  app.decorate("authenticate", async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
    } catch {
      reply.code(401).send({ error: "Token inválido ou ausente" });
    }
  });
}

export function requireRole(role: Role) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (req.user.role !== role) {
      reply.code(403).send({ error: `Acesso restrito a usuários ${role}` });
    }
  };
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
