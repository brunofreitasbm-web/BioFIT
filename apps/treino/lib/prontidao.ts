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
}

export type NivelProntidao = "normal" | "atencao" | "baixa" | "sem_dados";

export interface Prontidao {
  nivel: NivelProntidao;
  motivos: string[];
  // Só quando nivel é "atencao" ou "baixa".
  ajuste: { reduzirSeries: number; rirExtra: number; naoProgredirCarga: true; orientacao: string } | null;
  fonte: { data: string | null; sonoHoras: number | null; sonoScore: number | null; bodyBatteryAcordar: number | null };
}

const SONO_FORTE_H = 5;
const SONO_FRACO_H = 6;
const SCORE_FORTE = 50;
const SCORE_FRACO = 60;
const BB_FORTE = 30;
const BB_FRACO = 50;

// Dia de `hoje` (a Garmin data o sono pelo dia em que se acorda). Sem linha de hoje não há
// o que ajustar: o relógio pode não ter sincronizado, e dado de ontem não vale para hoje.
export function avaliarProntidao(dias: DiaGarmin[], hoje: string, deload: boolean): Prontidao {
  const doDia = dias.find((d) => d.data === hoje) ?? null;
  const fonte = {
    data: doDia?.data ?? null,
    sonoHoras: doDia?.sonoHoras ?? null,
    sonoScore: doDia?.sonoScore ?? null,
    bodyBatteryAcordar: doDia?.bodyBatteryAcordar ?? null,
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

  // Duas noites curtas seguidas pesam mais que uma.
  const ontem = dias.find((d) => d.data === diaAnterior(hoje));
  if (sono > 0 && ontem?.sonoHoras != null && ontem.sonoHoras < SONO_FRACO_H) {
    sono += 1;
    motivos.push(`Ontem também dormiu pouco (${String(ontem.sonoHoras).replace(".", ",")} h)`);
  }

  const nivel: NivelProntidao = sono > 0 && bb > 0 ? "baixa" : sono + bb > 0 ? "atencao" : "normal";
  if (nivel === "normal") return { nivel, motivos: ["Sono e Body Battery sem alerta."], ajuste: null, fonte };
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

// VFC e FC de repouso só fazem sentido contra a própria média: 7 dias anteriores a `hoje`,
// com pelo menos 4 leituras. VFC baixa e FC alta são os sentidos ruins. Informativo: não
// altera o nível de prontidão nem o treino.
export function nivelTendencia(dias: DiaGarmin[], hoje: string, campo: "hrvMs" | "fcRepouso"): NivelMetrica {
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
  if (campo === "hrvMs") return atual < m * 0.75 ? "alerta" : atual < m * 0.85 ? "atencao" : "bom";
  return atual >= m + 8 ? "alerta" : atual >= m + 5 ? "atencao" : "bom";
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
