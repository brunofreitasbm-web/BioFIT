// Linha de uma métrica no tempo. O eixo x é proporcional às datas (as medições são irregulares),
// não à posição, para um buraco de 3 meses aparecer como buraco.

export interface PontoTempo {
  data: string; // YYYY-MM-DD
  valor: number;
}

const W = 320;
const H = 170;
const PAD = { top: 12, right: 12, bottom: 22, left: 40 };
const MS_DIA = 86_400_000;

const dia = (iso: string) => Math.floor(new Date(`${iso}T12:00:00Z`).getTime() / MS_DIA);
const curta = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export function GraficoTempo({ pontos, unidade, rotulo }: { pontos: PontoTempo[]; unidade: string; rotulo: string }) {
  if (pontos.length === 0) return null;
  const valores = pontos.map((p) => p.valor);
  let min = Math.min(...valores);
  let max = Math.max(...valores);
  if (max - min < 0.5) {
    min -= 0.5;
    max += 0.5;
  }
  const margem = (max - min) * 0.15;
  min -= margem;
  max += margem;

  const d0 = dia(pontos[0].data);
  const span = Math.max(1, dia(pontos[pontos.length - 1].data) - d0);
  const larguraUtil = W - PAD.left - PAD.right;
  const alturaUtil = H - PAD.top - PAD.bottom;
  const x = (p: PontoTempo) => PAD.left + (pontos.length === 1 ? larguraUtil / 2 : ((dia(p.data) - d0) / span) * larguraUtil);
  const y = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * alturaUtil;
  const caminho = pontos.map((p, i) => `${i === 0 ? "M" : "L"}${x(p).toFixed(1)},${y(p.valor).toFixed(1)}`).join(" ");
  const ticks = [min + margem, (min + max) / 2, max - margem];

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Gráfico de ${rotulo} (${unidade}) ao longo do tempo`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="stroke-line" strokeWidth={1} />
            <text x={PAD.left - 4} y={y(t) + 3} textAnchor="end" fontSize={9} className="fill-ink-faint">
              {t.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
            </text>
          </g>
        ))}
        <text x={PAD.left} y={H - 6} fontSize={9} className="fill-ink-faint">
          {curta(pontos[0].data)}
        </text>
        {pontos.length > 1 && (
          <text x={W - PAD.right} y={H - 6} textAnchor="end" fontSize={9} className="fill-ink-faint">
            {curta(pontos[pontos.length - 1].data)}
          </text>
        )}
        {pontos.length > 1 && <path d={caminho} fill="none" className="stroke-brand" strokeWidth={2} />}
        {pontos.map((p) => (
          <circle key={p.data} cx={x(p)} cy={y(p.valor)} r={3} className="fill-brand" />
        ))}
      </svg>
    </figure>
  );
}
