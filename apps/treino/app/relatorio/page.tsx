"use client";

import { useEffect, useState } from "react";
import { calcularVolumePorGrupo, totalSeriesNoPeriodo, type VolumeGrupo } from "@/lib/relatorio";
import { getTodosBikeIndoor } from "@/lib/storage";
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
  const [totalMinutosBike, setTotalMinutosBike] = useState<number>(0);
  const [sessoesBikeCount, setSessoesBikeCount] = useState<number>(0);

  useEffect(() => {
    setVolumes(calcularVolumePorGrupo(periodo));

    const bikeData = getTodosBikeIndoor();
    const agora = new Date();
    let minSum = 0;
    let count = 0;

    Object.values(bikeData).forEach((item) => {
      if (!item.concluido) return;
      if (periodo !== "tudo") {
        const itemData = new Date(item.data + "T00:00:00");
        const diffDias = (agora.getTime() - itemData.getTime()) / (1000 * 3600 * 24);
        if (diffDias > periodo) return;
      }
      minSum += item.tempoMinutos;
      count += 1;
    });

    setTotalMinutosBike(minSum);
    setSessoesBikeCount(count);
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

      <div className="mb-4 rounded-xl border border-line bg-base-800 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-xl">
            🚴‍♂️
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink">Bike Indoor (Cardio)</h3>
            <p className="text-xs text-ink-muted">
              {sessoesBikeCount > 0
                ? `${sessoesBikeCount} sessão(ões) · Total de ${totalMinutosBike} min`
                : "Nenhuma sessão registrada no período"}
            </p>
          </div>
        </div>
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

