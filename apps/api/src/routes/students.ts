import bcrypt from "bcryptjs";
import type { FastifyInstance } from "fastify";
import { createStudentSchema } from "@biofit/shared";
import { prisma } from "../prisma";
import { requireRole } from "../auth-plugin";

export async function studentRoutes(app: FastifyInstance) {
  app.post(
    "/alunos",
    { preHandler: [app.authenticate, requireRole("PERSONAL")] },
    async (req, reply) => {
      const body = createStudentSchema.parse(req.body);
      const existing = await prisma.user.findUnique({ where: { email: body.email } });
      if (existing) {
        return reply.code(409).send({ error: "E-mail já cadastrado" });
      }
      const senhaHash = await bcrypt.hash(body.senha, 10);
      const aluno = await prisma.user.create({
        data: {
          nome: body.nome,
          email: body.email,
          senhaHash,
          role: "ALUNO",
          objetivo: body.objetivo ?? undefined,
          personalId: req.user.sub,
        },
      });
      return reply.code(201).send({ id: aluno.id, nome: aluno.nome, email: aluno.email, objetivo: aluno.objetivo });
    },
  );

  app.get(
    "/alunos",
    { preHandler: [app.authenticate, requireRole("PERSONAL")] },
    async (req) => {
      const alunos = await prisma.user.findMany({
        where: { personalId: req.user.sub },
        select: { id: true, nome: true, email: true, objetivo: true, createdAt: true },
        orderBy: { nome: "asc" },
      });
      return alunos;
    },
  );

  app.get(
    "/alunos/:id",
    { preHandler: [app.authenticate, requireRole("PERSONAL")] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const aluno = await prisma.user.findFirst({
        where: { id, personalId: req.user.sub, role: "ALUNO" },
        select: { id: true, nome: true, email: true, objetivo: true, createdAt: true },
      });
      if (!aluno) return reply.code(404).send({ error: "Aluno não encontrado" });
      return aluno;
    },
  );
}
