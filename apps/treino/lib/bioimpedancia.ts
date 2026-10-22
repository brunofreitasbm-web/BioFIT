import { getTodosCorpo } from "./storage";
import type { RegistroCorpo } from "./tipos";

export interface MassaMagraSegmentar {
  bracoDireitoKg: number;
  bracoEsquerdoKg: number;
  troncoKg: number;
  pernaDireitaKg: number;
  pernaEsquerdaKg: number;
}

export interface MedicaoBioimpedancia {
  data: string; // YYYY-MM-DD
  hora?: string; // HH:mm:ss, quando conhecida (a hora do dia muda a leitura de água e peso)
  pesoKg: number | null;
  gorduraPct: number | null;
  massaGorduraKg?: number | null;
  massaMagraKg: number | null; // massa livre de gordura
  massaMuscularEsqueleticaKg: number | null;
  gorduraVisceral: number | null;
  aguaCorporalPct: number | null;
  aguaCorporalL?: number | null;
  imc?: number | null;
  indiceApendicular?: number | null; // kg/m²
  tmbKcal: number | null;
  idadeMetabolica: number | null;
  massaMagraSegmentar?: MassaMagraSegmentar | null;
  observacoes?: string;
  origem?: "historico" | "manual" | "avanutri";
}

export interface ResumoBioimpedancia {
  atual: MedicaoBioimpedancia;
  anterior: MedicaoBioimpedancia | null;
  diasEntre: number | null;
  total: number;
}

// Histórico inicial: 6 "Relatório de Avaliações" (InBody, Clínica Porto Terapia, 03/2026–06/2026) que estão em
// "bioimpedância Bruno/*.pdf". Recuperado do histórico do git (commit anterior à remoção da
// página de bioimpedância). Medições manuais na mesma data substituem estas.
export const ALTURA_M = 1.74;

type Seed = [
  data: string, peso: number, gord: number, massaGord: number, massaLivre: number, aguaL: number,
  imc: number, tmb: number, apendicular: number, idadeMetab: number, visceral: number,
  seg: [number, number, number, number, number],
];

const SEED: Seed[] = [
  ["2026-03-08", 90.0, 22.5, 20.3, 64.5, 47.2, 29.7, 1916, 10.18, 36, 9, [4.5, 4.5, 33.7, 10.8, 11.0]],
  ["2026-03-24", 90.7, 20.5, 18.6, 66.8, 48.9, 30.0, 1925, 10.57, 35, 8, [4.8, 4.8, 34.8, 11.1, 11.3]],
  ["2026-04-13", 91.3, 20.1, 18.4, 67.6, 49.5, 30.2, 1934, 10.59, 35, 8, [4.8, 4.8, 35.6, 11.2, 11.3]],
  ["2026-04-27", 90.5, 19.8, 17.9, 67.4, 49.3, 29.9, 1923, 10.74, 35, 8, [4.7, 4.8, 34.8, 11.4, 11.6]],
  ["2026-05-17", 90.2, 19.0, 17.2, 67.8, 49.6, 29.8, 1919, 10.89, 34, 7, [4.8, 4.8, 34.8, 11.6, 11.8]],
  ["2026-06-03", 90.3, 22.9, 20.7, 64.4, 47.1, 29.8, 1920, 10.37, 36, 9, [4.7, 4.7, 33.0, 10.9, 11.1]],
  // Avanutri (AvaBio), relatório de 20/10/2026 — apendicular = (braços + pernas) / altura².
  ["2026-09-01", 92.0, 24.5, 22.5, 64.2, 47.0, 30.4, 1943, 10.32, 37, 10, [4.8, 4.8, 32.9, 10.8, 10.9]],
  ["2026-10-20", 92.0, 24.5, 22.5, 64.2, 47.0, 30.4, 1937, 10.32, 38, 10, [4.5, 4.6, 32.9, 11.0, 11.2]],
];

// Hora em que cada medição da Avanutri foi feita (vem do próprio relatório). Os PDFs do InBody
// de março não trazem a hora.
const HORA_MEDICAO: Record<string, string> = {
  "2026-04-13": "21:54:43",
  "2026-04-27": "13:12:39",
  "2026-05-17": "21:41:01",
  "2026-06-03": "17:09:49",
  "2026-09-01": "10:17:02",
  "2026-10-20": "08:06:24",
};

export const MEDICOES_HISTORICO: MedicaoBioimpedancia[] = SEED.map(
  ([data, peso, gord, massaGord, massaLivre, aguaL, imc, tmb, apend, idade, visc, s]) => ({
    data,
    hora: HORA_MEDICAO[data],
    pesoKg: peso,
    gorduraPct: gord,
    massaGorduraKg: massaGord,
    massaMagraKg: massaLivre,
    massaMuscularEsqueleticaKg: null,
    gorduraVisceral: visc,
    aguaCorporalPct: Math.round((aguaL / peso) * 1000) / 10,
    aguaCorporalL: aguaL,
    imc,
    indiceApendicular: apend,
    tmbKcal: tmb,
    idadeMetabolica: idade,
    massaMagraSegmentar: {
      bracoDireitoKg: s[0], bracoEsquerdoKg: s[1], troncoKg: s[2], pernaDireitaKg: s[3], pernaEsquerdaKg: s[4],
    },
    origem: "historico" as const,
  }),
);

const KEY = "biofit:bioimpedancia";

function getSalvas(): MedicaoBioimpedancia[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as MedicaoBioimpedancia[]) : [];
  } catch {
    return [];
  }
}

function deRegistroCorpo(r: RegistroCorpo): MedicaoBioimpedancia {
  const seg = r.segmentos;
  const apendicular =
    seg && [seg.bracoDireito, seg.bracoEsquerdo, seg.pernaDireita, seg.pernaEsquerda].every((x) => x.massaMagraKg != null)
      ? Math.round(
          (([seg.bracoDireito, seg.bracoEsquerdo, seg.pernaDireita, seg.pernaEsquerda].reduce((a, x) => a + x.massaMagraKg!, 0)) /
            (ALTURA_M * ALTURA_M)) * 100,
        ) / 100
      : null;
  return {
    data: r.data,
    hora: r.quando.slice(11, 19),
    pesoKg: r.pesoKg,
    gorduraPct: r.gorduraPct,
    massaGorduraKg: r.massaGordaKg,
    massaMagraKg: r.massaLivreKg,
    massaMuscularEsqueleticaKg: r.musculoEsqueleticoKg,
    gorduraVisceral: r.gorduraVisceral,
    aguaCorporalPct: r.aguaTotalL != null ? Math.round((r.aguaTotalL / r.pesoKg) * 1000) / 10 : null,
    aguaCorporalL: r.aguaTotalL,
    imc: r.imc,
    indiceApendicular: apendicular,
    tmbKcal: r.tmbKcal,
    idadeMetabolica: r.idadeMetabolica,
    massaMagraSegmentar:
      seg && seg.bracoDireito.massaMagraKg != null
        ? {
            bracoDireitoKg: seg.bracoDireito.massaMagraKg ?? 0,
            bracoEsquerdoKg: seg.bracoEsquerdo.massaMagraKg ?? 0,
            troncoKg: seg.tronco.massaMagraKg ?? 0,
            pernaDireitaKg: seg.pernaDireita.massaMagraKg ?? 0,
            pernaEsquerdaKg: seg.pernaEsquerda.massaMagraKg ?? 0,
          }
        : null,
    origem: "avanutri",
  };
}

// Histórico embutido < medições importadas da Avanutri (sync) < registros manuais, por data.
// A importada vence o histórico embutido porque traz mais campos (músculo esquelético, hora).
export function getMedicoes(): MedicaoBioimpedancia[] {
  const porData = new Map<string, MedicaoBioimpedancia>();
  for (const m of MEDICOES_HISTORICO) porData.set(m.data, m);
  for (const r of Object.values(getTodosCorpo())) porData.set(r.data, deRegistroCorpo(r));
  for (const m of getSalvas()) porData.set(m.data, { ...m, origem: "manual" });
  return Array.from(porData.values()).sort((a, b) => a.data.localeCompare(b.data));
}

export function salvarMedicao(m: MedicaoBioimpedancia): boolean {
  try {
    const outras = getSalvas().filter((x) => x.data !== m.data);
    window.localStorage.setItem(KEY, JSON.stringify([...outras, { ...m, origem: "manual" }]));
    return true;
  } catch {
    return false;
  }
}

export function removerMedicao(data: string): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(getSalvas().filter((x) => x.data !== data)));
  } catch {
    // storage indisponível
  }
}

export function resumoBioimpedancia(): ResumoBioimpedancia | null {
  const lista = getMedicoes();
  if (lista.length === 0) return null;
  const atual = lista[lista.length - 1];
  const anterior = lista.length > 1 ? lista[lista.length - 2] : null;
  const diasEntre = anterior
    ? Math.round((new Date(atual.data).getTime() - new Date(anterior.data).getTime()) / 86400000)
    : null;
  return { atual, anterior, diasEntre, total: lista.length };
}

export function delta(atual: number | null | undefined, anterior: number | null | undefined): number | null {
  if (atual == null || anterior == null) return null;
  return Math.round((atual - anterior) * 10) / 10;
}

export function contextoBioimpedancia() {
  const r = resumoBioimpedancia();
  if (!r) return null;
  const { atual, anterior, diasEntre } = r;
  const lista = getMedicoes();
  return {
    data: atual.data,
    pesoKg: atual.pesoKg,
    gorduraPct: atual.gorduraPct,
    massaGorduraKg: atual.massaGorduraKg,
    massaMagraKg: atual.massaMagraKg,
    massaMuscularEsqueleticaKg: atual.massaMuscularEsqueleticaKg,
    gorduraVisceral: atual.gorduraVisceral,
    aguaCorporalPct: atual.aguaCorporalPct,
    tmbKcal: atual.tmbKcal,
    idadeMetabolica: atual.idadeMetabolica,
    indiceApendicular: atual.indiceApendicular,
    anterior: anterior
      ? {
          data: anterior.data,
          diasEntre,
          pesoKg: anterior.pesoKg,
          gorduraPct: anterior.gorduraPct,
          massaMagraKg: anterior.massaMagraKg,
          massaMuscularEsqueleticaKg: anterior.massaMuscularEsqueleticaKg,
          gorduraVisceral: anterior.gorduraVisceral,
        }
      : null,
    historico: lista.map((m) => ({
      data: m.data,
      pesoKg: m.pesoKg,
      gorduraPct: m.gorduraPct,
      massaMagraKg: m.massaMagraKg,
    })),
  };
}
