"use client";

import { useEffect, useState } from "react";
import { calcularVolumePorGrupo, totalSeriesNoPeriodo, type VolumeGrupo } from "@/lib/relatorio";
import { Heatmap } from "@/components/Heatmap";
import { cn } from "@/lib/cn";

const PERIODOS: { label: string; valor: number | "tudo" }[] = [
  { label: "7 dias", valor: 7 },
  { label: "30 dias", valor: 30 },
  { label: "Tudo", valor: "tudo" },
];

export default function RelatorioPage() {
  const [periodo, setPeriodo] = useState<number | "tudo">(7);
  const [volumes, setVolumes] = useState<VolumeGrupo[] | null>(null);

  useEffect(() => {
    setVolumes(calcularVolumePorGrupo(periodo));
  }, [periodo]);

  return (
    <div className="p-4">
      <header className="mb-4">
        <h1 className="text-xl font-semibold">Relatório de volume</h1>
        <p className="text-sm text-ink-muted">% de séries trabalhadas por grupo muscular</p>
      </header>

      <div className="mb-4 flex gap-2">
        {PERIODOS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => setPeriodo(p.valor)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium",
              periodo === p.valor ? "border-brand bg-brand text-white" : "border-line bg-base-800 text-ink-muted",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {volumes && (
        <>
          <Heatmap volumes={volumes} />
          <p className="mt-4 text-center text-xs text-ink-faint">Total: {totalSeriesNoPeriodo(volumes)} séries registradas no período</p>
        </>
      )}
    </div>
  );
}
