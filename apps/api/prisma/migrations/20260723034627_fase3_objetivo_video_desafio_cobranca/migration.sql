-- AlterTable
ALTER TABLE "Exercicio" ADD COLUMN "videoUrl" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "objetivo" TEXT;

-- CreateTable
CREATE TABLE "Desafio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titulo" TEXT NOT NULL,
    "inicio" DATETIME NOT NULL,
    "fim" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "personalId" TEXT NOT NULL,
    CONSTRAINT "Desafio_personalId_fkey" FOREIGN KEY ("personalId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DesafioParticipante" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "desafioId" TEXT NOT NULL,
    "alunoId" TEXT NOT NULL,
    CONSTRAINT "DesafioParticipante_desafioId_fkey" FOREIGN KEY ("desafioId") REFERENCES "Desafio" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DesafioParticipante_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cobranca" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "valorCentavos" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "descricao" TEXT,
    "pixQrCodeBase64" TEXT,
    "pixCopiaCola" TEXT,
    "mpPaymentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pagoEm" DATETIME,
    "personalId" TEXT NOT NULL,
    "alunoId" TEXT NOT NULL,
    CONSTRAINT "Cobranca_personalId_fkey" FOREIGN KEY ("personalId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Cobranca_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DesafioParticipante_desafioId_alunoId_key" ON "DesafioParticipante"("desafioId", "alunoId");
