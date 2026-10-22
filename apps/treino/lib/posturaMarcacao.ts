import { ladoVisivel, type PoseDetectada } from "./detectorPose";
import { ladoDaFrente, medidasFrontal, medidasPerfil, type Medida } from "./postura";
import type { Ponto2D, VistaPostura } from "./tipos";

// Monta os pontos de cada vista a partir do detector (ou de um gabarito, quando o detector
// falha e tudo é marcado à mão) e descreve o que o overlay desenha. Os pontos "auto" vêm do
// detector e podem ser corrigidos; os "manual" (C7, ápice, T12) só existem pelo toque.

export interface Marcador {
  nome: string;
  rotulo: string;
  cor: "auto" | "manual";
  ajuda: string;
}

export const MARCADORES: Record<VistaPostura, Marcador[]> = {
  perfil: [
    { nome: "nariz", rotulo: "Nariz", cor: "auto", ajuda: "Ponta do nariz (define para que lado você está virado)." },
    { nome: "orelha", rotulo: "Orelha", cor: "auto", ajuda: "Trago: a saliência na frente do canal da orelha." },
    { nome: "ombro", rotulo: "Ombro", cor: "auto", ajuda: "Centro da cabeça do úmero (lado da articulação)." },
    { nome: "quadril", rotulo: "Quadril", cor: "auto", ajuda: "Trocânter maior: o osso saliente na lateral do quadril." },
    { nome: "c7", rotulo: "C7", cor: "manual", ajuda: "A vértebra mais saliente na base do pescoço." },
    { nome: "apice", rotulo: "Ápice", cor: "manual", ajuda: "O ponto mais atrás da curva das costas." },
    { nome: "t12", rotulo: "T12", cor: "manual", ajuda: "Fim da caixa torácica, na altura da última costela." },
  ],
  frontal: [
    { nome: "olhoEsq", rotulo: "Olho E", cor: "auto", ajuda: "" },
    { nome: "olhoDir", rotulo: "Olho D", cor: "auto", ajuda: "" },
    { nome: "ombroEsq", rotulo: "Ombro E", cor: "auto", ajuda: "" },
    { nome: "ombroDir", rotulo: "Ombro D", cor: "auto", ajuda: "" },
    { nome: "quadrilEsq", rotulo: "Quadril E", cor: "auto", ajuda: "" },
    { nome: "quadrilDir", rotulo: "Quadril D", cor: "auto", ajuda: "" },
    { nome: "joelhoEsq", rotulo: "Joelho E", cor: "auto", ajuda: "" },
    { nome: "joelhoDir", rotulo: "Joelho D", cor: "auto", ajuda: "" },
  ],
};

export const LINHAS: Record<VistaPostura, { de: string; ate: string; estilo?: "cheia" | "tracejada" }[]> = {
  perfil: [
    { de: "orelha", ate: "c7" },
    { de: "ombro", ate: "quadril" },
    { de: "c7", ate: "apice" },
    { de: "apice", ate: "t12" },
    { de: "c7", ate: "t12", estilo: "tracejada" },
  ],
  frontal: [
    { de: "olhoEsq", ate: "olhoDir" },
    { de: "ombroEsq", ate: "ombroDir" },
    { de: "quadrilEsq", ate: "quadrilDir" },
    { de: "joelhoEsq", ate: "joelhoDir" },
    { de: "ombroEsq", ate: "quadrilEsq", estilo: "tracejada" },
    { de: "ombroDir", ate: "quadrilDir", estilo: "tracejada" },
  ],
};

export const REFERENCIAS: Record<VistaPostura, { de: string; direcao: "horizontal" | "vertical"; tamanho: number }[]> = {
  perfil: [
    { de: "c7", direcao: "horizontal", tamanho: 0.18 },
    { de: "quadril", direcao: "vertical", tamanho: 0.3 },
  ],
  frontal: [
    { de: "ombroEsq", direcao: "horizontal", tamanho: 0.25 },
    { de: "quadrilEsq", direcao: "horizontal", tamanho: 0.2 },
  ],
};

// Gabarito para marcação toda manual (detector indisponível): uma pessoa em pé, centrada.
const GABARITO: Record<VistaPostura, Record<string, Ponto2D>> = {
  perfil: {
    nariz: { x: 0.56, y: 0.14 },
    orelha: { x: 0.5, y: 0.14 },
    ombro: { x: 0.5, y: 0.28 },
    quadril: { x: 0.5, y: 0.52 },
    c7: { x: 0.46, y: 0.22 },
    apice: { x: 0.43, y: 0.33 },
    t12: { x: 0.46, y: 0.44 },
  },
  frontal: {
    olhoEsq: { x: 0.53, y: 0.13 },
    olhoDir: { x: 0.47, y: 0.13 },
    ombroEsq: { x: 0.62, y: 0.27 },
    ombroDir: { x: 0.38, y: 0.27 },
    quadrilEsq: { x: 0.58, y: 0.5 },
    quadrilDir: { x: 0.42, y: 0.5 },
    joelhoEsq: { x: 0.56, y: 0.72 },
    joelhoDir: { x: 0.44, y: 0.72 },
  },
};

export interface PontosIniciais {
  pontos: Record<string, Ponto2D>;
  confiancaDeteccao: number | null;
}

export function pontosIniciais(vista: VistaPostura, pose: PoseDetectada | null, proporcao: number): PontosIniciais {
  if (!pose) return { pontos: { ...GABARITO[vista] }, confiancaDeteccao: null };
  const xy = (p: Ponto2D): Ponto2D => ({ x: p.x, y: p.y });

  if (vista === "frontal") {
    const nomes = MARCADORES.frontal.map((m) => m.nome as keyof PoseDetectada);
    const pontos = Object.fromEntries(nomes.map((n) => [n, xy(pose[n])]));
    const confianca = nomes.reduce((s, n) => s + pose[n].visibilidade, 0) / nomes.length;
    return { pontos, confiancaDeteccao: Math.round(confianca * 100) / 100 };
  }

  const lado = ladoVisivel(pose);
  const nariz = xy(pose.nariz);
  const orelha = xy(pose[`orelha${lado}`]);
  const ombro = xy(pose[`ombro${lado}`]);
  const quadril = xy(pose[`quadril${lado}`]);
  // C7, ápice e T12 começam atrás da linha ombro–quadril, para o usuário só ajustar.
  const tras = ladoDaFrente(nariz, orelha) === "esquerda" ? 1 : -1;
  const tronco = Math.max(0.05, quadril.y - ombro.y);
  const dx = (k: number) => (tras * k * tronco) / proporcao;
  const pontos: Record<string, Ponto2D> = {
    nariz,
    orelha,
    ombro,
    quadril,
    c7: { x: ombro.x + dx(0.25), y: ombro.y - 0.2 * tronco },
    apice: { x: ombro.x + dx(0.4), y: ombro.y + 0.15 * tronco },
    t12: { x: ombro.x + dx(0.22), y: ombro.y + 0.55 * tronco },
  };
  const vis = [pose.nariz, pose[`orelha${lado}`], pose[`ombro${lado}`], pose[`quadril${lado}`]].map((p) => p.visibilidade);
  return { pontos, confiancaDeteccao: Math.round((vis.reduce((a, b) => a + b, 0) / vis.length) * 100) / 100 };
}

export function medidasDe(vista: VistaPostura, p: Record<string, Ponto2D>, proporcao: number): Partial<Record<Medida, number>> {
  if (vista === "perfil") {
    return medidasPerfil({ nariz: p.nariz, orelha: p.orelha, ombro: p.ombro, quadril: p.quadril, c7: p.c7, apice: p.apice, t12: p.t12 }, proporcao);
  }
  return medidasFrontal(
    {
      olhoEsq: p.olhoEsq,
      olhoDir: p.olhoDir,
      ombroEsq: p.ombroEsq,
      ombroDir: p.ombroDir,
      quadrilEsq: p.quadrilEsq,
      quadrilDir: p.quadrilDir,
      joelhoEsq: p.joelhoEsq,
      joelhoDir: p.joelhoDir,
    },
    proporcao,
  );
}
