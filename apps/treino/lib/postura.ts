import { diasEntre, tendencia, type Confianca, type Tendencia } from "./corpo";
import type { Ponto2D, RegistroPostura, VistaPostura } from "./tipos";

// Avaliação postural por foto. Funções puras: recebem os pontos marcados na imagem (do
// detector de pose e dos toques do usuário) e devolvem ângulos; recebem a série de avaliações
// e devolvem a tendência. Rodam igual no app e no servidor (MCP).
//
// Nenhum modelo de pose aberto enxerga a coluna torácica, então a cifose vem de três pontos
// tocados pelo usuário na foto de perfil (C7, ápice da curva, T12). Os outros ângulos saem dos
// pontos do detector. Tudo é medida de foto, não diagnóstico: a repetibilidade depende de
// repetir o protocolo (mesma distância, altura da câmera e luz), e a análise só declara
// mudança fora da faixa de ruído.
//
// Coordenadas normalizadas pela imagem (0–1), x para a direita, y para baixo. Os ângulos usam
// a razão largura/altura da foto para não distorcer quando ela não é quadrada.

// Faixas de ruído entre sessões (ponto de partida, não medido nos seus dados).
export const RUIDO_ANGULO_GRAUS = 3;
export const RUIDO_INDICE_CIFOSE = 1.5;
export const JANELA_DIAS = 180;
export const MIN_SESSOES = 3;
export const MIN_SPAN_DIAS = 21;
export const LEMBRETE_DIAS = 30;
// Referência de literatura para o índice de cifose (flexicurve): acima disso costuma ser
// chamado de hipercifose. Só orientação, nunca diagnóstico.
export const REFERENCIA_INDICE_CIFOSE = 13;
// Ângulo craniovertebral abaixo disso é lido como cabeça anteriorizada.
export const REFERENCIA_CVA = 50;

export type MedidaPerfil = "anguloCifose" | "indiceCifose" | "cva" | "inclinacaoTronco";
export type MedidaFrontal = "ombros" | "quadril" | "joelhos" | "olhos";
export type Medida = MedidaPerfil | MedidaFrontal;

export const MEDIDAS_POR_VISTA: Record<VistaPostura, Medida[]> = {
  perfil: ["anguloCifose", "indiceCifose", "cva", "inclinacaoTronco"],
  frontal: ["ombros", "quadril", "joelhos", "olhos"],
};

export interface InfoMedida {
  rotulo: string;
  curto: string;
  unidade: string;
  // Para onde é "melhor": subir, descer ou aproximar de zero.
  melhor: "subir" | "descer" | "zero";
  ruido: number;
}

export const INFO_MEDIDA: Record<Medida, InfoMedida> = {
  anguloCifose: { rotulo: "Ângulo de cifose torácica", curto: "Cifose", unidade: "°", melhor: "descer", ruido: RUIDO_ANGULO_GRAUS },
  indiceCifose: { rotulo: "Índice de cifose", curto: "Índice", unidade: "", melhor: "descer", ruido: RUIDO_INDICE_CIFOSE },
  cva: { rotulo: "Ângulo craniovertebral", curto: "Cabeça", unidade: "°", melhor: "subir", ruido: RUIDO_ANGULO_GRAUS },
  inclinacaoTronco: { rotulo: "Inclinação do tronco", curto: "Tronco", unidade: "°", melhor: "zero", ruido: RUIDO_ANGULO_GRAUS },
  ombros: { rotulo: "Inclinação dos ombros", curto: "Ombros", unidade: "°", melhor: "zero", ruido: RUIDO_ANGULO_GRAUS },
  quadril: { rotulo: "Inclinação do quadril", curto: "Quadril", unidade: "°", melhor: "zero", ruido: RUIDO_ANGULO_GRAUS },
  joelhos: { rotulo: "Inclinação dos joelhos", curto: "Joelhos", unidade: "°", melhor: "zero", ruido: RUIDO_ANGULO_GRAUS },
  olhos: { rotulo: "Inclinação da cabeça", curto: "Cabeça", unidade: "°", melhor: "zero", ruido: RUIDO_ANGULO_GRAUS },
};

const GRAUS = 180 / Math.PI;
const r1 = (n: number) => Math.round(n * 10) / 10;

// Converte para um espaço onde 1 unidade em x vale o mesmo que 1 em y (pixels da foto).
const escalar = (p: Ponto2D, proporcao: number): Ponto2D => ({ x: p.x * proporcao, y: p.y });

// ===== Perfil =====

export interface Cifose {
  anguloGraus: number; // ângulo entre as tangentes nas pontas, assumindo arco circular (flexicurve)
  indice: number; // flecha / corda × 100 (Milne & Lauder)
}

// Três pontos sobre a coluna na foto de perfil: C7, ápice da curva e T12. A corda liga C7 a
// T12; a flecha é a distância do ápice à corda. Com arco circular, o ângulo entre as tangentes
// nas pontas é 4·atan(2h/L), a mesma conta do flexicurve.
export function cifose(c7: Ponto2D, apice: Ponto2D, t12: Ponto2D, proporcao = 1): Cifose {
  const a = escalar(c7, proporcao);
  const b = escalar(apice, proporcao);
  const c = escalar(t12, proporcao);
  const corda = Math.hypot(c.x - a.x, c.y - a.y);
  if (corda === 0) return { anguloGraus: 0, indice: 0 };
  const flecha = Math.abs((c.x - a.x) * (a.y - b.y) - (a.x - b.x) * (c.y - a.y)) / corda;
  return { anguloGraus: r1(4 * Math.atan((2 * flecha) / corda) * GRAUS), indice: r1((flecha / corda) * 100) };
}

// Ângulo entre a linha C7 → trago da orelha e a horizontal. Menor = cabeça mais à frente.
export function anguloCraniovertebral(orelha: Ponto2D, c7: Ponto2D, proporcao = 1): number {
  const o = escalar(orelha, proporcao);
  const c = escalar(c7, proporcao);
  const dx = Math.abs(o.x - c.x);
  const dy = c.y - o.y; // orelha acima do C7 → positivo
  return r1(Math.atan2(dy, dx) * GRAUS);
}

// Para que lado a pessoa está virada na foto de perfil: o nariz fica à frente da orelha.
export function ladoDaFrente(nariz: Ponto2D, orelha: Ponto2D): "esquerda" | "direita" {
  return nariz.x < orelha.x ? "esquerda" : "direita";
}

// Ângulo da linha quadril → ombro contra a vertical. Positivo = ombro à frente do quadril.
export function inclinacaoTronco(ombro: Ponto2D, quadril: Ponto2D, frente: "esquerda" | "direita", proporcao = 1): number {
  const o = escalar(ombro, proporcao);
  const q = escalar(quadril, proporcao);
  const paraFrente = (o.x - q.x) * (frente === "esquerda" ? -1 : 1);
  const subida = q.y - o.y;
  if (subida <= 0 && paraFrente === 0) return 0;
  return r1(Math.atan2(paraFrente, Math.max(subida, 1e-9)) * GRAUS);
}

// ===== Frontal =====

// Inclinação da linha entre o lado esquerdo e o direito do corpo (lados da pessoa, não da
// foto). Positivo = lado direito mais baixo na imagem.
export function inclinacaoPar(esq: Ponto2D, dir: Ponto2D, proporcao = 1): number {
  const e = escalar(esq, proporcao);
  const d = escalar(dir, proporcao);
  const dx = Math.abs(d.x - e.x);
  if (dx === 0) return 0;
  return r1(Math.atan2(d.y - e.y, dx) * GRAUS);
}

// ===== Medidas a partir dos pontos =====

export interface PontosPerfil {
  nariz: Ponto2D;
  orelha: Ponto2D;
  ombro: Ponto2D;
  quadril: Ponto2D;
  c7: Ponto2D;
  apice: Ponto2D;
  t12: Ponto2D;
}

export interface PontosFrontal {
  olhoEsq: Ponto2D;
  olhoDir: Ponto2D;
  ombroEsq: Ponto2D;
  ombroDir: Ponto2D;
  quadrilEsq: Ponto2D;
  quadrilDir: Ponto2D;
  joelhoEsq: Ponto2D;
  joelhoDir: Ponto2D;
}

export function medidasPerfil(p: PontosPerfil, proporcao = 1): Record<MedidaPerfil, number> {
  const k = cifose(p.c7, p.apice, p.t12, proporcao);
  const frente = ladoDaFrente(p.nariz, p.orelha);
  return {
    anguloCifose: k.anguloGraus,
    indiceCifose: k.indice,
    cva: anguloCraniovertebral(p.orelha, p.c7, proporcao),
    inclinacaoTronco: inclinacaoTronco(p.ombro, p.quadril, frente, proporcao),
  };
}

export function medidasFrontal(p: PontosFrontal, proporcao = 1): Record<MedidaFrontal, number> {
  return {
    olhos: inclinacaoPar(p.olhoEsq, p.olhoDir, proporcao),
    ombros: inclinacaoPar(p.ombroEsq, p.ombroDir, proporcao),
    quadril: inclinacaoPar(p.quadrilEsq, p.quadrilDir, proporcao),
    joelhos: inclinacaoPar(p.joelhoEsq, p.joelhoDir, proporcao),
  };
}

// ===== Série e análise =====

export const ordenarPostura = (postura: Record<string, RegistroPostura>): RegistroPostura[] =>
  Object.values(postura).sort((a, b) => a.quando.localeCompare(b.quando));

function mediana(valores: number[]): number {
  const v = [...valores].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

export interface SessaoPostura {
  data: string;
  vista: VistaPostura;
  capturas: number;
  medidas: Partial<Record<Medida, number>>; // mediana das capturas do dia
}

// Várias capturas no mesmo dia viram uma sessão com a mediana de cada medida: o erro de
// marcação de um toque não vira tendência.
export function sessoesPorDia(regs: RegistroPostura[], vista: VistaPostura): SessaoPostura[] {
  const porDia = new Map<string, RegistroPostura[]>();
  for (const r of regs) {
    if (r.vista !== vista) continue;
    porDia.set(r.data, [...(porDia.get(r.data) ?? []), r]);
  }
  return Array.from(porDia.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([data, lista]) => {
      const medidas: Partial<Record<Medida, number>> = {};
      for (const m of MEDIDAS_POR_VISTA[vista]) {
        const vals = lista.flatMap((r) => (r.medidas[m] == null ? [] : [r.medidas[m] as number]));
        if (vals.length) medidas[m] = r1(mediana(vals));
      }
      return { data, vista, capturas: lista.length, medidas };
    });
}

const MS_DIA = 86_400_000;
const diaAbsoluto = (iso: string) => Math.floor(new Date(`${iso}T12:00:00Z`).getTime() / MS_DIA);

export type Direcao = "melhorou" | "piorou" | "dentro_do_ruido" | "dados_insuficientes";

export interface TendenciaMedida {
  medida: Medida;
  atual: number | null;
  variacao: number | null; // mudança ajustada ao longo da janela
  porMes: number | null;
  direcao: Direcao;
}

// Para medidas cujo ideal é zero, a tendência é do valor absoluto (−4° → −1° é melhora).
function tendenciaDe(sessoes: SessaoPostura[], medida: Medida): TendenciaMedida {
  const info = INFO_MEDIDA[medida];
  const pontos = sessoes.flatMap((s) => {
    const v = s.medidas[medida];
    return v == null ? [] : [{ dia: diaAbsoluto(s.data), v: info.melhor === "zero" ? Math.abs(v) : v }];
  });
  const atual = sessoes.length ? (sessoes[sessoes.length - 1].medidas[medida] ?? null) : null;
  const t: Tendencia | null = pontos.length >= MIN_SESSOES ? tendencia(pontos) : null;
  if (!t || t.spanDias < MIN_SPAN_DIAS) return { medida, atual, variacao: null, porMes: null, direcao: "dados_insuficientes" };
  let direcao: Direcao = "dentro_do_ruido";
  if (Math.abs(t.variacao) > info.ruido) {
    const subiu = t.variacao > 0;
    direcao = info.melhor === "subir" ? (subiu ? "melhorou" : "piorou") : subiu ? "piorou" : "melhorou";
  }
  return { medida, atual, variacao: r1(t.variacao), porMes: r1(t.porMes), direcao };
}

export type VereditoPostura = "dados_insuficientes" | "dentro_do_ruido" | "cifose_melhorando" | "cifose_piorando" | "misto";

export interface AnalisePostura {
  veredito: VereditoPostura;
  confianca: Confianca;
  sessoes: { perfil: number; frontal: number };
  periodo: { inicio: string; fim: string } | null;
  diasDesdeUltima: number | null;
  tendencias: TendenciaMedida[];
  avisos: string[];
  explicacao: string;
}

export function analisarPostura(todas: RegistroPostura[], opcoes: { hoje: string }): AnalisePostura {
  const { hoje } = opcoes;
  const limite = new Date(diaAbsoluto(hoje) * MS_DIA - JANELA_DIAS * MS_DIA).toISOString().slice(0, 10);
  const naJanela = todas.filter((r) => r.data >= limite && r.data <= hoje);
  const perfil = sessoesPorDia(naJanela, "perfil");
  const frontal = sessoesPorDia(naJanela, "frontal");
  const datas = [...perfil, ...frontal].map((s) => s.data).sort();
  const ultima = todas.length ? [...todas].sort((a, b) => a.quando.localeCompare(b.quando))[todas.length - 1] : null;
  const diasDesdeUltima = ultima ? diasEntre(ultima.data, hoje) : null;

  const avisos: string[] = [];
  if (diasDesdeUltima !== null && diasDesdeUltima > LEMBRETE_DIAS) avisos.push(`Última avaliação há ${diasDesdeUltima} dias.`);
  const umaCaptura = [...perfil, ...frontal].filter((s) => s.capturas === 1).length;
  if (umaCaptura > 0) {
    avisos.push(`${umaCaptura} sessão(ões) com uma captura só: faça 3 por sessão para a mediana absorver o erro de marcação.`);
  }
  const ultimoPerfil = perfil.length ? perfil[perfil.length - 1] : null;
  if (ultimoPerfil?.medidas.indiceCifose != null && ultimoPerfil.medidas.indiceCifose > REFERENCIA_INDICE_CIFOSE) {
    avisos.push(`Índice de cifose ${ultimoPerfil.medidas.indiceCifose} acima da referência ${REFERENCIA_INDICE_CIFOSE} (flexicurve). É medida de foto, não diagnóstico: vale como linha de base para comparar.`);
  }
  if (ultimoPerfil?.medidas.cva != null && ultimoPerfil.medidas.cva < REFERENCIA_CVA) {
    avisos.push(`Ângulo craniovertebral ${ultimoPerfil.medidas.cva}° abaixo de ${REFERENCIA_CVA}°: cabeça anteriorizada na última foto.`);
  }

  const tendencias = [
    ...MEDIDAS_POR_VISTA.perfil.map((m) => tendenciaDe(perfil, m)),
    ...MEDIDAS_POR_VISTA.frontal.map((m) => tendenciaDe(frontal, m)),
  ];
  const base = {
    sessoes: { perfil: perfil.length, frontal: frontal.length },
    periodo: datas.length ? { inicio: datas[0], fim: datas[datas.length - 1] } : null,
    diasDesdeUltima,
    tendencias,
    avisos,
  };

  const spanPerfil = perfil.length >= 2 ? diasEntre(perfil[0].data, perfil[perfil.length - 1].data) : 0;
  if (perfil.length < MIN_SESSOES || spanPerfil < MIN_SPAN_DIAS) {
    return {
      ...base,
      veredito: "dados_insuficientes",
      confianca: "baixa",
      explicacao: `São precisas pelo menos ${MIN_SESSOES} sessões de perfil cobrindo ${MIN_SPAN_DIAS} dias ou mais; há ${perfil.length}, cobrindo ${spanPerfil} dias.`,
    };
  }

  const por = Object.fromEntries(tendencias.map((t) => [t.medida, t])) as Record<Medida, TendenciaMedida>;
  const kif = por.anguloCifose;
  const cva = por.cva;
  const sinal = (v: number | null) => (v == null ? "—" : `${v > 0 ? "+" : ""}${v}`);
  let veredito: VereditoPostura;
  let explicacao: string;
  if (kif.direcao === "melhorou" && cva.direcao !== "piorou") {
    veredito = "cifose_melhorando";
    explicacao = `Ângulo de cifose ${sinal(kif.variacao)}° na tendência${cva.direcao === "melhorou" ? ` e cabeça menos à frente (CVA ${sinal(cva.variacao)}°)` : ""}.`;
  } else if (kif.direcao === "piorou" && cva.direcao !== "melhorou") {
    veredito = "cifose_piorando";
    explicacao = `Ângulo de cifose ${sinal(kif.variacao)}° na tendência${cva.direcao === "piorou" ? ` e cabeça mais à frente (CVA ${sinal(cva.variacao)}°)` : ""}.`;
  } else if (kif.direcao === "dentro_do_ruido" && cva.direcao === "dentro_do_ruido") {
    veredito = "dentro_do_ruido";
    explicacao = `Cifose ${sinal(kif.variacao)}° e CVA ${sinal(cva.variacao)}°: dentro da faixa de ruído entre sessões (±${RUIDO_ANGULO_GRAUS}°).`;
  } else {
    veredito = "misto";
    explicacao = `Cifose ${kif.direcao.replace(/_/g, " ")} (${sinal(kif.variacao)}°) e CVA ${cva.direcao.replace(/_/g, " ")} (${sinal(cva.variacao)}°): sinais em direções diferentes.`;
  }

  const semMediana = perfil.some((s) => s.capturas < 3);
  let confianca: Confianca = perfil.length >= 6 && spanPerfil >= 56 ? "alta" : "media";
  if (semMediana) confianca = confianca === "alta" ? "media" : "baixa";
  return { ...base, veredito, confianca, explicacao };
}
