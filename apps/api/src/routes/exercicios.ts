import type { FastifyInstance } from "fastify";
import { exercicioSchema } from "@biofit/shared";
import { prisma } from "../prisma";
import { requireRole } from "../auth-plugin";

export async function exercicioRoutes(app: FastifyInstance) {
  app.get(
    "/exercicios",
    { preHandler: [app.authenticate, requireRole("PERSONAL")] },
    async (req) => {
      return prisma.exercicio.findMany({
        where: { personalId: req.user.sub },
        orderBy: { nome: "asc" },
      });
    },
  );

  app.post(
    "/exercicios",
    { preHandler: [app.authenticate, requireRole("PERSONAL")] },
    async (req, reply) => {
      const body = exercicioSchema.parse(req.body);
      const exercicio = await prisma.exercicio.create({
        data: {
          nome: body.nome,
          grupoMuscular: body.grupoMuscular,
          midiaUrl: body.midiaUrl ?? undefined,
          descricao: body.descricao ?? undefined,
          videoUrl: body.videoUrl ?? undefined,
          personalId: req.user.sub,
        },
      });
      return reply.code(201).send(exercicio);
    },
  );

  app.put(
    "/exercicios/:id",
    { preHandler: [app.authenticate, requireRole("PERSONAL")] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const existing = await prisma.exercicio.findUnique({ where: { id } });
      if (!existing || existing.personalId !== req.user.sub) {
        return reply.code(404).send({ error: "Exercício não encontrado" });
      }
      const body = exercicioSchema.partial().parse(req.body);
      const updated = await prisma.exercicio.update({
        where: { id },
        data: {
          nome: body.nome,
          grupoMuscular: body.grupoMuscular,
          midiaUrl: body.midiaUrl ?? undefined,
          descricao: body.descricao ?? undefined,
          videoUrl: body.videoUrl ?? undefined,
        },
      });
      return updated;
    },
  );

  app.delete(
    "/exercicios/:id",
    { preHandler: [app.authenticate, requireRole("PERSONAL")] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const existing = await prisma.exercicio.findUnique({ where: { id } });
      if (!existing || existing.personalId !== req.user.sub) {
        return reply.code(404).send({ error: "Exercício não encontrado" });
      }
      await prisma.exercicio.delete({ where: { id } });
      return reply.code(204).send();
    },
  );
}
