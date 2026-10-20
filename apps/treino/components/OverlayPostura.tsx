"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Ponto2D } from "@/lib/tipos";

// Pontos e linhas sobre a foto, com arrasto. O arrasto aplica o DESLOCAMENTO do dedo ao ponto
// (não a posição absoluta), então o dedo não precisa cobrir o ponto para ajustá-lo fino.
// Enquanto arrasta, uma lupa mostra o trecho da foto em volta do ponto, ampliado e com mira,
// fora de baixo do dedo. Coordenadas 0–1 da foto; o viewBox segue a proporção dela para nada
// ficar distorcido.

export interface PontoOverlay {
  nome: string;
  rotulo: string;
  cor: "auto" | "manual";
}

export interface LinhaOverlay {
  de: string;
  ate: string;
  estilo?: "cheia" | "tracejada";
}

interface Props {
  src: string;
  proporcao: number; // largura / altura
  pontos: Record<string, Ponto2D>;
  marcadores: PontoOverlay[];
  linhas: LinhaOverlay[];
  // Linhas de referência (horizontal/vertical) a partir de um ponto, no tamanho dado (fração).
  referencias?: { de: string; direcao: "horizontal" | "vertical"; tamanho: number }[];
  aoMover: (nome: string, p: Ponto2D) => void;
  editavel?: boolean;
  zoomLupa?: number; // ampliação da lupa (padrão 3×)
}

const H = 1000;
const LUPA_PX = 128; // diâmetro da lupa na tela
const LUPA_FOLGA_PX = 28; // distância entre o ponto e a lupa

// Posição da lupa (centro, em px do quadro): acima do ponto; se não couber, abaixo; sempre
// inteira dentro do quadro.
export function posicaoLupa(ponto: Ponto2D, largura: number, altura: number, diametro = LUPA_PX, folga = LUPA_FOLGA_PX) {
  const r = diametro / 2;
  const px = ponto.x * largura;
  const py = ponto.y * altura;
  let cy = py - folga - r;
  if (cy - r < 4) cy = py + folga + r;
  const cx = Math.min(Math.max(px, r + 4), Math.max(r + 4, largura - r - 4));
  return { x: cx, y: Math.min(Math.max(cy, r + 4), Math.max(r + 4, altura - r - 4)) };
}

interface EstadoLupa {
  nome: string;
  largura: number; // quadro em px
  altura: number;
}

export function OverlayPostura({ src, proporcao, pontos, marcadores, linhas, referencias = [], aoMover, editavel = true, zoomLupa = 3 }: Props) {
  const W = H * proporcao;
  const svgRef = useRef<SVGSVGElement>(null);
  const [lupa, setLupa] = useState<EstadoLupa | null>(null);
  const arrasto = useRef<{ nome: string; x0: number; y0: number; px: number; py: number } | null>(null);
  const X = (p: Ponto2D) => p.x * W;
  const Y = (p: Ponto2D) => p.y * H;
  const r = Math.round(W / 55);

  function inicio(nome: string, e: ReactPointerEvent<SVGGElement>) {
    if (!editavel) return;
    const p = pontos[nome];
    if (!p) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    arrasto.current = { nome, x0: p.x, y0: p.y, px: e.clientX, py: e.clientY };
    const caixa = svgRef.current?.getBoundingClientRect();
    if (caixa) setLupa({ nome, largura: caixa.width, altura: caixa.height });
  }

  function mover(e: ReactPointerEvent<SVGGElement>) {
    const a = arrasto.current;
    const svg = svgRef.current;
    if (!a || !svg) return;
    const caixa = svg.getBoundingClientRect();
    const dx = (e.clientX - a.px) / caixa.width;
    const dy = (e.clientY - a.py) / caixa.height;
    aoMover(a.nome, { x: Math.min(1, Math.max(0, a.x0 + dx)), y: Math.min(1, Math.max(0, a.y0 + dy)) });
  }

  function fim() {
    arrasto.current = null;
    setLupa(null);
  }

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-base-950" style={{ aspectRatio: `${proporcao}` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="absolute inset-0 h-full w-full select-none object-contain" draggable={false} />
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="absolute inset-0 h-full w-full touch-none"
        role="img"
        aria-label="Pontos marcados sobre a foto"
      >
        {referencias.map((ref, i) => {
          const p = pontos[ref.de];
          if (!p) return null;
          const t = ref.tamanho;
          return ref.direcao === "horizontal" ? (
            <line key={i} x1={X(p) - t * W} x2={X(p) + t * W} y1={Y(p)} y2={Y(p)} stroke="rgb(255 255 255 / 0.5)" strokeWidth={2} strokeDasharray="8 8" />
          ) : (
            <line key={i} x1={X(p)} x2={X(p)} y1={Y(p) - t * H} y2={Y(p) + t * H} stroke="rgb(255 255 255 / 0.5)" strokeWidth={2} strokeDasharray="8 8" />
          );
        })}
        {linhas.map((l) => {
          const a = pontos[l.de];
          const b = pontos[l.ate];
          if (!a || !b) return null;
          return (
            <line
              key={`${l.de}-${l.ate}`}
              x1={X(a)}
              y1={Y(a)}
              x2={X(b)}
              y2={Y(b)}
              stroke="#b6ff3b"
              strokeWidth={4}
              strokeDasharray={l.estilo === "tracejada" ? "10 10" : undefined}
              strokeLinecap="round"
            />
          );
        })}
        {marcadores.map((m) => {
          const p = pontos[m.nome];
          if (!p) return null;
          const cor = m.cor === "manual" ? "#ff8a3b" : "#b6ff3b";
          return (
            <g
              key={m.nome}
              onPointerDown={(e) => inicio(m.nome, e)}
              onPointerMove={mover}
              onPointerUp={fim}
              onPointerCancel={fim}
              style={{ cursor: editavel ? "grab" : "default" }}
            >
              {/* área de toque generosa, invisível */}
              <circle cx={X(p)} cy={Y(p)} r={r * 2.2} fill="transparent" />
              <circle cx={X(p)} cy={Y(p)} r={r} fill={cor} fillOpacity={0.25} stroke={cor} strokeWidth={3} />
              <circle cx={X(p)} cy={Y(p)} r={r / 4} fill={cor} />
              <text
                x={X(p) + r * 1.5}
                y={Y(p) - r * 0.6}
                fontSize={r * 1.6}
                fontWeight={700}
                fill="#fff"
                stroke="rgb(0 0 0 / 0.7)"
                strokeWidth={4}
                paintOrder="stroke"
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {m.rotulo}
              </text>
            </g>
          );
        })}
      </svg>
      {lupa && pontos[lupa.nome] && <Lupa src={src} ponto={pontos[lupa.nome]} estado={lupa} zoom={zoomLupa} />}
    </div>
  );
}

function Lupa({ src, ponto, estado, zoom }: { src: string; ponto: Ponto2D; estado: EstadoLupa; zoom: number }) {
  const { largura, altura } = estado;
  const c = posicaoLupa(ponto, largura, altura);
  const r = LUPA_PX / 2;
  return (
    <div
      className="pointer-events-none absolute overflow-hidden rounded-full border-2 border-white bg-base-950 shadow-lg"
      style={{
        width: LUPA_PX,
        height: LUPA_PX,
        left: c.x - r,
        top: c.y - r,
        backgroundImage: `url(${src})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${largura * zoom}px ${altura * zoom}px`,
        backgroundPosition: `${r - ponto.x * largura * zoom}px ${r - ponto.y * altura * zoom}px`,
      }}
      data-testid="lupa"
      aria-hidden="true"
    >
      {/* Mira: o ponto fica exatamente no centro da lupa. */}
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <line x1={50} y1={8} x2={50} y2={42} stroke="#fff" strokeWidth={1.4} />
        <line x1={50} y1={58} x2={50} y2={92} stroke="#fff" strokeWidth={1.4} />
        <line x1={8} y1={50} x2={42} y2={50} stroke="#fff" strokeWidth={1.4} />
        <line x1={58} y1={50} x2={92} y2={50} stroke="#fff" strokeWidth={1.4} />
        <circle cx={50} cy={50} r={3} fill="none" stroke="#ff8a3b" strokeWidth={1.6} />
        <text x={50} y={97} textAnchor="middle" fontSize={8} fontWeight={700} fill="#fff" stroke="rgb(0 0 0 / 0.7)" strokeWidth={2} paintOrder="stroke">
          {zoom}×
        </text>
      </svg>
    </div>
  );
}
