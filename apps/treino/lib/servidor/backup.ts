import { timingSafeEqual } from "node:crypto";

// Acesso server-side à tabela `biofit_backup` (Supabase, RLS sem policies: só a service role
// lê e escreve). Usa a REST API direto para não adicionar dependência.

const ID_USUARIO = "default";
const TAMANHO_MAX_BYTES = 4 * 1024 * 1024;
const FORMATO = "biofit-treino-backup";

export type DadosBackup = Record<string, string>;

export interface BackupGuardado {
  dados: DadosBackup;
  atualizadoEm: string;
}

function config(): { url: string; chave: string } {
  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) throw new Error("Servidor sem SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
  return { url: url.replace(/\/$/, ""), chave };
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
  const { url, chave } = config();
  const res = await fetch(`${url}/rest/v1/biofit_backup?id=eq.${ID_USUARIO}&select=dados,atualizado_em`, {
    headers: { apikey: chave, Authorization: `Bearer ${chave}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Supabase respondeu ${res.status} ao ler o backup.`);
  const linhas = (await res.json()) as { dados: DadosBackup; atualizado_em: string }[];
  return linhas[0] ? { dados: linhas[0].dados, atualizadoEm: linhas[0].atualizado_em } : null;
}

export async function gravarBackup(dados: DadosBackup): Promise<void> {
  const { url, chave } = config();
  const res = await fetch(`${url}/rest/v1/biofit_backup?on_conflict=id`, {
    method: "POST",
    headers: {
      apikey: chave,
      Authorization: `Bearer ${chave}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({ id: ID_USUARIO, dados, atualizado_em: new Date().toISOString() }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Supabase respondeu ${res.status} ao gravar o backup.`);
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
