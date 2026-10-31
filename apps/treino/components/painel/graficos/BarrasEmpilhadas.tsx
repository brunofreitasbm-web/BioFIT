import { dataCurta, fmt } from "./escala";

export interface SegmentoBarra {
  rotulo: string;
  valor: number;
  classe: string; // classe tailwind "fill-..." do segmento
}
export interface BarraEmpilhada {
  chave: string; // YYYY-MM-DD ou rótulo
  segmentos: SegmentoBarra[];
}

const W = 520;
const PAD = { top: 10, right: 8, bottom: 22, left: 34 };

export function BarrasEmpilhadas({
  barras,
  unidade,
  rotulo,
  altura = 190,
  ehData = true,
}: {
  barras: BarraEmpilhada[];
  unidade: string;
  rotulo: string;
  altura?: number;
  ehData?: boolean;
}) {
  if (barras.length === 0) return <p className="py-8 text-center text-sm text-ink-faint">Sem dados de {rotulo.toLowerCase()} no período.</p>;
  const H = altura;
  const totais = barras.map((b) => b.segmentos.reduce((a, s) => a + s.valor, 0));
  const max = Math.max(...totais, 1) * 1.08;
  const w = W - PAD.left - PAD.right;
  const h = H - PAD.top - PAD.bottom;
  const passo = w / barras.length;
  const larg = Math.max(2, passo * 0.72);
  const y = (v: number) => PAD.top + (1 - v / max) * h;
  const legenda = barras[0].segmentos;
  const nome = (c: string) => (ehData ? dataCurta(c) : c);

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${rotulo} (${unidade}) por ${ehData ? "dia" : "grupo"}`}>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(max * f)} y2={y(max * f)} className="stroke-line" strokeWidth={1} />
            <text x={PAD.left - 4} y={y(max * f) + 3} textAnchor="end" fontSize={10} className="fill-ink-faint">
              {fmt(max * f, 0)}
            </text>
          </g>
        ))}
        {barras.map((b, i) => {
          let acc = 0;
          const x = PAD.left + i * passo + (passo - larg) / 2;
          return (
            <g key={b.chave}>
              <title>{`${nome(b.chave)}: ${b.segmentos.map((s) => `${s.rotulo} ${fmt(s.valor, 0)}`).join(", ")} ${unidade}`}</title>
              {b.segmentos.map((s) => {
                const y1 = y(acc + s.valor);
                const alt = Math.max(0, y(acc) - y1);
                acc += s.valor;
                return <rect key={s.rotulo} x={x} y={y1} width={larg} height={alt} className={s.classe} />;
              })}
            </g>
          );
        })}
        <text x={PAD.left} y={H - 6} fontSize={10} className="fill-ink-faint">
          {nome(barras[0].chave)}
        </text>
        {barras.length > 1 && (
          <text x={W - PAD.right} y={H - 6} textAnchor="end" fontSize={10} className="fill-ink-faint">
            {nome(barras[barras.length - 1].chave)}
          </text>
        )}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
        {legenda.map((s) => (
          <span key={s.rotulo} className="inline-flex items-center gap-1.5">
            <svg width="10" height="10" aria-hidden="true">
              <rect width="10" height="10" rx="2" className={s.classe} />
            </svg>
            {s.rotulo}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
