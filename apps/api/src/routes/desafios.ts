import type { FastifyInstance } from "fastify";
import { desafioCreateSchema } from "@biofit/shared";
import { prisma } from "../prisma";
import { requireRole } from "../auth-plugin";

async function computeRanking(desafioId: string) {
  const desafio = await prisma.desafio.findUnique({
    where: { id: desafioId },
    include: { participantes: { include: { aluno: { select: { id: true, nome: true } } } } },
  });
  if (!desafio) return null;

  const ranking = await Promise.all(
    desafio.participantes.map(async (p) => {
      const execucoes = await prisma.execucaoSerie.findMany({
        where: { alunoId: p.alunoId, executadoEm: { gte: desafio.inicio, lte: desafio.fim } },
        select: { cargaKg: true, repeticoes: true },
      });
      const volume = execucoes.reduce((v, e) => v + e.cargaKg * e.repeticoes, 0);
      return { alunoId: p.alunoId, nome: p.aluno.nome, volume: Math.round(volume) };
    }),
  );
  ranking.sort((a, b) => b.volume - a.volume);

  return {
    id: desafio.id,
    titulo: desafio.titulo,
    inicio: desafio.inicio,
    fim: desafio.fim,
    ranking,
  };
}

export async function desafioRoutes(app: FastifyInstance) {
  app.post(
    "/desafios",
    { preHandler: [app.authenticate, requireRole("PERSONAL")] },
    async (req, reply) => {
      const body = desafioCreateSchema.parse(req.body);
      for (const alunoId of body.alunoIds) {
        const aluno = await prisma.user.findFirst({ where: { id: alunoId, personalId: req.user.sub, role: "ALUNO" } });
        if (!aluno) return reply.code(403).send({ error: `Aluno ${alunoId} não pertence a este personal` });
      }
      const desafio = await prisma.desafio.create({
        data: {
          titulo: body.titulo,
          inicio: new Date(body.inicio),
          fim: new Date(body.fim),
          personalId: req.user.sub,
          participantes: { create: body.alunoIds.map((alunoId) => ({ alunoId })) },
        },
      });
      return reply.code(201).send(desafio);
    },
  );

  app.get(
    "/desafios",
    { preHandler: [app.authenticate, requireRole("PERSONAL")] },
    async (req) => {
      return prisma.desafio.findMany({
        where: { personalId: req.user.sub },
        orderBy: { inicio: "desc" },
        include: { participantes: { include: { aluno: { select: { id: true, nome: true } } } } },
      });
    },
  );

  app.get(
    "/desafios/:id/ranking",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const desafio = await prisma.desafio.findUnique({ where: { id } });
      if (!desafio) return reply.code(404).send({ error: "Desafio não encontrado" });
      const isPersonal = req.user.role === "PERSONAL" && desafio.personalId === req.user.sub;
      const isParticipante =
        req.user.role === "ALUNO" &&
        (await prisma.desafioParticipante.findFirst({ where: { desafioId: id, alunoId: req.user.sub } }));
      if (!isPersonal && !isParticipante) return reply.code(403).send({ error: "Sem acesso a este desafio" });
      return computeRanking(id);
    },
  );

  // Mobile: aluno busca o desafio ativo (hoje dentro do período) do qual participa
  app.get(
    "/desafios/ativo",
    { preHandler: [app.authenticate, requireRole("ALUNO")] },
    async (req) => {
      const now = new Date();
      const participacao = await prisma.desafioParticipante.findFirst({
        where: { alunoId: req.user.sub, desafio: { inicio: { lte: now }, fim: { gte: now } } },
        include: { desafio: true },
      });
      if (!participacao) return null;
      return computeRanking(participacao.desafioId);
    },
  );
}
