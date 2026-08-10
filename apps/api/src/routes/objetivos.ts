import type { FastifyInstance } from "fastify";
import { OBJETIVOS, OBJETIVO_TEMPLATES, type Objetivo } from "@biofit/shared";
import { prisma } from "../prisma";
import { requireRole } from "../auth-plugin";

// Finds an existing exercicio by name (case-insensitive) for this personal, or creates it —
// so a sugestão de treino never blocks on the personal having pre-cadastrado the exercise.
async function resolveExercicio(personalId: string, nome: string, grupoMuscular: string) {
  const existing = await prisma.exercicio.findFirst({
    where: { personalId, nome: { equals: nome } },
  });
  if (existing) return existing;
  return prisma.exercicio.create({ data: { personalId, nome, grupoMuscular } });
}

export async function objetivoRoutes(app: FastifyInstance) {
  app.get(
    "/objetivos/:objetivo/sugestao",
    { preHandler: [app.authenticate, requireRole("PERSONAL")] },
    async (req, reply) => {
      const { objetivo } = req.params as { objetivo: string };
      if (!OBJETIVOS.includes(objetivo as Objetivo)) {
        return reply.code(400).send({ error: "Objetivo inválido" });
      }
      const template = OBJETIVO_TEMPLATES[objetivo as Objetivo];
      const blocos = await Promise.all(
        template.map(async (bloco, ordem) => ({
          tipo: bloco.tipo,
          nome: bloco.nome,
          ordem,
          rounds: bloco.rounds,
          descansoSegundos: bloco.descansoSegundos,
          itens: await Promise.all(
            bloco.itens.map(async (item, itemOrdem) => {
              const exercicio = await resolveExercicio(req.user.sub, item.nome, item.grupoMuscular);
              return {
                exercicioId: exercicio.id,
                exercicioNome: exercicio.nome,
                ordem: itemOrdem,
                repeticoesAlvo: item.repeticoesAlvo,
                cargaKg: item.cargaKgSugerida ?? null,
              };
            }),
          ),
        })),
      );
      return { objetivo, blocos };
    },
  );
}
