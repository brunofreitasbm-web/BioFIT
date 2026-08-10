import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { bulkAssignSchema, fichaSchema } from "@biofit/shared";
import { prisma } from "../prisma";
import { requireRole } from "../auth-plugin";

const fichaInclude = {
  blocos: {
    orderBy: { ordem: "asc" as const },
    include: { itens: { orderBy: { ordem: "asc" as const }, include: { exercicio: true } } },
  },
};

async function assertAlunoDoPersonal(alunoId: string, personalId: string) {
  const aluno = await prisma.user.findUnique({ where: { id: alunoId } });
  return !!aluno && aluno.role === "ALUNO" && aluno.personalId === personalId;
}

// Creates a Ficha + nested Blocos + Itens in one transaction, so the personal
// trainer can save a whole workout (with bi-sets/circuitos) in a single click.
async function createFichaWithBlocos(data: z.infer<typeof fichaSchema>) {
  return prisma.ficha.create({
    data: {
      titulo: data.titulo,
      semana: data.semana,
      ativa: data.ativa,
      personalId: data.personalId,
      alunoId: data.alunoId,
      blocos: {
        create: data.blocos.map((bloco) => ({
          tipo: bloco.tipo,
          nome: bloco.nome ?? undefined,
          ordem: bloco.ordem,
          rounds: bloco.rounds,
          descansoSegundos: bloco.descansoSegundos,
          itens: {
            create: bloco.itens.map((item) => ({
              exercicioId: item.exercicioId,
              ordem: item.ordem,
              repeticoesAlvo: item.repeticoesAlvo,
              cargaKg: item.cargaKg ?? undefined,
            })),
          },
        })),
      },
    },
    include: fichaInclude,
  });
}

export async function fichaRoutes(app: FastifyInstance) {
  app.post(
    "/fichas",
    { preHandler: [app.authenticate, requireRole("PERSONAL")] },
    async (req, reply) => {
      const body = fichaSchema.parse({ ...(req.body as object), personalId: req.user.sub });
      if (!(await assertAlunoDoPersonal(body.alunoId, req.user.sub))) {
        return reply.code(403).send({ error: "Aluno não pertence a este personal" });
      }
      const ficha = await createFichaWithBlocos(body);
      return reply.code(201).send(ficha);
    },
  );

  app.get(
    "/fichas/aluno/:alunoId",
    { preHandler: [app.authenticate, requireRole("PERSONAL")] },
    async (req, reply) => {
      const { alunoId } = req.params as { alunoId: string };
      if (!(await assertAlunoDoPersonal(alunoId, req.user.sub))) {
        return reply.code(403).send({ error: "Aluno não pertence a este personal" });
      }
      return prisma.ficha.findMany({
        where: { alunoId },
        orderBy: { semana: "desc" },
        include: fichaInclude,
      });
    },
  );

  // Mobile app: student fetches their own current active ficha
  app.get(
    "/fichas/minha",
    { preHandler: [app.authenticate, requireRole("ALUNO")] },
    async (req) => {
      return prisma.ficha.findFirst({
        where: { alunoId: req.user.sub, ativa: true },
        orderBy: { semana: "desc" },
        include: fichaInclude,
      });
    },
  );

  // Clone a ficha as the next week's ficha for the same student —
  // eliminates re-entering every exercise/bloco from scratch.
  app.post(
    "/fichas/:id/clonar",
    { preHandler: [app.authenticate, requireRole("PERSONAL")] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const origem = await prisma.ficha.findUnique({ where: { id }, include: fichaInclude });
      if (!origem || origem.personalId !== req.user.sub) {
        return reply.code(404).send({ error: "Ficha não encontrada" });
      }
      const clone = await createFichaWithBlocos({
        titulo: origem.titulo,
        semana: origem.semana + 1,
        ativa: true,
        personalId: origem.personalId,
        alunoId: origem.alunoId,
        blocos: origem.blocos.map((b) => ({
          tipo: b.tipo as z.infer<typeof fichaSchema>["blocos"][number]["tipo"],
          nome: b.nome,
          ordem: b.ordem,
          rounds: b.rounds,
          descansoSegundos: b.descansoSegundos,
          itens: b.itens.map((i) => ({
            exercicioId: i.exercicioId,
            ordem: i.ordem,
            repeticoesAlvo: i.repeticoesAlvo,
            cargaKg: i.cargaKg,
          })),
        })),
      });
      return reply.code(201).send(clone);
    },
  );

  // Apply one ficha as a template to N students at once — periodização em massa.
  app.post(
    "/fichas/bulk-assign",
    { preHandler: [app.authenticate, requireRole("PERSONAL")] },
    async (req, reply) => {
      const body = bulkAssignSchema.parse(req.body);
      const origem = await prisma.ficha.findUnique({ where: { id: body.fichaOrigemId }, include: fichaInclude });
      if (!origem || origem.personalId !== req.user.sub) {
        return reply.code(404).send({ error: "Ficha de origem não encontrada" });
      }
      for (const alunoId of body.alunoIds) {
        if (!(await assertAlunoDoPersonal(alunoId, req.user.sub))) {
          return reply.code(403).send({ error: `Aluno ${alunoId} não pertence a este personal` });
        }
      }
      const criadas = await Promise.all(
        body.alunoIds.map((alunoId) =>
          createFichaWithBlocos({
            titulo: body.novoTitulo ?? origem.titulo,
            semana: origem.semana,
            ativa: true,
            personalId: origem.personalId,
            alunoId,
            blocos: origem.blocos.map((b) => ({
              tipo: b.tipo as z.infer<typeof fichaSchema>["blocos"][number]["tipo"],
              nome: b.nome,
              ordem: b.ordem,
              rounds: b.rounds,
              descansoSegundos: b.descansoSegundos,
              itens: b.itens.map((i) => ({
                exercicioId: i.exercicioId,
                ordem: i.ordem,
                repeticoesAlvo: i.repeticoesAlvo,
                cargaKg: i.cargaKg,
              })),
            })),
          }),
        ),
      );
      return reply.code(201).send(criadas);
    },
  );
}
