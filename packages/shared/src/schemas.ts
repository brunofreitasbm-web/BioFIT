import { z } from "zod";
import { GRUPOS_MUSCULARES, OBJETIVOS, ROLES, TIPOS_BLOCO } from "./enums";

export const exercicioSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(2),
  grupoMuscular: z.enum(GRUPOS_MUSCULARES),
  midiaUrl: z.string().url().optional().nullable(),
  descricao: z.string().optional().nullable(),
  videoUrl: z.string().url().optional().nullable(),
});
export type Exercicio = z.infer<typeof exercicioSchema>;

export const createStudentSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  senha: z.string().min(6),
  objetivo: z.enum(OBJETIVOS).optional().nullable(),
});
export type CreateStudentInput = z.infer<typeof createStudentSchema>;

// One exercise within a bloco, executed in sequence each round
// (a bloco with tipo BI_SET has 2 itens, CIRCUITO has 3+, SIMPLES/AQUECIMENTO has 1)
export const blocoItemSchema = z.object({
  id: z.string().optional(),
  exercicioId: z.string(),
  ordem: z.number().int().min(0),
  repeticoesAlvo: z.string().min(1), // e.g. "8-12" or "AMRAP"
  cargaKg: z.number().min(0).optional().nullable(),
});
export type BlocoItem = z.infer<typeof blocoItemSchema>;

export const blocoTreinoSchema = z.object({
  id: z.string().optional(),
  tipo: z.enum(TIPOS_BLOCO),
  nome: z.string().optional().nullable(),
  ordem: z.number().int().min(0),
  rounds: z.number().int().min(1),
  descansoSegundos: z.number().int().min(0),
  itens: z.array(blocoItemSchema).min(1),
});
export type BlocoTreino = z.infer<typeof blocoTreinoSchema>;

export const fichaSchema = z.object({
  id: z.string().optional(),
  alunoId: z.string(),
  personalId: z.string(),
  titulo: z.string().min(1),
  semana: z.number().int().min(1),
  ativa: z.boolean().default(true),
  blocos: z.array(blocoTreinoSchema).min(1),
});
export type Ficha = z.infer<typeof fichaSchema>;

export const bulkAssignSchema = z.object({
  fichaOrigemId: z.string(),
  alunoIds: z.array(z.string()).min(1),
  novoTitulo: z.string().optional(),
});
export type BulkAssignInput = z.infer<typeof bulkAssignSchema>;

export const execucaoSerieSchema = z.object({
  id: z.string().optional(),
  blocoItemId: z.string(),
  alunoId: z.string(),
  rodada: z.number().int().min(1),
  cargaKg: z.number().min(0),
  repeticoes: z.number().int().min(0),
  rpe: z.number().min(0).max(10).optional().nullable(),
});
export type ExecucaoSerie = z.infer<typeof execucaoSerieSchema>;

export const desafioCreateSchema = z.object({
  titulo: z.string().min(2),
  inicio: z.string().datetime(),
  fim: z.string().datetime(),
  alunoIds: z.array(z.string()).min(1),
});
export type DesafioCreateInput = z.infer<typeof desafioCreateSchema>;

export const cobrancaCreateSchema = z.object({
  alunoId: z.string(),
  valorCentavos: z.number().int().positive(),
  descricao: z.string().optional(),
});
export type CobrancaCreateInput = z.infer<typeof cobrancaCreateSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(6),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  senha: z.string().min(6),
  role: z.enum(ROLES),
  personalId: z.string().optional(), // required when role === "ALUNO"
});
export type RegisterInput = z.infer<typeof registerSchema>;
