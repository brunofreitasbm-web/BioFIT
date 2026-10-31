import { correlacao } from "@/lib/painel/estatistica";
import { extremos, fmt } from "./escala";

const W = 360;
const H = 220;
const PAD = { top: 12, right: 14, bottom: 34, left: 44 };

// Dispersão com a reta de mínimos quadrados (a reta só aparece com 5+ pontos).
export function Dispersao({ pontos, rotuloX, rotuloY }: { pontos: { x: number; y: number }[]; rotuloX: string; rotuloY: string }) {
  if (pontos.length === 0) return null;
  const [x0, x1] = extremos(pontos.map((p) => p.x), 0.08);
  const [y0, y1] = extremos(pontos.map((p) => p.y), 0.12);
  const w = W - PAD.left - PAD.right;
  const h = H - PAD.top - PAD.bottom;
  const X = (v: number) => PAD.left + ((v - x0) / (x1 - x0)) * w;
  const Y = (v: number) => PAD.top + (1 - (v - y0) / (y1 - y0)) * h;
  const c = correlacao(pontos);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Dispersão de ${rotuloY} contra ${rotuloX}, ${pontos.length} pontos`}>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={PAD.left} x2={W - PAD.right} y1={Y(y0 + (y1 - y0) * f)} y2={Y(y0 + (y1 - y0) * f)} className="stroke-line" strokeWidth={1} />
          <text x={PAD.left - 4} y={Y(y0 + (y1 - y0) * f) + 3} textAnchor="end" fontSize={10} className="fill-ink-faint">
            {fmt(y0 + (y1 - y0) * f, 0)}
          </text>
          <text x={X(x0 + (x1 - x0) * f)} y={H - 20} textAnchor="middle" fontSize={10} className="fill-ink-faint">
            {fmt(x0 + (x1 - x0) * f, 0)}
          </text>
        </g>
      ))}
      {c && (
        <line
          x1={X(x0)}
          x2={X(x1)}
          y1={Y(c.intercepto + c.inclinacao * x0)}
          y2={Y(c.intercepto + c.inclinacao * x1)}
          className="stroke-brand"
          strokeWidth={2}
          strokeDasharray="5 3"
        />
      )}
      {pontos.map((p, i) => (
        <circle key={i} cx={X(p.x)} cy={Y(p.y)} r={3.2} className="fill-accent/80">
          <title>{`${rotuloX}: ${fmt(p.x, 0)} · ${rotuloY}: ${fmt(p.y, 0)}`}</title>
        </circle>
      ))}
      <text x={PAD.left + w / 2} y={H - 4} textAnchor="middle" fontSize={10} className="fill-ink-muted">
        {rotuloX}
      </text>
      <text x={10} y={PAD.top + h / 2} textAnchor="middle" fontSize={10} className="fill-ink-muted" transform={`rotate(-90 10 ${PAD.top + h / 2})`}>
        {rotuloY}
      </text>
    </svg>
  );
}
