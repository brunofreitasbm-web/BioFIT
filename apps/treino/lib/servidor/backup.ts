import { timingSafeEqual } from "node:crypto";
import { KEY_ORIGEM } from "@/lib/dados";
import { mesclar } from "@/lib/merge";

// Acesso server-side ao backup via funções RPC `biofit_backup_get/put` (Supabase). Elas
// validam um segredo próprio (BIOFIT_DB_SECRET) e só tocam `biofit_backup`: o app usa a chave
// publicável, nunca a service role, então um vazamento não abre o resto do banco.
// Usa a REST API direto para não adicionar dependência.

const TAMANHO_MAX_BYTES = 4 * 1024 * 1024;
const FORMATO = "biofit-treino-backup";

export type DadosBackup = Record<string, string>;

export interface BackupGuardado {
  dados: DadosBackup;
  atualizadoEm: string;
}

function config(): { url: string; chave: string; segredo: string } {
  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_ANON_KEY;
  const segredo = process.env.BIOFIT_DB_SECRET;
  if (!url || !chave || !segredo) throw new Error("Servidor sem SUPABASE_URL / SUPABASE_ANON_KEY / BIOFIT_DB_SECRET.");
  return { url: url.replace(/\/$/, ""), chave, segredo };
}

async function rpc(nome: string, corpo: Record<string, unknown>): Promise<unknown> {
  const { url, chave, segredo } = config();
  const res = await fetch(`${url}/rest/v1/rpc/${nome}`, {
    method: "POST",
    headers: { apikey: chave, "Content-Type": "application/json" },
    body: JSON.stringify({ p_secret: segredo, ...corpo }),
    cache: "no-store",
  });
  if (!res.ok) throw Object.assign(new Error(`Supabase respondeu ${res.status} em ${nome}.`), { status: res.status });
  const texto = await res.text();
  return texto ? JSON.parse(texto) : null;
}

// Token fraco (ou ausente) no servidor = recusa tudo, nunca "libera por padrão".
export function tokenValido(candidato: string | null | undefined, esperado: string | undefined): boolean {
  if (!esperado || esperado.length < 24 || !candidato) return false;
  const a = Buffer.from(candidato);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function tokenDoHeader(req: Request): string | null {
  const h = req.headers.get("authorization");
  return h && h.toLowerCase().startsWith("bearer ") ? h.slice(7).trim() : null;
}

export async function lerBackup(): Promise<BackupGuardado | null> {
  const linha = (await rpc("biofit_backup_get", {})) as { dados: DadosBackup; atualizado_em: string } | null;
  return linha ? { dados: linha.dados, atualizadoEm: linha.atualizado_em } : null;
}

export async function gravarBackup(dados: DadosBackup): Promise<void> {
  await rpc("biofit_backup_put", { p_dados: dados });
}

let semGravacaoCondicional = false;

// Só para testes: esquece que a função condicional estava ausente.
export function _reiniciarGravacaoCondicional(): void {
  semGravacaoCondicional = false;
}

// Grava só se o backup ainda estiver em `esperado` (null = ainda não existe). Retorna o novo
// atualizadoEm, ou null se alguém gravou no meio. Sem a função `biofit_backup_put_se` no
// banco (migration 0002 ainda não aplicada), cai na gravação simples.
async function gravarBackupSe(dados: DadosBackup, esperado: string | null): Promise<string | null> {
  if (!semGravacaoCondicional) {
    try {
      return (await rpc("biofit_backup_put_se", { p_dados: dados, p_esperado: esperado })) as string | null;
    } catch (e) {
      if ((e as { status?: number }).status !== 404) throw e;
      semGravacaoCondicional = true;
      console.warn("biofit_backup_put_se ausente: gravando sem controle de concorrência.");
    }
  }
  await gravarBackup(dados);
  return new Date().toISOString();
}

export type Origem = "app" | "mcp";

const TENTATIVAS = 3;

// Lê, mescla `entrada` sobre o que está no servidor e grava, repetindo se outra gravação
// (app ou MCP) acontecer no meio. Retorna o backup resultante.
export async function gravarMesclado(entrada: DadosBackup, origem: Origem): Promise<BackupGuardado> {
  for (let i = 0; i < TENTATIVAS; i++) {
    const atual = await lerBackup();
    const dados = mesclar(atual?.dados ?? {}, entrada);
    dados[KEY_ORIGEM] = JSON.stringify({ origem, em: new Date().toISOString() });
    const atualizadoEm = await gravarBackupSe(dados, atual?.atualizadoEm ?? null);
    if (atualizadoEm) return { dados, atualizadoEm };
  }
  throw new Error("Conflito de gravação: tente de novo.");
}

// Valida o corpo enviado pelo app (mesmo formato de `exportarTudo`). Retorna os dados ou um erro.
export function validarCorpoSync(texto: string): { dados: DadosBackup } | { erro: string } {
  if (texto.length > TAMANHO_MAX_BYTES) return { erro: "Payload grande demais." };
  let corpo: unknown;
  try {
    corpo = JSON.parse(texto);
  } catch {
    return { erro: "JSON inválido." };
  }
  const b = corpo as { formato?: unknown; versao?: unknown; dados?: unknown };
  if (!b || b.formato !== FORMATO || b.versao !== 1 || typeof b.dados !== "object" || b.dados === null) {
    return { erro: "Formato de backup inválido." };
  }
  const dados: DadosBackup = {};
  for (const [chave, valor] of Object.entries(b.dados as Record<string, unknown>)) {
    if (!chave.startsWith("treino:") || typeof valor !== "string") return { erro: `Chave inválida: ${chave}` };
    dados[chave] = valor;
  }
  return { dados };
}
