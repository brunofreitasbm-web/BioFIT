"use client";

import { useEffect, useRef, useState } from "react";
import { getLog } from "@/lib/storage";
import { gradeAnual, seriesPorDia, type DiaHeatmap } from "@/lib/heatmapAnual";
import { cn } from "@/lib/cn";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const DIAS = ["seg", "", "qua", "", "sex", "", ""];

// Opacidade do accent por nível (0 = trilho vazio).
const NIVEL_CLASSE = ["bg-base-600", "bg-accent/30", "bg-accent/55", "bg-accent/80", "bg-accent"];

function formatarDataBR(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

export function HeatmapAnual() {
  const [colunas, setColunas] = useState<DiaHeatmap[][] | null>(null);
  const [diasTreinados, setDiasTreinados] = useState(0);
  const rolagemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const porDia = seriesPorDia(getLog());
    const grade = gradeAnual(porDia);
    setColunas(grade);
    setDiasTreinados(grade.flat().filter((d) => d.series > 0).length);
  }, []);

  // Começa rolado para a semana atual (a grade é mais larga que a tela do celular).
  useEffect(() => {
    if (rolagemRef.current) rolagemRef.current.scrollLeft = rolagemRef.current.scrollWidth;
  }, [colunas]);

  if (!colunas) return null;

  return (
    <div>
      <div ref={rolagemRef} className="overflow-x-auto pb-1">
        <div className="inline-flex gap-1">
          <div className="mt-4 grid grid-rows-7 gap-[3px] pr-1 text-[11px] leading-[11px] text-ink-faint">
            {DIAS.map((d, i) => (
              <span key={i} className="h-[11px]">
                {d}
              </span>
            ))}
          </div>
          {colunas.map((col, w) => {
            const primeiro = col[0].data;
            const dia = Number(primeiro.slice(8));
            const mostrarMes = dia <= 7 && w < colunas.length - 1;
            return (
              <div key={primeiro} className="flex flex-col gap-[3px]">
                <span className="h-[13px] whitespace-nowrap text-[11px] leading-[13px] text-ink-faint">
                  {mostrarMes ? MESES[Number(primeiro.slice(5, 7)) - 1] : ""}
                </span>
                {col.map((d) => (
                  <span
                    key={d.data}
                    title={`${formatarDataBR(d.data)} · ${d.series} ${d.series === 1 ? "série" : "séries"}`}
                    className={cn("h-[11px] w-[11px] rounded-[2px]", d.futuro ? "opacity-0" : NIVEL_CLASSE[d.nivel])}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-ink-faint">
        <span>
          {diasTreinados} {diasTreinados === 1 ? "dia treinado" : "dias treinados"} em 12 meses
        </span>
        <span className="flex items-center gap-1">
          menos
          {NIVEL_CLASSE.map((c) => (
            <span key={c} className={cn("h-[11px] w-[11px] rounded-[2px]", c)} />
          ))}
          mais
        </span>
      </div>
    </div>
  );
}
