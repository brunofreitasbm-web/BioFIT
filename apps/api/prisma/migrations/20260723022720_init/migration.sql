-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "personalId" TEXT,
    CONSTRAINT "User_personalId_fkey" FOREIGN KEY ("personalId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Exercicio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "grupoMuscular" TEXT NOT NULL,
    "midiaUrl" TEXT,
    "descricao" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "personalId" TEXT NOT NULL,
    CONSTRAINT "Exercicio_personalId_fkey" FOREIGN KEY ("personalId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Ficha" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titulo" TEXT NOT NULL,
    "semana" INTEGER NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "personalId" TEXT NOT NULL,
    "alunoId" TEXT NOT NULL,
    CONSTRAINT "Ficha_personalId_fkey" FOREIGN KEY ("personalId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Ficha_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BlocoTreino" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "nome" TEXT,
    "ordem" INTEGER NOT NULL,
    "rounds" INTEGER NOT NULL,
    "descansoSegundos" INTEGER NOT NULL,
    "fichaId" TEXT NOT NULL,
    CONSTRAINT "BlocoTreino_fichaId_fkey" FOREIGN KEY ("fichaId") REFERENCES "Ficha" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BlocoItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ordem" INTEGER NOT NULL,
    "repeticoesAlvo" TEXT NOT NULL,
    "cargaKg" REAL,
    "blocoId" TEXT NOT NULL,
    "exercicioId" TEXT NOT NULL,
    CONSTRAINT "BlocoItem_blocoId_fkey" FOREIGN KEY ("blocoId") REFERENCES "BlocoTreino" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BlocoItem_exercicioId_fkey" FOREIGN KEY ("exercicioId") REFERENCES "Exercicio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExecucaoSerie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rodada" INTEGER NOT NULL,
    "cargaKg" REAL NOT NULL,
    "repeticoes" INTEGER NOT NULL,
    "rpe" REAL,
    "executadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blocoItemId" TEXT NOT NULL,
    "alunoId" TEXT NOT NULL,
    CONSTRAINT "ExecucaoSerie_blocoItemId_fkey" FOREIGN KEY ("blocoItemId") REFERENCES "BlocoItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExecucaoSerie_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Ficha_alunoId_ativa_idx" ON "Ficha"("alunoId", "ativa");
