"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, Dumbbell, TrendingDown, TrendingUp } from "lucide-react";
import { EstadoVazio } from "@/components/EstadoVazio";
import { ICON } from "@/lib/icones";
import { resumoExercicios, type ResumoExercicio } from "@/lib/relatorio";
import { GrupoBadge } from "@/components/GrupoBadge";
import { RelatorioTabs } from "@/components/RelatorioTabs";
import { cn } from "@/lib/cn";

function formatarDataBR(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatarKg(kg: number): string {
  return kg.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

export default function ExerciciosPage() {
  const [lista, setLista] = useState<ResumoExercicio[] | null>(null);

  useEffect(() => {
    setLista(resumoExercicios());
  }, []);

  return (
    <div className="p-4 space-y-6">
      <header className="mb-2 space-y-2">
        <h1 className="font-display text-[2rem] font-bold uppercase leading-none tracking-tight text-ink">Evolução por Exercício</h1>
        <p className="text-sm text-ink-muted">1RM estimado (Epley) e recordes de cada exercício que você já registrou</p>
        <RelatorioTabs ativa="/relatorio/exercicios" />
      </header>

      {lista && lista.length === 0 && (
        <EstadoVazio Icone={Dumbbell} texto="Nenhuma série com carga e reps registrada ainda." />
      )}

      {lista && lista.length > 0 && (
        <ul className="space-y-2">
          {lista.map((ex) => (
            <li key={ex.exercicioId}>
              <Link
                href={`/relatorio/exercicios/${ex.exercicioId}`}
                className="flex items-center gap-3 rounded-xl border border-line bg-base-800 p-3 shadow-sm hover:border-brand/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{ex.nome}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <GrupoBadge grupo={ex.grupo} />
                    <span className="text-[11px] text-ink-muted">
                      {ex.sessoes} {ex.sessoes === 1 ? "sessão" : "sessões"} · última {formatarDataBR(ex.ultimaData)}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-ink">{formatarKg(ex.recorde1RM)} kg</p>
                  {ex.variacao1RM !== null && (
                    <p
                      className={cn(
                        "inline-flex items-center gap-0.5 text-[11px] font-medium",
                        ex.variacao1RM >= 0 ? "text-accent" : "text-danger",
                      )}
                    >
                      {ex.variacao1RM >= 0 ? (
                        <TrendingUp aria-hidden="true" size={ICON.xs} />
                      ) : (
                        <TrendingDown aria-hidden="true" size={ICON.xs} />
                      )}
                      {ex.variacao1RM >= 0 ? "+" : ""}
                      {ex.variacao1RM.toFixed(0)}%
                    </p>
                  )}
                </div>
                <ChevronRight aria-hidden="true" size={ICON.sm} className="shrink-0 text-ink-faint" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
