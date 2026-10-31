import type { CargaDia } from "./carga";
import {
  arred,
  confiancaDe,
  correlacao,
  diaDaSemana,
  ehNum,
  media,
  somarDiasIso,
  validos,
  zscore,
} from "./estatistica";
import type { DiaForca, DiaRecuperacao, Insight, TreinoGarmin } from "./tipos";

// Cruzamentos treino × recuperação. Cada função devolve um Insight com o `n` usado e uma
// confiança honesta: com poucas semanas de dado quase tudo é "baixa", e o painel mostra isso
// em vez de esconder. Correlação não prova causa: o texto fala em "associação".

const NOMES_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const MIN_PARES = 8;

const porData = (dias: DiaRecuperacao[]) => new Map(dias.map((d) => [d.data, d]));

function semDados(id: string, titulo: string, falta: string): Insight {
  return { id, titulo, resumo: `Ainda sem dados para isto: ${falta}`, n: 0, confianca: "baixa" };
}

// 1) Quantos dias o corpo leva para responder a um dia de carga alta?
export function defasagemDoseResposta(dias: DiaRecuperacao[], carga: CargaDia[]): Insight {
  const id = "defasagem";
  const titulo = "Dias para recuperar de um treino";
  const cargaPorDia = new Map(carga.map((c) => [c.data, c.total]));
  const mapa = porData(dias);
  let melhor: { lag: number; r: number; n: number; pontos: { x: number; y: number }[] } | null = null;

  for (const lag of [0, 1, 2, 3]) {
    const pontos: { x: number; y: number }[] = [];
    for (const [data, c] of cargaPorDia) {
      const hrv = mapa.get(somarDiasIso(data, lag))?.hrvMs;
      if (ehNum(hrv)) pontos.push({ x: c, y: hrv });
    }
    const corr = correlacao(pontos);
    if (corr && pontos.length >= MIN_PARES && (!melhor || corr.r < melhor.r)) {
      melhor = { lag, r: corr.r, n: corr.n, pontos };
    }
  }
  if (!melhor) return semDados(id, titulo, `preciso de ${MIN_PARES}+ dias com VFC e carga registrada.`);

  const forte = melhor.r <= -0.25;
  const resumo = forte
    ? `A VFC cai mais ${melhor.lag === 0 ? "no mesmo dia" : `${melhor.lag} dia(s) depois`} de um treino pesado (r = ${arred(melhor.r, 2)}). Use esse intervalo para espaçar sessões duras.`
    : `Sem associação clara entre a carga do dia e a VFC dos 3 dias seguintes (melhor r = ${arred(melhor.r, 2)}).`;
  return {
    id,
    titulo,
    resumo,
    n: melhor.n,
    r: arred(melhor.r, 2),
    confianca: confiancaDe(melhor.n, melhor.r),
    pontos: melhor.pontos,
    rotuloX: "Carga do dia (UA)",
    rotuloY: `VFC em D+${melhor.lag} (ms)`,
  };
}

// 2) O sono da noite anterior muda o volume que o senhor consegue fazer?
export function sonoVsDesempenho(dias: DiaRecuperacao[], forca: DiaForca[]): Insight {
  const id = "sono-desempenho";
  const titulo = "Sono da noite × volume do treino";
  const mapa = porData(dias);
  const pontos: { x: number; y: number }[] = [];
  const curto: number[] = [];
  const longo: number[] = [];
  for (const f of forca) {
    const d = mapa.get(f.data);
    if (!d || f.series <= 0 || !ehNum(d.sonoMin)) continue;
    const restaurador = ehNum(d.sonoProfundoMin) && ehNum(d.sonoRemMin) ? d.sonoProfundoMin + d.sonoRemMin : null;
    if (restaurador !== null) pontos.push({ x: restaurador, y: f.series });
    (d.sonoMin < 420 ? curto : longo).push(f.series);
  }
  const corr = correlacao(pontos);
  if (!corr || pontos.length < MIN_PARES) {
    return semDados(id, titulo, `preciso de ${MIN_PARES}+ treinos de força com o sono da noite anterior.`);
  }
  const mc = media(curto);
  const ml = media(longo);
  const comparacao =
    mc !== null && ml !== null && curto.length >= 3 && longo.length >= 3
      ? ` Com menos de 7 h de sono: ${arred(mc)} séries; com 7 h ou mais: ${arred(ml)}.`
      : "";
  return {
    id,
    titulo,
    resumo: `Cada 30 min a mais de sono profundo+REM se associa a ${arred(corr.inclinacao * 30, 1)} séries a mais (r = ${arred(corr.r, 2)}).${comparacao}`,
    n: corr.n,
    r: arred(corr.r, 2),
    confianca: confiancaDe(corr.n, corr.r),
    pontos,
    rotuloX: "Sono profundo + REM (min)",
    rotuloY: "Séries no dia",
  };
}

// 3) Treinar à noite estraga o sono profundo?
export function horarioTreinoVsSono(dias: DiaRecuperacao[], treinos: TreinoGarmin[]): Insight {
  const id = "horario-sono";
  const titulo = "Horário do treino × sono profundo";
  const mapa = porData(dias);
  const noite: number[] = [];
  const outros: number[] = [];
  for (const t of treinos) {
    const prof = mapa.get(somarDiasIso(t.data, 1))?.sonoProfundoMin;
    if (!ehNum(prof)) continue;
    const hora = (new Date(t.inicioUtc).getUTCHours() - 3 + 24) % 24; // Belém, UTC-3
    (hora >= 19 ? noite : outros).push(prof);
  }
  if (noite.length < 3 || outros.length < 3) {
    return semDados(id, titulo, "preciso de 3+ treinos depois das 19 h e 3+ em outros horários, com o sono da noite seguinte.");
  }
  const a = media(noite)!;
  const b = media(outros)!;
  const n = noite.length + outros.length;
  const dif = a - b;
  return {
    id,
    titulo,
    resumo:
      Math.abs(dif) < 5
        ? `Sem diferença relevante: ${Math.round(a)} min de sono profundo após treino noturno vs ${Math.round(b)} min nos demais.`
        : `Após treino depois das 19 h o sono profundo foi ${Math.round(a)} min, contra ${Math.round(b)} min nos demais horários (${dif > 0 ? "+" : ""}${Math.round(dif)} min).`,
    n,
    confianca: n >= 20 ? "media" : "baixa",
    detalhe: `${noite.length} treinos noturnos, ${outros.length} em outros horários.`,
  };
}

// 4) Sinais precoces de doença ou sobrecarga: FC de repouso alta + respiração alta + VFC baixa.
export function alertaPrecoce(dias: DiaRecuperacao[]): Insight {
  const id = "alerta-precoce";
  const titulo = "Alerta precoce de doença ou sobrecarga";
  const ultimo = dias[dias.length - 1];
  if (!ultimo) return semDados(id, titulo, "sem dias carregados.");
  const base = (campo: (d: DiaRecuperacao) => number | null) =>
    dias.filter((d) => d.data < ultimo.data && d.data >= somarDiasIso(ultimo.data, -60)).map(campo);

  const zFc = zscore(ultimo.fcRepouso, base((d) => d.fcRepouso));
  const zResp = zscore(ultimo.respiracao, base((d) => d.respiracao));
  const zHrv = zscore(ultimo.hrvMs, base((d) => d.hrvMs));
  const sinais: string[] = [];
  if (zFc !== null && zFc > 1.5) sinais.push(`FC de repouso ${ultimo.fcRepouso} bpm (z ${arred(zFc)})`);
  if (zResp !== null && zResp > 1.5) sinais.push(`respiração ${ultimo.respiracao}/min (z ${arred(zResp)})`);
  if (zHrv !== null && zHrv < -1.5) sinais.push(`VFC ${ultimo.hrvMs} ms (z ${arred(zHrv)})`);
  const medidos = [zFc, zResp, zHrv].filter((z) => z !== null).length;
  if (medidos === 0) return semDados(id, titulo, "preciso de 7+ dias de linha de base.");

  return {
    id,
    titulo,
    resumo:
      sinais.length >= 2
        ? `Atenção: ${sinais.length} de ${medidos} sinais fora do seu normal em ${ultimo.data}: ${sinais.join("; ")}. Considere aliviar o treino e observar sintomas.`
        : sinais.length === 1
          ? `1 sinal fora do normal (${sinais[0]}). Sozinho, não indica problema.`
          : `Nenhum dos ${medidos} sinais está fora do seu normal em ${ultimo.data}.`,
    n: medidos,
    confianca: dias.length >= 30 ? "media" : "baixa",
  };
}

// 5) Em que dia da semana o senhor costuma acordar mais recuperado?
export function janelaIdeal(dias: DiaRecuperacao[]): Insight {
  const id = "janela-ideal";
  const titulo = "Dia da semana com melhor recuperação";
  const grupos = new Map<number, number[]>();
  for (const d of dias) {
    if (!ehNum(d.bodyBatteryAcordar)) continue;
    const k = diaDaSemana(d.data);
    grupos.set(k, [...(grupos.get(k) ?? []), d.bodyBatteryAcordar]);
  }
  const medias = [...grupos.entries()].filter(([, v]) => v.length >= 3).map(([k, v]) => ({ k, m: media(v)!, n: v.length }));
  if (medias.length < 4) return semDados(id, titulo, "preciso de 3+ semanas de Body Battery ao acordar.");
  medias.sort((a, b) => b.m - a.m);
  const melhor = medias[0];
  const pior = medias[medias.length - 1];
  const n = validos(medias.map((x) => x.n)).reduce((a, b) => a + b, 0);
  return {
    id,
    titulo,
    resumo: `Você acorda mais recuperado na ${NOMES_SEMANA[melhor.k]} (Body Battery ${Math.round(melhor.m)}) e menos na ${NOMES_SEMANA[pior.k]} (${Math.round(pior.m)}). Coloque as sessões mais duras depois dos dias bons.`,
    n,
    confianca: n >= 28 ? "media" : "baixa",
  };
}

export function gerarInsights(
  dias: DiaRecuperacao[],
  treinos: TreinoGarmin[],
  forca: DiaForca[],
  carga: CargaDia[],
): Insight[] {
  return [
    alertaPrecoce(dias),
    defasagemDoseResposta(dias, carga),
    sonoVsDesempenho(dias, forca),
    horarioTreinoVsSono(dias, treinos),
    janelaIdeal(dias),
  ];
}
