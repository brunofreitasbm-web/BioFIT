import type { VolumeGrupo } from "@/lib/relatorio";
import type { GrupoMuscular } from "@/lib/tipos";
import { corCalor } from "@/lib/cor";

// Silhueta simplificada (frente + costas), com os segmentos encostados para ler como um
// corpo sólido em vez de blocos soltos. Tronco e core dividem a mesma região (o valor de
// cada grupo aparece completo na lista abaixo); cada região é tingida pela mesma escala de
// calor do Heatmap (frio->quente conforme % relativo ao grupo mais treinado), então o mapa
// e a lista de números sempre contam a mesma história.
//
// Cada músculo recebe um degradê radial (claro no centro, escuro na borda) para dar volume,
// mais uma textura de fibras (linhas finas) por cima, em blend "multiply", para lembrar
// estrias musculares em vez de blocos chapados.
const CINZA_NEUTRO = "#c7cbd3"; // antebraços/pés — não são grupo rastreado

function corDoGrupo(porGrupo: Record<string, VolumeGrupo>, maxSeries: number, grupo: GrupoMuscular): string {
  const v = porGrupo[grupo];
  if (!v || v.seriesFeitas === 0) return "#e2e4e9";
  return corCalor(v.seriesFeitas / maxSeries);
}

function parseCor(cor: string): [number, number, number] {
  if (cor.startsWith("#")) {
    const hex = cor.slice(1);
    const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
    const n = parseInt(full, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = cor.match(/[\d.]+/g) ?? ["0", "0", "0"];
  return [Number(m[0]), Number(m[1]), Number(m[2])];
}

function misturar(cor: string, alvo: [number, number, number], quantidade: number): string {
  const [r, g, b] = parseCor(cor);
  const rgb = [r, g, b].map((c, i) => Math.round(c + (alvo[i] - c) * quantidade));
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

const BRANCO: [number, number, number] = [255, 255, 255];
const PRETO: [number, number, number] = [0, 0, 0];

type GeomRect = { x: number; y: number; width: number; height: number; rx: number };
type GeomEllipse = { cx: number; cy: number; rx: number; ry: number };

function SegmentoRect({ geom, gradId, fibraId }: { geom: GeomRect; gradId: string; fibraId: string }) {
  return (
    <>
      <rect {...geom} fill={`url(#${gradId})`} />
      <rect {...geom} fill={`url(#${fibraId})`} style={{ mixBlendMode: "multiply" }} />
    </>
  );
}

function SegmentoEllipse({ geom, gradId, fibraId }: { geom: GeomEllipse; gradId: string; fibraId: string }) {
  return (
    <>
      <ellipse {...geom} fill={`url(#${gradId})`} />
      <ellipse {...geom} fill={`url(#${fibraId})`} style={{ mixBlendMode: "multiply" }} />
    </>
  );
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
  const cores = {
    ombros: cor("Deltoides"),
    panturrilha: cor("Panturrilha"),
    postura: cor("Postura"),
    tronco: cor(variante === "frente" ? "Peito" : "Costas"),
    pernaSuperior: cor(variante === "frente" ? "Quadríceps" : "Posterior"),
    bracoSuperior: cor(variante === "frente" ? "Bíceps" : "Tríceps"),
  };

  const gid = (chave: string) => `grad-${variante}-${chave}`;
  const fibrasId = `fibras-${variante}`;

  return (
    <svg
      viewBox="0 0 120 300"
      className="h-full w-full"
      role="img"
      aria-label={`Corpo (${variante})`}
      shapeRendering="geometricPrecision"
    >
      <defs>
        {Object.entries(cores).map(([chave, valor]) => (
          <radialGradient key={chave} id={gid(chave)} cx="32%" cy="22%" r="85%">
            <stop offset="0%" stopColor={misturar(valor, BRANCO, 0.4)} />
            <stop offset="55%" stopColor={valor} />
            <stop offset="100%" stopColor={misturar(valor, PRETO, 0.24)} />
          </radialGradient>
        ))}
        {/* estrias de fibra muscular: linhas finas alternando claro/escuro, quase verticais */}
        <pattern id={fibrasId} width="3.4" height="6" patternTransform="rotate(78)" patternUnits="userSpaceOnUse">
          <rect width="3.4" height="6" fill="transparent" />
          <line x1="0.8" y1="0" x2="0.8" y2="6" stroke="rgba(0,0,0,0.16)" strokeWidth="0.55" />
          <line x1="2.2" y1="0" x2="2.2" y2="6" stroke="rgba(255,255,255,0.14)" strokeWidth="0.4" />
        </pattern>
        <filter id={`sombra-${variante}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.2" stdDeviation="1.4" floodColor="#000" floodOpacity="0.28" />
        </filter>
      </defs>

      <g filter={`url(#sombra-${variante})`}>
        {/* pés */}
        <ellipse cx={38} cy={274} rx={10} ry={5} fill={CINZA_NEUTRO} />
        <ellipse cx={82} cy={274} rx={10} ry={5} fill={CINZA_NEUTRO} />
        {/* panturrilhas */}
        <SegmentoRect geom={{ x: 28, y: 220, width: 22, height: 58, rx: 11 }} gradId={gid("panturrilha")} fibraId={fibrasId} />
        <SegmentoRect geom={{ x: 70, y: 220, width: 22, height: 58, rx: 11 }} gradId={gid("panturrilha")} fibraId={fibrasId} />
        {/* coxas, encostadas no tronco (sem vão no quadril) */}
        <SegmentoRect geom={{ x: 26, y: 150, width: 30, height: 80, rx: 15 }} gradId={gid("pernaSuperior")} fibraId={fibrasId} />
        <SegmentoRect geom={{ x: 64, y: 150, width: 30, height: 80, rx: 15 }} gradId={gid("pernaSuperior")} fibraId={fibrasId} />
        {/* antebraços */}
        <rect x={3} y={116} width={18} height={60} rx={9} fill={CINZA_NEUTRO} />
        <rect x={99} y={116} width={18} height={60} rx={9} fill={CINZA_NEUTRO} />
        {/* braços (bíceps na frente, tríceps nas costas) */}
        <SegmentoRect geom={{ x: 2, y: 56, width: 22, height: 66, rx: 11 }} gradId={gid("bracoSuperior")} fibraId={fibrasId} />
        <SegmentoRect geom={{ x: 96, y: 56, width: 22, height: 66, rx: 11 }} gradId={gid("bracoSuperior")} fibraId={fibrasId} />
        {/* tronco: um único bloco contínuo até o quadril, sem quebra visual entre peito/core (ou costas) */}
        <SegmentoRect geom={{ x: 26, y: 56, width: 68, height: 102, rx: 18 }} gradId={gid("tronco")} fibraId={fibrasId} />
        {/* trapézio/postura, visível por trás do pescoço em ambas as vistas */}
        <SegmentoRect geom={{ x: 34, y: 40, width: 52, height: 26, rx: 13 }} gradId={gid("postura")} fibraId={fibrasId} />
        {/* ombros, por cima do tronco e do trapézio para fechar a silhueta */}
        <SegmentoEllipse geom={{ cx: 20, cy: 56, rx: 17, ry: 19 }} gradId={gid("ombros")} fibraId={fibrasId} />
        <SegmentoEllipse geom={{ cx: 100, cy: 56, rx: 17, ry: 19 }} gradId={gid("ombros")} fibraId={fibrasId} />
        {/* pescoço + cabeça */}
        <rect x={51} y={30} width={18} height={14} rx={5} fill={CINZA_NEUTRO} />
        <circle cx={60} cy={19} r={18} fill={CINZA_NEUTRO} />
      </g>
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
      <div className="flex items-center justify-center gap-6">
        <div className="h-72 w-36">
          <Corpo variante="frente" porGrupo={porGrupo} maxSeries={maxSeries} />
        </div>
        <div className="h-72 w-36">
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
