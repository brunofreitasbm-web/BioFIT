import type { VolumeGrupo } from "@/lib/relatorio";
import type { GrupoMuscular } from "@/lib/tipos";
import { corCalor } from "@/lib/cor";

// Silhueta simplificada (frente + costas) com uma região por grupo muscular. Cada região
// é tingida pela mesma escala de calor do Heatmap (frio->quente conforme % relativo ao
// grupo mais treinado), então o mapa e a lista de números abaixo sempre contam a mesma história.
const CINZA_NEUTRO = "#c7cbd3"; // antebraços/pés — não são grupo rastreado

function corDoGrupo(porGrupo: Record<string, VolumeGrupo>, maxSeries: number, grupo: GrupoMuscular): string {
  const v = porGrupo[grupo];
  if (!v || v.seriesFeitas === 0) return "#e2e4e9";
  return corCalor(v.seriesFeitas / maxSeries);
}

function Corpo({
  variante,
  porGrupo,
  maxSeries,
}: {
  variante: "frente" | "costas";
  porGrupo: Record<string, VolumeGrupo>;
  maxSeries: number;
}) {
  const cor = (g: GrupoMuscular) => corDoGrupo(porGrupo, maxSeries, g);
  const ombros = cor("Deltoides");
  const panturrilha = cor("Panturrilha");

  return (
    <svg viewBox="0 0 120 280" className="h-full w-full" role="img" aria-label={`Corpo (${variante})`}>
      {/* pés */}
      <ellipse cx={40} cy={274} rx={9} ry={5} fill={CINZA_NEUTRO} />
      <ellipse cx={80} cy={274} rx={9} ry={5} fill={CINZA_NEUTRO} />
      {/* panturrilhas */}
      <rect x={31} y={206} width={20} height={62} rx={10} fill={panturrilha} />
      <rect x={69} y={206} width={20} height={62} rx={10} fill={panturrilha} />
      {/* coxas */}
      <rect x={30} y={134} width={26} height={74} rx={13} fill={cor(variante === "frente" ? "Quadríceps" : "Posterior")} />
      <rect x={64} y={134} width={26} height={74} rx={13} fill={cor(variante === "frente" ? "Quadríceps" : "Posterior")} />
      {/* antebraços */}
      <rect x={6} y={122} width={16} height={56} rx={8} fill={CINZA_NEUTRO} />
      <rect x={98} y={122} width={16} height={56} rx={8} fill={CINZA_NEUTRO} />
      {/* braços (bíceps na frente, tríceps nas costas) */}
      <rect x={7} y={62} width={19} height={62} rx={9.5} fill={cor(variante === "frente" ? "Bíceps" : "Tríceps")} />
      <rect x={94} y={62} width={19} height={62} rx={9.5} fill={cor(variante === "frente" ? "Bíceps" : "Tríceps")} />
      {/* tronco: costas mostra trapézio (Postura) em cima de costas (Costas); frente mostra peito em cima do core */}
      {variante === "frente" ? (
        <>
          <rect x={38} y={126} width={44} height={44} rx={10} fill={cor("Core")} />
          <rect x={28} y={44} width={64} height={44} rx={16} fill={cor("Peito")} />
        </>
      ) : (
        <>
          <rect x={28} y={66} width={64} height={70} rx={16} fill={cor("Costas")} />
          <rect x={32} y={44} width={56} height={22} rx={10} fill={cor("Postura")} />
        </>
      )}
      {/* ombros */}
      <ellipse cx={22} cy={54} rx={15} ry={17} fill={ombros} />
      <ellipse cx={98} cy={54} rx={15} ry={17} fill={ombros} />
      {/* pescoço + cabeça */}
      <rect x={52} y={34} width={16} height={12} rx={4} fill={CINZA_NEUTRO} />
      <circle cx={60} cy={20} r={17} fill={CINZA_NEUTRO} />
      <text x={60} y={295} textAnchor="middle" className="fill-ink-faint text-[10px]">
        {variante === "frente" ? "Frente" : "Costas"}
      </text>
    </svg>
  );
}

export function MuscleMap({ volumes }: { volumes: VolumeGrupo[] }) {
  const semDados = volumes.every((v) => v.seriesFeitas === 0);

  if (semDados) {
    return (
      <div className="rounded-xl border border-line bg-base-800 p-6 text-center text-sm text-ink-muted">
        Ainda não há séries registradas neste período. Marque suas séries na aba <strong className="text-ink">Hoje</strong> para
        o mapa muscular aparecer aqui.
      </div>
    );
  }

  const porGrupo = Object.fromEntries(volumes.map((v) => [v.grupo, v])) as Record<string, VolumeGrupo>;
  const maxSeries = Math.max(1, ...volumes.map((v) => v.seriesFeitas));
  const ordenados = [...volumes].sort((a, b) => b.seriesFeitas - a.seriesFeitas);

  return (
    <div className="rounded-xl border border-line bg-base-800 p-4">
      <div className="flex items-center justify-center gap-4">
        <div className="h-64 w-32">
          <Corpo variante="frente" porGrupo={porGrupo} maxSeries={maxSeries} />
        </div>
        <div className="h-64 w-32">
          <Corpo variante="costas" porGrupo={porGrupo} maxSeries={maxSeries} />
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-ink-faint">Cor mais viva = mais volume relativo no período</p>
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-line pt-3 text-xs">
        {ordenados.map((v) => (
          <div key={v.grupo} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-ink-muted">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: v.seriesFeitas > 0 ? corCalor(v.seriesFeitas / maxSeries) : "#e2e4e9" }}
              />
              {v.grupo}
            </span>
            <span className="shrink-0 text-ink-faint">
              {v.pct.toFixed(0)}% · {v.seriesFeitas}sr
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
