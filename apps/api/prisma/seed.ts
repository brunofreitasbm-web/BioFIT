import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const senhaHash = await bcrypt.hash("senha123", 10);

  const personal = await prisma.user.upsert({
    where: { email: "personal@biofit.dev" },
    update: {},
    create: { nome: "Personal Demo", email: "personal@biofit.dev", senhaHash, role: "PERSONAL" },
  });

  const aluno = await prisma.user.upsert({
    where: { email: "aluno@biofit.dev" },
    update: {},
    create: {
      nome: "Aluno Demo",
      email: "aluno@biofit.dev",
      senhaHash,
      role: "ALUNO",
      personalId: personal.id,
    },
  });

  console.log({ personal: personal.email, aluno: aluno.email, senha: "senha123" });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
