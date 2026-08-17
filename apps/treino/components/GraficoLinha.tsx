import { formatarDataBR } from "@/lib/bioimpedancia";
import { CHART_COLORS } from "@/lib/colors";

export interface PontoGrafico {
  data: string; // YYYY-MM-DD
  valor: number;
}

// Gráfico de linha simples, sem dependências externas — só o suficiente para ler a
// evolução de uma métrica (peso, % gordura, etc.) ao longo dos registros de bioimpedância.
export function GraficoLinha({
  titulo,
  pontos,
  unidade = "",
  decimais = 1,
  cor = CHART_COLORS.brand,
  corPositivaQuandoCai = false,
}: {
  titulo: string;
  pontos: PontoGrafico[];
  unidade?: string;
  decimais?: number;
  cor?: string;
  corPositivaQuandoCai?: boolean;
}) {
  if (pontos.length === 0) {
    return null;
  }

  const largura = 300;
  const altura = 110;
  const padX = 8;
  const padY = 18;

  const valores = pontos.map((p) => p.valor);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const span = max - min || 1;

  const coords = pontos.map((p, i) => {
    const x = pontos.length === 1 ? largura / 2 : padX + (i * (largura - 2 * padX)) / (pontos.length - 1);
    const y = padY + ((max - p.valor) / span) * (altura - 2 * padY);
    return { x, y, ...p };
  });

  const linha = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const primeiro = pontos[0];
  const ultimo = pontos[pontos.length - 1];
  const delta = ultimo.valor - primeiro.valor;
  const deltaBom = corPositivaQuandoCai ? delta <= 0 : delta >= 0;

  return (
    <div className="rounded-xl border border-line bg-base-800 p-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-ink-muted">{titulo}</span>
        <span className={`text-xs font-semibold ${deltaBom ? "text-accent" : "text-danger"}`}>
          {delta >= 0 ? "+" : ""}
          {delta.toFixed(decimais)}
          {unidade}
        </span>
      </div>
      <svg viewBox={`0 0 ${largura} ${altura}`} className="w-full">
        <polyline points={linha} fill="none" stroke={cor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={i === coords.length - 1 ? 3.5 : 2.5} fill={cor}>
            <title>
              {formatarDataBR(c.data)}: {c.valor.toFixed(decimais)}
              {unidade}
            </title>
          </circle>
        ))}
      </svg>
      <div className="flex items-center justify-between text-[10px] text-ink-faint">
        <span>
          {formatarDataBR(primeiro.data)} · {primeiro.valor.toFixed(decimais)}
          {unidade}
        </span>
        <span>
          {formatarDataBR(ultimo.data)} · {ultimo.valor.toFixed(decimais)}
          {unidade}
        </span>
      </div>
    </div>
  );
}
