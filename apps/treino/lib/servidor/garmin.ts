import fs from "fs";
import path from "path";
import { rpc } from "@/lib/servidor/backup";
import type { Convertido } from "@/lib/servidor/garminHealth";

// Dados do Garmin no formato de `garmin-data.json` (o mesmo que o biofit_garmin_sync.py grava).
export type LinhaGarmin = Record<string, any>;

export interface DadosGarmin {
  diario: LinhaGarmin[];
  treinos: LinhaGarmin[];
}

const vazio: DadosGarmin = { diario: [], treinos: [] };

// Na Vercel não existe o arquivo do PC: o sync envia à edge function `biofit-garmin-ingest` e o
// app lê via RPC `biofit_garmin_get` (mesmo segredo do backup). Sem as variáveis do Supabase
// (dev local), cai no `.local/garmin-data.json` (fora de `public/`, que a Vercel serve; ignorado pelo git).
export function supabaseConfigurado(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && process.env.BIOFIT_DB_SECRET);
}

function lerArquivoLocal(): DadosGarmin | null {
  const filePath = path.join(process.cwd(), ".local", "garmin-data.json");
  if (!fs.existsSync(filePath)) return null;
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  return {
    diario: Array.isArray(data?.diario) ? data.diario : [],
    treinos: Array.isArray(data?.treinos) ? data.treinos : [],
  };
}

export async function lerGarmin(): Promise<DadosGarmin | null> {
  if (!supabaseConfigurado()) return lerArquivoLocal();
  const r = (await rpc("biofit_garmin_get", { p_dias: 35 })) as Partial<DadosGarmin> | null;
  return {
    diario: Array.isArray(r?.diario) ? r.diario : vazio.diario,
    treinos: Array.isArray(r?.treinos) ? r.treinos : vazio.treinos,
  };
}

// Grava o que o webhook da Garmin Health API entregou (merge no banco: campo nulo não apaga).
export async function gravarGarmin(c: Pick<Convertido, "diario" | "treinos">): Promise<{ diario: number; treinos: number }> {
  const r = (await rpc("biofit_garmin_put", { p_diario: c.diario, p_treinos: c.treinos })) as { diario?: number; treinos?: number } | null;
  return { diario: r?.diario ?? 0, treinos: r?.treinos ?? 0 };
}
