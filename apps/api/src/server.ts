import cors from "@fastify/cors";
import Fastify from "fastify";
import { ZodError } from "zod";
import { registerAuth } from "./auth-plugin";
import { authRoutes } from "./routes/auth";
import { studentRoutes } from "./routes/students";
import { exercicioRoutes } from "./routes/exercicios";
import { fichaRoutes } from "./routes/fichas";
import { execucaoRoutes } from "./routes/execucoes";
import { objetivoRoutes } from "./routes/objetivos";
import { desafioRoutes } from "./routes/desafios";
import { cobrancaRoutes } from "./routes/cobrancas";

async function buildServer() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await registerAuth(app);

  app.setErrorHandler((err: any, _req, reply) => {
    if (err instanceof ZodError) {
      return reply.code(400).send({ error: "Dados inválidos", detalhes: err.flatten() });
    }
    app.log.error(err);
    return reply.code(err.statusCode ?? 500).send({ error: err.message ?? "Erro interno" });
  });

  app.get("/health", async () => ({ status: "ok" }));

  await app.register(authRoutes);
  await app.register(studentRoutes);
  await app.register(exercicioRoutes);
  await app.register(fichaRoutes);
  await app.register(execucaoRoutes);
  await app.register(objetivoRoutes);
  await app.register(desafioRoutes);
  await app.register(cobrancaRoutes);

  return app;
}

async function main() {
  const app = await buildServer();
  const port = Number(process.env.PORT ?? 3333);
  await app.listen({ port, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
