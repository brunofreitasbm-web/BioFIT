import type { VolumeGrupo } from "@/lib/relatorio";
import type { GrupoMuscular } from "@/lib/tipos";
import { corCalor } from "@/lib/cor";

// Silhueta simplificada (frente + costas), com os segmentos encostados para ler como um
// corpo sólido em vez de blocos soltos. Tronco e core dividem a mesma região (o valor de
// cada grupo aparece completo na lista abaixo); cada região é tingida pela mesma escala de
// calor do Heatmap (frio->quente conforme % relativo ao grupo mais treinado), então o mapa
// e a lista de números sempre contam a mesma história.
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
  const postura = cor("Postura");
  const tronco = cor(variante === "frente" ? "Peito" : "Costas");
  const pernaSuperior = cor(variante === "frente" ? "Quadríceps" : "Posterior");
  const bracoSuperior = cor(variante === "frente" ? "Bíceps" : "Tríceps");

  // Segmentos encostados uns nos outros (sem vãos de fundo entre eles), para o corpo ler
  // como uma silhueta sólida e definida em vez de blocos soltos.
  return (
    <svg viewBox="0 0 120 280" className="h-full w-full" role="img" aria-label={`Corpo (${variante})`}>
      {/* pés */}
      <ellipse cx={38} cy={274} rx={10} ry={5} fill={CINZA_NEUTRO} />
      <ellipse cx={82} cy={274} rx={10} ry={5} fill={CINZA_NEUTRO} />
      {/* panturrilhas */}
      <rect x={28} y={220} width={22} height={58} rx={11} fill={panturrilha} />
      <rect x={70} y={220} width={22} height={58} rx={11} fill={panturrilha} />
      {/* coxas, encostadas no tronco (sem vão no quadril) */}
      <rect x={26} y={150} width={30} height={80} rx={15} fill={pernaSuperior} />
      <rect x={64} y={150} width={30} height={80} rx={15} fill={pernaSuperior} />
      {/* antebraços */}
      <rect x={3} y={116} width={18} height={60} rx={9} fill={CINZA_NEUTRO} />
      <rect x={99} y={116} width={18} height={60} rx={9} fill={CINZA_NEUTRO} />
      {/* braços (bíceps na frente, tríceps nas costas) */}
      <rect x={2} y={56} width={22} height={66} rx={11} fill={bracoSuperior} />
      <rect x={96} y={56} width={22} height={66} rx={11} fill={bracoSuperior} />
      {/* tronco: um único bloco contínuo até o quadril, sem quebra visual entre peito/core (ou costas) */}
      <rect x={26} y={56} width={68} height={102} rx={18} fill={tronco} />
      {/* trapézio/postura, visível por trás do pescoço em ambas as vistas */}
      <rect x={34} y={40} width={52} height={26} rx={13} fill={postura} />
      {/* ombros, por cima do tronco e do trapézio para fechar a silhueta */}
      <ellipse cx={20} cy={56} rx={17} ry={19} fill={ombros} />
      <ellipse cx={100} cy={56} rx={17} ry={19} fill={ombros} />
      {/* pescoço + cabeça */}
      <rect x={51} y={30} width={18} height={14} rx={5} fill={CINZA_NEUTRO} />
      <circle cx={60} cy={19} r={18} fill={CINZA_NEUTRO} />
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
