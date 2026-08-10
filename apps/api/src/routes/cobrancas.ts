import type { FastifyInstance } from "fastify";
import { cobrancaCreateSchema } from "@biofit/shared";
import { prisma } from "../prisma";
import { requireRole } from "../auth-plugin";
import { getMercadoPagoClient } from "../mercadopago";

export async function cobrancaRoutes(app: FastifyInstance) {
  app.post(
    "/cobrancas",
    { preHandler: [app.authenticate, requireRole("PERSONAL")] },
    async (req, reply) => {
      const body = cobrancaCreateSchema.parse(req.body);
      const aluno = await prisma.user.findFirst({
        where: { id: body.alunoId, personalId: req.user.sub, role: "ALUNO" },
      });
      if (!aluno) return reply.code(403).send({ error: "Aluno não pertence a este personal" });

      let payment;
      try {
        const client = getMercadoPagoClient();
        payment = await client.create({
          body: {
            transaction_amount: body.valorCentavos / 100,
            description: body.descricao ?? `Mensalidade — ${aluno.nome}`,
            payment_method_id: "pix",
            payer: { email: aluno.email },
          },
        });
      } catch (err) {
        return reply.code(503).send({ error: (err as Error).message });
      }

      const cobranca = await prisma.cobranca.create({
        data: {
          valorCentavos: body.valorCentavos,
          descricao: body.descricao,
          personalId: req.user.sub,
          alunoId: body.alunoId,
          status: "PENDENTE",
          mpPaymentId: String(payment.id),
          pixQrCodeBase64: payment.point_of_interaction?.transaction_data?.qr_code_base64 ?? undefined,
          pixCopiaCola: payment.point_of_interaction?.transaction_data?.qr_code ?? undefined,
        },
      });
      return reply.code(201).send(cobranca);
    },
  );

  app.get(
    "/cobrancas",
    { preHandler: [app.authenticate, requireRole("PERSONAL")] },
    async (req) => {
      return prisma.cobranca.findMany({
        where: { personalId: req.user.sub },
        include: { aluno: { select: { nome: true } } },
        orderBy: { createdAt: "desc" },
      });
    },
  );

  app.get(
    "/cobrancas/minhas",
    { preHandler: [app.authenticate, requireRole("ALUNO")] },
    async (req) => {
      return prisma.cobranca.findMany({
        where: { alunoId: req.user.sub },
        orderBy: { createdAt: "desc" },
      });
    },
  );

  // Mercado Pago chama esta rota quando o status de um pagamento muda (ex: PIX confirmado).
  app.post("/webhooks/mercadopago", async (req, reply) => {
    const body = req.body as { type?: string; data?: { id?: string } };
    if (body.type !== "payment" || !body.data?.id) {
      return reply.code(200).send({ ok: true });
    }
    try {
      const client = getMercadoPagoClient();
      const payment = await client.get({ id: body.data.id });
      const cobranca = await prisma.cobranca.findFirst({ where: { mpPaymentId: String(payment.id) } });
      if (cobranca && payment.status === "approved") {
        await prisma.cobranca.update({
          where: { id: cobranca.id },
          data: { status: "PAGO", pagoEm: new Date() },
        });
      }
    } catch (err) {
      req.log.error(err);
    }
    return reply.code(200).send({ ok: true });
  });
}
