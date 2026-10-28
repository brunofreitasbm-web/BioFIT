"use client";

import { useEffect, useState } from "react";
import type { VistaCorpo } from "@/lib/body-paths";
import { corCalor } from "@/lib/cor";
import { grupoDaRegiao, intensidadePorGrupo, PARTES_INERTES } from "@/lib/mapaMuscular";
import { formatarSeries, type VolumeGrupo } from "@/lib/relatorio";
import type { GrupoMuscular } from "@/lib/tipos";

// Mapa do corpo (frente e costas) com cada grupo pintado pela escala de calor do relatório.
// Ideia e desenho vindos de openGym (frontend/src/components/BodyMap.jsx, AGPL-3.0); contornos
// do MuscleMap (MIT). A geometria (~45 KB) é carregada sob demanda e guardada no módulo.

type Corpo = { front: VistaCorpo; back: VistaCorpo };
let cache: Corpo | null = null;

function useCorpo(): Corpo | null {
  const [corpo, setCorpo] = useState<Corpo | null>(cache);
  useEffect(() => {
    if (cache) return;
    let vivo = true;
    import("@/lib/body-paths")
      .then((m) => {
        cache = m.default;
        if (vivo) setCorpo(cache);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);
  return corpo;
}

function Vista({
  vista,
  intensidade,
  series,
  rotulo,
}: {
  vista: VistaCorpo;
  intensidade: Map<GrupoMuscular, number>;
  series: Map<GrupoMuscular, number>;
  rotulo: string;
}) {
  return (
    <figure className="flex-1">
      <svg viewBox={vista.vb} className="h-auto w-full" role="img" aria-label={rotulo}>
        {Object.entries(vista.p).map(([parte, paths]) => {
          const grupo = grupoDaRegiao(parte);
          const n = grupo ? series.get(grupo) ?? 0 : 0;
          const fill = PARTES_INERTES.includes(parte)
            ? "rgb(var(--c-base-500))"
            : grupo && n > 0
              ? corCalor(intensidade.get(grupo) ?? 0)
              : "rgb(var(--c-base-600))";
          return paths.map((d, i) => (
            <path key={parte + i} d={d} fill={fill} stroke="rgb(var(--c-base-800))" strokeWidth={2}>
              {grupo && <title>{`${grupo}: ${formatarSeries(n)} séries`}</title>}
            </path>
          ));
        })}
      </svg>
      <figcaption className="mt-1 text-center text-xs text-ink-faint">{rotulo}</figcaption>
    </figure>
  );
}

export function MapaMuscular({ volumes }: { volumes: VolumeGrupo[] }) {
  const corpo = useCorpo();
  const series = new Map(volumes.map((v) => [v.grupo, v.seriesFeitas] as const));
  const intensidade = intensidadePorGrupo(Object.fromEntries(series));

  // Altura reservada enquanto a geometria carrega, para nada abaixo pular.
  if (!corpo) return <div className="aspect-[1454/1280] w-full" aria-hidden="true" />;

  return (
    <div>
      <div className="flex gap-2">
        <Vista vista={corpo.front} intensidade={intensidade} series={series} rotulo="Frente" />
        <Vista vista={corpo.back} intensidade={intensidade} series={series} rotulo="Costas" />
      </div>
      <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-ink-faint">
        menos
        {[0, 0.35, 0.6, 0.8, 1].map((t) => (
          <span key={t} className="h-2.5 w-4 rounded-sm" style={{ backgroundColor: corCalor(t) }} />
        ))}
        mais
      </div>
    </div>
  );
}
