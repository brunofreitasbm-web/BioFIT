import bcrypt from "bcryptjs";
import type { FastifyInstance } from "fastify";
import { loginSchema, registerSchema } from "@biofit/shared";
import { prisma } from "../prisma";

export async function authRoutes(app: FastifyInstance) {
  // Public signup — only for PERSONAL accounts. ALUNO accounts are created
  // by a personal trainer via POST /alunos (see students.ts).
  app.post("/auth/register", async (req, reply) => {
    const body = registerSchema.parse(req.body);
    if (body.role !== "PERSONAL") {
      return reply.code(400).send({ error: "Cadastro público disponível apenas para PERSONAL" });
    }
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      return reply.code(409).send({ error: "E-mail já cadastrado" });
    }
    const senhaHash = await bcrypt.hash(body.senha, 10);
    const user = await prisma.user.create({
      data: { nome: body.nome, email: body.email, senhaHash, role: "PERSONAL" },
    });
    const token = app.jwt.sign({ sub: user.id, role: user.role as "PERSONAL" });
    return reply.code(201).send({ token, user: { id: user.id, nome: user.nome, email: user.email, role: user.role } });
  });

  app.post("/auth/login", async (req, reply) => {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) {
      return reply.code(401).send({ error: "Credenciais inválidas" });
    }
    const valid = await bcrypt.compare(body.senha, user.senhaHash);
    if (!valid) {
      return reply.code(401).send({ error: "Credenciais inválidas" });
    }
    const token = app.jwt.sign({
      sub: user.id,
      role: user.role as "PERSONAL" | "ALUNO",
      personalId: user.personalId,
    });
    return reply.send({ token, user: { id: user.id, nome: user.nome, email: user.email, role: user.role } });
  });

  app.get("/me", { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
      include: {
        personal: true,
      },
    });
    if (!user) return reply.code(404).send({ error: "Usuário não encontrado" });

    const branding = user.role === "ALUNO" && user.personal
      ? {
          brandColor: user.personal.brandColor,
          brandAccent: user.personal.brandAccent,
          brandName: user.personal.brandName || user.personal.nome,
        }
      : {
          brandColor: user.brandColor,
          brandAccent: user.brandAccent,
          brandName: user.brandName || user.nome,
        };

    return {
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role,
      objetivo: user.objetivo,
      xp: user.xp,
      streak: user.streak,
      ultimoTreinoEm: user.ultimoTreinoEm,
      branding,
    };
  });

  app.put("/branding", { preHandler: [app.authenticate] }, async (req, reply) => {
    if (req.user.role !== "PERSONAL") {
      return reply.code(403).send({ error: "Apenas personal trainer pode alterar o branding" });
    }
    const body = req.body as { brandColor?: string; brandAccent?: string; brandName?: string };
    const user = await prisma.user.update({
      where: { id: req.user.sub },
      data: {
        brandColor: body.brandColor,
        brandAccent: body.brandAccent,
        brandName: body.brandName,
      },
    });
    return {
      brandColor: user.brandColor,
      brandAccent: user.brandAccent,
      brandName: user.brandName,
    };
  });
}
