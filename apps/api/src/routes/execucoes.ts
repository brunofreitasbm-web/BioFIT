import type { FastifyInstance } from "fastify";
import { execucaoSerieSchema } from "@biofit/shared";
import { prisma } from "../prisma";
import { requireRole } from "../auth-plugin";

export async function execucaoRoutes(app: FastifyInstance) {
  app.post(
    "/execucoes",
    { preHandler: [app.authenticate, requireRole("ALUNO")] },
    async (req, reply) => {
      const body = execucaoSerieSchema.parse({ ...(req.body as object), alunoId: req.user.sub });
      const blocoItem = await prisma.blocoItem.findUnique({
        where: { id: body.blocoItemId },
        include: { bloco: { include: { ficha: true } } },
      });
      if (!blocoItem || blocoItem.bloco.ficha.alunoId !== req.user.sub) {
        return reply.code(403).send({ error: "Item de treino não pertence a este aluno" });
      }

      // PR detection: compare against every past execução deste aluno para o mesmo exercício
      // (não só dentro desta ficha) — é isso que torna o "novo recorde" um recorde de verdade.
      const historico = await prisma.execucaoSerie.findMany({
        where: { alunoId: req.user.sub, blocoItem: { exercicioId: blocoItem.exercicioId } },
        select: { cargaKg: true, repeticoes: true },
      });
      const prevMaxCarga = historico.reduce((max, h) => Math.max(max, h.cargaKg), 0);
      const prevMaxVolume = historico.reduce((max, h) => Math.max(max, h.cargaKg * h.repeticoes), 0);

      const execucao = await prisma.execucaoSerie.create({
        data: {
          blocoItemId: body.blocoItemId,
          alunoId: req.user.sub,
          rodada: body.rodada,
          cargaKg: body.cargaKg,
          repeticoes: body.repeticoes,
          rpe: body.rpe ?? undefined,
        },
      });

      const novoVolume = body.cargaKg * body.repeticoes;
      const isPR = historico.length > 0 && (body.cargaKg > prevMaxCarga || novoVolume > prevMaxVolume);

      // Calcular ganho de XP e atualização do Streak (Sequência de dias de treino)
      const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
      let xpGanho = 10; // 10 XP base por série registrada
      if (isPR) xpGanho += 20; // +20 XP de bônus por recorde pessoal (PR)

      let newStreak = user?.streak ?? 0;
      const agora = new Date();
      const hojeStr = agora.toISOString().split("T")[0];

      if (user) {
        if (!user.ultimoTreinoEm) {
          newStreak = 1;
        } else {
          const ultimoTreinoStr = user.ultimoTreinoEm.toISOString().split("T")[0];
          if (hojeStr !== ultimoTreinoStr) {
            const ontem = new Date();
            ontem.setDate(ontem.getDate() - 1);
            const ontemStr = ontem.toISOString().split("T")[0];
            if (ultimoTreinoStr === ontemStr) {
              newStreak += 1;
            } else {
              newStreak = 1; // quebrou a sequência, recomeça
            }
          }
        }

        await prisma.user.update({
          where: { id: req.user.sub },
          data: {
            xp: { increment: xpGanho },
            streak: newStreak,
            ultimoTreinoEm: agora,
          },
        });
      }

      return reply.code(201).send({ ...execucao, isPR, xpGanho, newStreak });
    },
  );

  app.get(
    "/execucoes/ficha/:fichaId",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { fichaId } = req.params as { fichaId: string };
      const ficha = await prisma.ficha.findUnique({ where: { id: fichaId } });
      if (!ficha) return reply.code(404).send({ error: "Ficha não encontrada" });
      const isOwner = req.user.role === "ALUNO" && ficha.alunoId === req.user.sub;
      const isPersonal = req.user.role === "PERSONAL" && ficha.personalId === req.user.sub;
      if (!isOwner && !isPersonal) {
        return reply.code(403).send({ error: "Sem acesso a esta ficha" });
      }
      return prisma.execucaoSerie.findMany({
        where: { blocoItem: { bloco: { fichaId } } },
        orderBy: { executadoEm: "desc" },
      });
    },
  );

  // Resumo de volume total por grupo muscular (últimas semanas) — base da aba Progresso do app.
  app.get(
    "/execucoes/resumo",
    { preHandler: [app.authenticate, requireRole("ALUNO")] },
    async (req) => {
      const desde = new Date();
      desde.setDate(desde.getDate() - 28);
      const execucoes = await prisma.execucaoSerie.findMany({
        where: { alunoId: req.user.sub, executadoEm: { gte: desde } },
        select: { cargaKg: true, repeticoes: true, blocoItem: { select: { exercicio: { select: { grupoMuscular: true } } } } },
      });
      const porGrupo = new Map<string, number>();
      for (const e of execucoes) {
        const grupo = e.blocoItem.exercicio.grupoMuscular;
        porGrupo.set(grupo, (porGrupo.get(grupo) ?? 0) + e.cargaKg * e.repeticoes);
      }
      return Array.from(porGrupo.entries())
        .map(([grupoMuscular, volumeTotal]) => ({ grupoMuscular, volumeTotal: Math.round(volumeTotal) }))
        .sort((a, b) => b.volumeTotal - a.volumeTotal);
    },
  );
}
