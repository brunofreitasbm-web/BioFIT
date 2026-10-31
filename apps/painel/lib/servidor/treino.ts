import { forcaPorDia } from "@/lib/recuperacao/painel";
import type { DiaForca } from "@/lib/recuperacao/tipos";
import type { MedicaoCorpo } from "@/lib/recuperacao/intervalos";
import { rpc } from "./supabase";

// Leitura (somente) do que o app de treino já guardou: séries de força e bioimpedância.
// Vem do backup que o app envia ao Supabase; o painel nunca grava de volta.

const KEY_LOG = "treino:log";
const KEY_CORPO = "treino:corpo";

// Avaliações iniciais (InBody, 03–06/2026, e Avanutri, 09–10/2026). O app de treino as embute no
// código (lib/bioimpedancia.ts); aqui vão só data, peso, gordura e massa magra.
const HISTORICO: MedicaoCorpo[] = [
  { data: "2026-03-08", pesoKg: 90.0, gorduraPct: 22.5, massaMagraKg: 64.5 },
  { data: "2026-03-24", pesoKg: 90.7, gorduraPct: 20.5, massaMagraKg: 66.8 },
  { data: "2026-04-13", pesoKg: 91.3, gorduraPct: 20.1, massaMagraKg: 67.6 },
  { data: "2026-04-27", pesoKg: 90.5, gorduraPct: 19.8, massaMagraKg: 67.4 },
  { data: "2026-05-17", pesoKg: 90.2, gorduraPct: 19.0, massaMagraKg: 67.8 },
  { data: "2026-06-03", pesoKg: 90.3, gorduraPct: 22.9, massaMagraKg: 64.4 },
  { data: "2026-09-01", pesoKg: 92.0, gorduraPct: 24.5, massaMagraKg: 64.2 },
  { data: "2026-10-20", pesoKg: 92.0, gorduraPct: 24.5, massaMagraKg: 64.2 },
];

export interface DadosTreino {
  forca: DiaForca[];
  corpo: MedicaoCorpo[];
}

function analisar<T>(texto: string | undefined, padrao: T): T {
  if (!texto) return padrao;
  try {
    return JSON.parse(texto) as T;
  } catch {
    return padrao;
  }
}

const numOuNull = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

export async function lerTreino(): Promise<DadosTreino> {
  const r = (await rpc("biofit_backup_get", {})) as { dados?: Record<string, string> } | null;
  const dados = r?.dados ?? {};

  const log = analisar<{ data: string; cargaKg: number | null; reps: number | null }[]>(dados[KEY_LOG], []);
  const importadas = Object.values(analisar<Record<string, Record<string, unknown>>>(dados[KEY_CORPO], {}));

  const porData = new Map<string, MedicaoCorpo>(HISTORICO.map((m) => [m.data, m]));
  for (const c of importadas) {
    if (typeof c.data !== "string") continue;
    porData.set(c.data, { data: c.data, pesoKg: numOuNull(c.pesoKg), gorduraPct: numOuNull(c.gorduraPct), massaMagraKg: numOuNull(c.massaLivreKg) });
  }
  return { forca: forcaPorDia(Array.isArray(log) ? log : []), corpo: [...porData.values()].sort((a, b) => a.data.localeCompare(b.data)) };
}
