import { dataCurta, diaNum, extremos, fmt } from "./escala";

export interface PontoSerie {
  data: string; // YYYY-MM-DD
  valor: number;
}
export interface PontoBanda {
  data: string;
  baixo: number;
  alto: number;
}

interface Props {
  pontos: PontoSerie[];
  rotulo: string;
  unidade: string;
  banda?: PontoBanda[]; // faixa de referência (ex.: baseline de VFC)
  linhaRef?: { valor: number; rotulo: string }[]; // linhas horizontais (ex.: ACWR 0,8 e 1,3)
  faixaIdeal?: { de: number; ate: number }; // zona sombreada
  cor?: "brand" | "accent" | "danger";
  altura?: number;
}

const W = 520;
const PAD = { top: 12, right: 12, bottom: 22, left: 40 };
const STROKE = { brand: "stroke-brand", accent: "stroke-accent", danger: "stroke-danger" };
const FILL = { brand: "fill-brand", accent: "fill-accent", danger: "fill-danger" };

// Linha no tempo com eixo x proporcional às datas (buracos aparecem como buracos).
export function LinhaSerie({ pontos, rotulo, unidade, banda, linhaRef, faixaIdeal, cor = "brand", altura = 190 }: Props) {
  if (pontos.length === 0) {
    return <p className="py-8 text-center text-sm text-ink-faint">Sem dados de {rotulo.toLowerCase()} no período.</p>;
  }
  const H = altura;
  const todos = [
    ...pontos.map((p) => p.valor),
    ...(banda ?? []).flatMap((b) => [b.baixo, b.alto]),
    ...(linhaRef ?? []).map((l) => l.valor),
    ...(faixaIdeal ? [faixaIdeal.de, faixaIdeal.ate] : []),
  ];
  const [min, max] = extremos(todos);
  const d0 = diaNum(pontos[0].data);
  const span = Math.max(1, diaNum(pontos[pontos.length - 1].data) - d0);
  const w = W - PAD.left - PAD.right;
  const h = H - PAD.top - PAD.bottom;
  const x = (iso: string) => PAD.left + (pontos.length === 1 ? w / 2 : ((diaNum(iso) - d0) / span) * w);
  const y = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * h;
  const caminho = pontos.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.data).toFixed(1)},${y(p.valor).toFixed(1)}`).join(" ");
  const bandaOrd = [...(banda ?? [])].sort((a, b) => a.data.localeCompare(b.data));
  const areaBanda =
    bandaOrd.length > 1
      ? `${bandaOrd.map((b, i) => `${i === 0 ? "M" : "L"}${x(b.data).toFixed(1)},${y(b.alto).toFixed(1)}`).join(" ")} ${[...bandaOrd]
          .reverse()
          .map((b) => `L${x(b.data).toFixed(1)},${y(b.baixo).toFixed(1)}`)
          .join(" ")} Z`
      : null;
  const ticks = [min + (max - min) * 0.12, (min + max) / 2, max - (max - min) * 0.12];
  const ultimo = pontos[pontos.length - 1];

  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${rotulo} (${unidade}) ao longo do tempo. Último valor: ${fmt(ultimo.valor)} em ${dataCurta(ultimo.data)}.`}
      >
        {faixaIdeal && (
          <rect x={PAD.left} width={w} y={y(faixaIdeal.ate)} height={Math.max(0, y(faixaIdeal.de) - y(faixaIdeal.ate))} className="fill-accent/10" />
        )}
        {areaBanda && <path d={areaBanda} className="fill-ink-faint/15" />}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="stroke-line" strokeWidth={1} />
            <text x={PAD.left - 4} y={y(t) + 3} textAnchor="end" fontSize={10} className="fill-ink-faint">
              {fmt(t)}
            </text>
          </g>
        ))}
        {(linhaRef ?? []).map((l) => (
          <g key={l.rotulo}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(l.valor)} y2={y(l.valor)} className="stroke-ink-faint" strokeDasharray="4 3" strokeWidth={1} />
            <text x={W - PAD.right} y={y(l.valor) - 3} textAnchor="end" fontSize={9} className="fill-ink-faint">
              {l.rotulo}
            </text>
          </g>
        ))}
        <text x={PAD.left} y={H - 6} fontSize={10} className="fill-ink-faint">
          {dataCurta(pontos[0].data)}
        </text>
        {pontos.length > 1 && (
          <text x={W - PAD.right} y={H - 6} textAnchor="end" fontSize={10} className="fill-ink-faint">
            {dataCurta(ultimo.data)}
          </text>
        )}
        {pontos.length > 1 && <path d={caminho} fill="none" className={STROKE[cor]} strokeWidth={2} strokeLinejoin="round" />}
        {pontos.map((p) => (
          <circle key={p.data} cx={x(p.data)} cy={y(p.valor)} r={pontos.length > 60 ? 1.8 : 3} className={FILL[cor]}>
            <title>{`${dataCurta(p.data)}: ${fmt(p.valor)} ${unidade}`}</title>
          </circle>
        ))}
      </svg>
    </figure>
  );
}
