import type { Ponto2D } from "./tipos";

// Detector de pose por foto, atrás de uma interface pequena para o modelo poder ser trocado
// (hoje MediaPipe Pose Landmarker; um modelo que enxergue a coluna entraria aqui). Só roda no
// navegador e só é carregado na tela de postura (import dinâmico), para não pesar o resto do
// app. Os nomes dos pontos seguem o lado da PESSOA (ombroEsq é o ombro esquerdo dela).

export type NomePontoDetectado =
  | "nariz"
  | "olhoEsq"
  | "olhoDir"
  | "orelhaEsq"
  | "orelhaDir"
  | "ombroEsq"
  | "ombroDir"
  | "quadrilEsq"
  | "quadrilDir"
  | "joelhoEsq"
  | "joelhoDir"
  | "tornozeloEsq"
  | "tornozeloDir";

export interface PontoDetectado extends Ponto2D {
  visibilidade: number; // 0–1
}

export type PoseDetectada = Record<NomePontoDetectado, PontoDetectado>;

export interface DetectorPose {
  detectar(imagem: HTMLImageElement | HTMLCanvasElement): Promise<PoseDetectada | null>;
  fechar(): void;
}

// Índices do esqueleto de 33 pontos do MediaPipe.
const INDICES: Record<NomePontoDetectado, number> = {
  nariz: 0,
  olhoEsq: 2,
  olhoDir: 5,
  orelhaEsq: 7,
  orelhaDir: 8,
  ombroEsq: 11,
  ombroDir: 12,
  quadrilEsq: 23,
  quadrilDir: 24,
  joelhoEsq: 25,
  joelhoDir: 26,
  tornozeloEsq: 27,
  tornozeloDir: 28,
};

// WASM do CDN com versão fixa (13 MB por variante: não cabe no repositório); o service worker
// guarda depois do primeiro uso. O modelo (5,8 MB) é servido pelo próprio app.
export const VERSAO_MEDIAPIPE = "1.1.1";
export const URL_WASM_MEDIAPIPE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSAO_MEDIAPIPE}/wasm`;
export const URL_MODELO_POSE = "/modelos/pose_landmarker_lite.task";

let carregando: Promise<DetectorPose> | null = null;

export function carregarDetector(): Promise<DetectorPose> {
  carregando ??= (async () => {
    const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
    const wasm = await FilesetResolver.forVisionTasks(URL_WASM_MEDIAPIPE);
    const landmarker = await PoseLandmarker.createFromOptions(wasm, {
      baseOptions: { modelAssetPath: URL_MODELO_POSE },
      runningMode: "IMAGE",
      numPoses: 1,
    });
    return {
      async detectar(imagem: HTMLImageElement | HTMLCanvasElement) {
        const r = landmarker.detect(imagem);
        const pose = r.landmarks[0];
        if (!pose) return null;
        const saida = {} as PoseDetectada;
        for (const [nome, i] of Object.entries(INDICES) as [NomePontoDetectado, number][]) {
          const p = pose[i];
          saida[nome] = { x: p.x, y: p.y, visibilidade: p.visibility ?? 0 };
        }
        return saida;
      },
      fechar() {
        landmarker.close();
        carregando = null;
      },
    };
  })().catch((e) => {
    carregando = null;
    throw e;
  });
  return carregando;
}

// No perfil, o lado visível é o mais próximo da câmera: escolhe o de maior visibilidade.
export function ladoVisivel(pose: PoseDetectada): "Esq" | "Dir" {
  const soma = (lado: "Esq" | "Dir") =>
    pose[`orelha${lado}`].visibilidade + pose[`ombro${lado}`].visibilidade + pose[`quadril${lado}`].visibilidade;
  return soma("Esq") >= soma("Dir") ? "Esq" : "Dir";
}
