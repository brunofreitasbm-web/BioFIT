// Prontidão do dia a partir do sono e do Body Battery do relógio Garmin. É um filtro
// conservador: um dia ruim isolado só pede mais folga de esforço (+1 RIR, sem subir carga);
// só sono E Body Battery ruins juntos reduzem volume. Nunca manda pular o treino nem mexe
// nas cargas sugeridas pela dupla progressão ou no histórico.
// Os limiares são padrões razoáveis, não validados contra os seus dados: ajuste aqui.

export interface DiaGarmin {
  data: string;
  sonoHoras: number | null;
  sonoScore: number | null;
  bodyBatteryAcordar: number | null;
  // Só para os ícones de tendência; não entram no nível de prontidão.
  hrvMs?: number | null;
  fcRepouso?: number | null;
  // Classificação da Garmin (BALANCED, LOW...); só existe depois de ~3 semanas de leituras.
  vfcStatus?: string | null;
}

export type NivelProntidao = "normal" | "atencao" | "baixa" | "sem_dados";

export interface Prontidao {
  nivel: NivelProntidao;
  motivos: string[];
  // Só quando nivel é "atencao" ou "baixa".
  ajuste: { reduzirSeries: number; rirExtra: number; naoProgredirCarga: true; orientacao: string } | null;
  fonte: { data: string | null; sonoHoras: number | null; sonoScore: number | null; bodyBatteryAcordar: number | null; vfc: NivelVfc | null };
}

const SONO_FORTE_H = 5;
const SONO_FRACO_H = 6;
const SCORE_FORTE = 50;
const SCORE_FRACO = 60;
const BB_FORTE = 30;
const BB_FRACO = 50;

export const VFC_MIN_BASE = 14; // leituras na base (dias hoje-35..hoje-7)
const VFC_MIN_RECENTE = 5; // leituras nos últimos 7 dias, incluindo hoje
const VFC_MIN_NOITES_ABAIXO = 4; // de 7: uma noite isolada não decide
const VFC_SWC_MIN = 0.03; // piso do "menor mudança relevante" em ln (~3%): base muito estável não dispara à toa

export type NivelVfc = "sem_base" | "normal" | "abaixo" | "muito_abaixo";

export interface DiaVfc {
  data: string;
  hrvMs?: number | null;
  vfcStatus?: string | null;
}

export interface AvaliacaoVfc {
  nivel: NivelVfc;
  motivo: string;
  diasBase: number;
  mediaRecenteMs: number | null;
  baseMs: number | null;
  faixaMs: [number, number] | null;
}

function somaDias(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function dp(v: number[], m: number): number {
  return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1));
}

// VFC noturna contra a própria linha de base (Plews/Buchheit): média de 7 dias de ln(VFC) contra a
// média e o desvio das ~4 semanas anteriores. Uma noite isolada oscila ±10–15% sem significar nada,
// por isso a média de 7 dias é quem decide. Sem base suficiente não opina (só a classificação LOW/POOR
// da própria Garmin vale; UNBALANCED não, porque pode ser VFC alta).
export function avaliarVfc(dias: DiaVfc[], hoje: string, statusGarmin?: string | null): AvaliacaoVfc {
  const ln = (ini: string, fim: string): { data: string; v: number }[] =>
    dias
      .filter((d) => d.data >= ini && d.data <= fim && typeof d.hrvMs === "number" && d.hrvMs > 0)
      .map((d) => ({ data: d.data, v: Math.log(d.hrvMs as number) }));
  const base = ln(somaDias(hoje, -35), somaDias(hoje, -7)).map((x) => x.v);
  const recente = ln(somaDias(hoje, -6), hoje);
  const doHoje = recente.find((x) => x.data === hoje) ?? null;
  const status = (statusGarmin ?? dias.find((d) => d.data === hoje)?.vfcStatus ?? "").toUpperCase();
  const vazio = { diasBase: base.length, mediaRecenteMs: null, baseMs: null, faixaMs: null };

  if (base.length < VFC_MIN_BASE || recente.length < VFC_MIN_RECENTE || !doHoje) {
    if (status === "LOW" || status === "POOR") {
      return { nivel: "abaixo", motivo: "VFC classificada como baixa pela Garmin", ...vazio };
    }
    const faltam = base.length < VFC_MIN_BASE ? `base em formação (${base.length}/${VFC_MIN_BASE} dias)` : "faltam leituras recentes";
    return { nivel: "sem_base", motivo: `VFC sem efeito: ${faltam}`, ...vazio };
  }

  const mB = base.reduce((a, b) => a + b, 0) / base.length;
  const sB = dp(base, mB);
  const swc = Math.max(0.5 * sB, VFC_SWC_MIN);
  const mR = recente.reduce((a, b) => a + b.v, 0) / recente.length;
  const ms = (x: number) => Math.round(Math.exp(x) * 10) / 10;
  const dados = { diasBase: base.length, mediaRecenteMs: ms(mR), baseMs: ms(mB), faixaMs: [ms(mB - swc), ms(mB + swc)] as [number, number] };
  const txt = `VFC média de 7 dias ${dados.mediaRecenteMs} ms (sua base ${dados.baseMs} ms)`;

  // Uma noite muito fora da curva puxa a média sozinha: só conta se a maioria das noites recentes
  // também ficou claramente abaixo da base (mais que meia faixa).
  const noitesAbaixo = recente.filter((x) => x.v < mB - swc / 2).length;
  const consistente = noitesAbaixo >= VFC_MIN_NOITES_ABAIXO;

  if (consistente && mR < mB - 2 * swc && doHoje.v < mB - sB) return { nivel: "muito_abaixo", motivo: `${txt}, bem abaixo da faixa`, ...dados };
  if (consistente && mR < mB - swc) return { nivel: "abaixo", motivo: `${txt}, abaixo da faixa`, ...dados };
  return { nivel: "normal", motivo: `${txt}, dentro da faixa`, ...dados };
}

// Dia de `hoje` (a Garmin data o sono pelo dia em que se acorda). Sem linha de hoje não há
// o que ajustar: o relógio pode não ter sincronizado, e dado de ontem não vale para hoje.
export function avaliarProntidao(dias: DiaGarmin[], hoje: string, deload: boolean, vfc?: AvaliacaoVfc | null): Prontidao {
  const doDia = dias.find((d) => d.data === hoje) ?? null;
  const fonte = {
    data: doDia?.data ?? null,
    sonoHoras: doDia?.sonoHoras ?? null,
    sonoScore: doDia?.sonoScore ?? null,
    bodyBatteryAcordar: doDia?.bodyBatteryAcordar ?? null,
    vfc: vfc?.nivel ?? null,
  };
  const semMedida = !doDia || (fonte.sonoHoras === null && fonte.sonoScore === null && fonte.bodyBatteryAcordar === null);
  if (semMedida) {
    return { nivel: "sem_dados", motivos: ["Sem sono nem Body Battery de hoje (o relógio pode não ter sincronizado): treino como planejado."], ajuste: null, fonte };
  }

  const motivos: string[] = [];
  let sono = 0;
  const h = fonte.sonoHoras;
  const hTxt = h === null ? "" : String(h).replace(".", ",");
  if (h !== null && h < SONO_FORTE_H) { sono = 2; motivos.push(`Sono de ${hTxt} h (< ${SONO_FORTE_H} h)`); }
  else if (h !== null && h < SONO_FRACO_H) { sono = 1; motivos.push(`Sono de ${hTxt} h (< ${SONO_FRACO_H} h)`); }
  const s = fonte.sonoScore;
  if (s !== null && s < SCORE_FORTE) { sono = Math.max(sono, 2); motivos.push(`Score de sono ${s} (< ${SCORE_FORTE})`); }
  else if (s !== null && s < SCORE_FRACO) { sono = Math.max(sono, 1); motivos.push(`Score de sono ${s} (< ${SCORE_FRACO})`); }

  let bb = 0;
  const b = fonte.bodyBatteryAcordar;
  if (b !== null && b < BB_FORTE) { bb = 2; motivos.push(`Body Battery ao acordar ${b} (< ${BB_FORTE})`); }
  else if (b !== null && b < BB_FRACO) { bb = 1; motivos.push(`Body Battery ao acordar ${b} (< ${BB_FRACO})`); }

  // VFC contra a base pessoal soma ao Body Battery no mesmo grupo (recuperação): sozinha só pede
  // folga de esforço, nunca corta série; com sono ruim junto, equivale a Body Battery ruim.
  let vf = 0;
  if (vfc?.nivel === "abaixo") { vf = 1; motivos.push(vfc.motivo); }
  else if (vfc?.nivel === "muito_abaixo") { vf = 2; motivos.push(vfc.motivo); }
  const rec = Math.max(bb, vf);

  // Duas noites curtas seguidas pesam mais que uma.
  const ontem = dias.find((d) => d.data === diaAnterior(hoje));
  if (sono > 0 && ontem?.sonoHoras != null && ontem.sonoHoras < SONO_FRACO_H) {
    sono += 1;
    motivos.push(`Ontem também dormiu pouco (${String(ontem.sonoHoras).replace(".", ",")} h)`);
  }

  const nivel: NivelProntidao = sono > 0 && rec > 0 ? "baixa" : sono + rec > 0 ? "atencao" : "normal";
  if (nivel === "normal") return { nivel, motivos: ["Sono, Body Battery e VFC sem alerta."], ajuste: null, fonte };
  if (deload) {
    return { nivel, motivos: [...motivos, "Semana de deload: nenhum ajuste extra."], ajuste: null, fonte };
  }
  return {
    nivel,
    motivos,
    ajuste:
      nivel === "baixa"
        ? {
            reduzirSeries: 1,
            rirExtra: 1,
            naoProgredirCarga: true,
            orientacao: "Sono e Body Battery ruins juntos: −1 série por exercício (mín. 2), pare 1 repetição mais longe da falha e não suba carga hoje. Sem teste de falha. Se estiver mal de verdade, decisão sua: este ajuste não manda pular o treino.",
          }
        : {
            reduzirSeries: 0,
            rirExtra: 1,
            naoProgredirCarga: true,
            orientacao: "Um sinal de recuperação baixo: mantenha as séries, pare 1 repetição mais longe da falha e não suba carga hoje. Sem teste de falha.",
          },
    fonte,
  };
}

function diaAnterior(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// "1-2" → "2-3"; textos fora do padrão ficam como estão.
export function deslocarRir(alvo: string, extra: number): string {
  const m = /^(\d+)-(\d+)$/.exec(alvo);
  return m ? `${Number(m[1]) + extra}-${Number(m[2]) + extra}` : alvo;
}

// ===== Status por métrica (ícones do cartão) =====

export type NivelMetrica = "bom" | "atencao" | "alerta" | "sem_dado";

export function nivelSono(horas: number | null, score: number | null): NivelMetrica {
  if (horas === null && score === null) return "sem_dado";
  if ((horas !== null && horas < SONO_FORTE_H) || (score !== null && score < SCORE_FORTE)) return "alerta";
  if ((horas !== null && horas < SONO_FRACO_H) || (score !== null && score < SCORE_FRACO)) return "atencao";
  return "bom";
}

export function nivelBodyBattery(bb: number | null): NivelMetrica {
  if (bb === null) return "sem_dado";
  if (bb < BB_FORTE) return "alerta";
  if (bb < BB_FRACO) return "atencao";
  return "bom";
}

function media(v: number[]): number {
  return v.reduce((a, b) => a + b, 0) / v.length;
}

// FC de repouso só faz sentido contra a própria média: 7 dias anteriores a `hoje`, com pelo menos
// 4 leituras. Informativo: não altera o nível de prontidão nem o treino. (A VFC tem avaliação
// própria, `avaliarVfc`, que entra na prontidão.)
export function nivelTendencia(dias: DiaGarmin[], hoje: string, campo: "fcRepouso"): NivelMetrica {
  const atual = dias.find((d) => d.data === hoje)?.[campo] ?? null;
  if (atual === null || atual === undefined) return "sem_dado";
  const base = dias
    .filter((d) => d.data < hoje)
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 7)
    .map((d) => d[campo])
    .filter((v): v is number => typeof v === "number");
  if (base.length < 4) return "sem_dado";
  const m = media(base);
  return atual >= m + 8 ? "alerta" : atual >= m + 5 ? "atencao" : "bom";
}

export function nivelVfc(vfc: AvaliacaoVfc | null | undefined): NivelMetrica {
  if (!vfc) return "sem_dado";
  return vfc.nivel === "muito_abaixo" ? "alerta" : vfc.nivel === "abaixo" ? "atencao" : vfc.nivel === "normal" ? "bom" : "sem_dado";
}

// Formato do /api/garmin/today (janela.diario) -> DiaGarmin.
export function diasDaJanela(
  diario: { data: string; sonoHoras: number | null; sonoScore: number | null; bodyBattery: number | null; hrvMs: number | null; fcRepouso: number | null }[],
): DiaGarmin[] {
  return diario.map((d) => ({
    data: d.data,
    sonoHoras: d.sonoHoras,
    sonoScore: d.sonoScore,
    bodyBatteryAcordar: d.bodyBattery,
    hrvMs: d.hrvMs,
    fcRepouso: d.fcRepouso,
  }));
}
