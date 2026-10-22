export interface MedicaoBioimpedancia {
  data: string; // YYYY-MM-DD
  pesoKg: number | null;
  gorduraPct: number | null;
  massaMagraKg: number | null;
  massaMuscularEsqueleticaKg: number | null;
  gorduraVisceral: number | null;
  aguaCorporalPct: number | null;
  tmbKcal: number | null;
  idadeMetabolica: number | null;
  observacoes?: string;
}

export interface ResumoBioimpedancia {
  atual: MedicaoBioimpedancia;
  anterior: MedicaoBioimpedancia | null;
  diasEntre: number | null;
  total: number;
}

const KEY = "biofit:bioimpedancia";

export function getMedicoes(): MedicaoBioimpedancia[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const lista = raw ? (JSON.parse(raw) as MedicaoBioimpedancia[]) : [];
    return lista.sort((a, b) => a.data.localeCompare(b.data));
  } catch {
    return [];
  }
}

export function salvarMedicao(m: MedicaoBioimpedancia): boolean {
  try {
    const outras = getMedicoes().filter((x) => x.data !== m.data);
    window.localStorage.setItem(KEY, JSON.stringify([...outras, m]));
    return true;
  } catch {
    return false;
  }
}

export function removerMedicao(data: string): void {
  try {
    const restantes = getMedicoes().filter((x) => x.data !== data);
    window.localStorage.setItem(KEY, JSON.stringify(restantes));
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

export function delta(atual: number | null, anterior: number | null): number | null {
  if (atual == null || anterior == null) return null;
  return Math.round((atual - anterior) * 10) / 10;
}

export function contextoBioimpedancia() {
  const r = resumoBioimpedancia();
  if (!r) return null;
  const { atual, anterior, diasEntre } = r;
  return {
    data: atual.data,
    pesoKg: atual.pesoKg,
    gorduraPct: atual.gorduraPct,
    massaMagraKg: atual.massaMagraKg,
    massaMuscularEsqueleticaKg: atual.massaMuscularEsqueleticaKg,
    gorduraVisceral: atual.gorduraVisceral,
    aguaCorporalPct: atual.aguaCorporalPct,
    tmbKcal: atual.tmbKcal,
    idadeMetabolica: atual.idadeMetabolica,
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
  };
}
