import type { VolumeGrupo } from "@/lib/relatorio";

// Escala de calor: azul frio (pouco trabalhado) -> amarelo -> vermelho quente (muito trabalhado)
function corCalor(intensidade: number): string {
  const t = Math.max(0, Math.min(1, intensidade));
  const stops: [number, [number, number, number]][] = [
    [0, [42, 58, 107]], // brand.soft (frio)
    [0.35, [79, 155, 255]], // azul
    [0.6, [255, 207, 92]], // amarelo
    [0.8, [255, 138, 92]], // laranja
    [1, [255, 93, 108]], // vermelho (danger)
  ];
  let lo = stops[0];
  let hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i][0] && t <= stops[i + 1][0]) {
      lo = stops[i];
      hi = stops[i + 1];
      break;
    }
  }
  const span = hi[0] - lo[0] || 1;
  const localT = (t - lo[0]) / span;
  const rgb = lo[1].map((c, i) => Math.round(c + (hi[1][i] - c) * localT));
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

export function Heatmap({ volumes }: { volumes: VolumeGrupo[] }) {
  const max = Math.max(1, ...volumes.map((v) => v.seriesFeitas));
  const semDados = volumes.every((v) => v.seriesFeitas === 0);

  if (semDados) {
    return (
      <div className="rounded-xl border border-line bg-base-800 p-6 text-center text-sm text-ink-muted">
        Ainda não há séries registradas neste período. Marque suas séries na aba <strong className="text-ink">Hoje</strong> para
        o mapa de calor aparecer aqui.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {volumes.map((v) => {
        const intensidade = v.seriesFeitas / max;
        const cor = corCalor(intensidade);
        return (
          <div key={v.grupo} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-sm text-ink-muted">{v.grupo}</span>
            <div className="h-8 flex-1 overflow-hidden rounded-lg bg-base-700">
              <div
                className="flex h-full items-center justify-end rounded-lg px-2 text-xs font-semibold text-base-950 transition-all"
                style={{ width: `${Math.max(6, v.pct)}%`, backgroundColor: cor }}
              >
                {v.pct >= 8 && `${v.pct.toFixed(0)}%`}
              </div>
            </div>
            <span className="w-16 shrink-0 text-right text-xs text-ink-faint">
              {v.pct.toFixed(0)}% · {v.seriesFeitas}sr
            </span>
          </div>
        );
      })}
    </div>
  );
}
