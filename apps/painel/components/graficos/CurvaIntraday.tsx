import { fmt } from "./escala";

export interface FaixaTreino {
  inicio: number; // ms epoch
  fim: number;
  rotulo: string;
}

const W = 520;
const H = 170;
const PAD = { top: 10, right: 10, bottom: 22, left: 34 };
const hora = (ms: number) => new Date(ms).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Belem" });

// Curva de um dia (Body Battery ou estresse, 0–100) com os treinos sombreados por cima.
export function CurvaIntraday({ pontos, rotulo, treinos = [] }: { pontos: [number, number][]; rotulo: string; treinos?: FaixaTreino[] }) {
  if (pontos.length < 2) return <p className="py-8 text-center text-sm text-ink-faint">Sem curva de {rotulo.toLowerCase()} neste dia.</p>;
  const t0 = pontos[0][0];
  const t1 = pontos[pontos.length - 1][0];
  const w = W - PAD.left - PAD.right;
  const h = H - PAD.top - PAD.bottom;
  const X = (t: number) => PAD.left + ((t - t0) / Math.max(1, t1 - t0)) * w;
  const Y = (v: number) => PAD.top + (1 - v / 100) * h;
  const caminho = pontos.map((p, i) => `${i === 0 ? "M" : "L"}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(" ");
  const marcas = [t0, t0 + (t1 - t0) / 2, t1];
  const ultimo = pontos[pontos.length - 1][1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label={`${rotulo} ao longo do dia, de ${hora(t0)} a ${hora(t1)}. Último valor ${fmt(ultimo, 0)}.`}
    >
      {[0, 50, 100].map((v) => (
        <g key={v}>
          <line x1={PAD.left} x2={W - PAD.right} y1={Y(v)} y2={Y(v)} className="stroke-line" strokeWidth={1} />
          <text x={PAD.left - 4} y={Y(v) + 3} textAnchor="end" fontSize={10} className="fill-ink-faint">
            {v}
          </text>
        </g>
      ))}
      {treinos
        .filter((t) => t.fim >= t0 && t.inicio <= t1)
        .map((t) => (
          <g key={t.inicio}>
            <rect
              x={X(Math.max(t.inicio, t0))}
              y={PAD.top}
              width={Math.max(2, X(Math.min(t.fim, t1)) - X(Math.max(t.inicio, t0)))}
              height={h}
              className="fill-brand/20"
            />
            <text x={X(Math.max(t.inicio, t0)) + 3} y={PAD.top + 10} fontSize={9} className="fill-brand">
              {t.rotulo}
            </text>
          </g>
        ))}
      <path d={caminho} fill="none" className="stroke-accent" strokeWidth={2} strokeLinejoin="round" />
      {marcas.map((t, i) => (
        <text key={i} x={X(t)} y={H - 6} textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"} fontSize={10} className="fill-ink-faint">
          {hora(t)}
        </text>
      ))}
    </svg>
  );
}
