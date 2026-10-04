"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Dumbbell, Trophy } from "lucide-react";
import { EstadoVazio } from "@/components/EstadoVazio";
import { ICON } from "@/lib/icones";
import { getExercicio } from "@/lib/exercicios";
import { historicoExercicio, recordesPessoais, type PontoHistorico, type RecordesPessoais } from "@/lib/relatorio";
import { GrupoBadge } from "@/components/GrupoBadge";

function formatarDataCurta(dataIso: string): string {
  const [, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}`;
}

function formatarKg(kg: number): string {
  return kg.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

// Datas em que o 1RM estimado superou todos os anteriores (a primeira sessão não conta).
function datasDePR(hist: PontoHistorico[]): Set<string> {
  const prs = new Set<string>();
  let melhor = -Infinity;
  hist.forEach((p, i) => {
    if (p.melhor1RM > melhor + 1e-9) {
      if (i > 0) prs.add(p.data);
      melhor = p.melhor1RM;
    }
  });
  return prs;
}

const W = 320;
const H = 170;
const PAD = { top: 12, right: 12, bottom: 22, left: 36 };

function GraficoEvolucao({ hist, prs }: { hist: PontoHistorico[]; prs: Set<string> }) {
  const valores = hist.flatMap((p) => [p.melhor1RM, p.cargaMaxKg]);
  let min = Math.min(...valores);
  let max = Math.max(...valores);
  if (max - min < 1) {
    min -= 1;
    max += 1;
  }
  const margem = (max - min) * 0.1;
  min = Math.max(0, min - margem);
  max += margem;

  const larguraUtil = W - PAD.left - PAD.right;
  const alturaUtil = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (hist.length === 1 ? larguraUtil / 2 : (i / (hist.length - 1)) * larguraUtil);
  const y = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * alturaUtil;
  const caminho = (sel: (p: PontoHistorico) => number) =>
    hist.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(sel(p)).toFixed(1)}`).join(" ");

  const ticks = [min, (min + max) / 2, max];

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Gráfico de evolução do 1RM estimado e da carga máxima">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="stroke-line" strokeWidth={1} />
            <text x={PAD.left - 4} y={y(t) + 3} textAnchor="end" fontSize={9} className="fill-ink-faint">
              {Math.round(t)}
            </text>
          </g>
        ))}
        <text x={PAD.left} y={H - 6} fontSize={9} className="fill-ink-faint">
          {formatarDataCurta(hist[0].data)}
        </text>
        {hist.length > 1 && (
          <text x={W - PAD.right} y={H - 6} textAnchor="end" fontSize={9} className="fill-ink-faint">
            {formatarDataCurta(hist[hist.length - 1].data)}
          </text>
        )}
        <path d={caminho((p) => p.cargaMaxKg)} fill="none" className="stroke-ink-faint" strokeWidth={1.5} strokeDasharray="4 3" />
        <path d={caminho((p) => p.melhor1RM)} fill="none" className="stroke-brand" strokeWidth={2} />
        {hist.map((p, i) =>
          prs.has(p.data) ? (
            <circle key={p.data} cx={x(i)} cy={y(p.melhor1RM)} r={4.5} className="fill-accent stroke-base-800" strokeWidth={1.5} />
          ) : (
            <circle key={p.data} cx={x(i)} cy={y(p.melhor1RM)} r={3} className="fill-brand" />
          ),
        )}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-brand" aria-hidden="true" /> 1RM estimado
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-4 border-t-2 border-dashed border-ink-faint" aria-hidden="true" /> Carga máxima
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" aria-hidden="true" /> Recorde
        </span>
      </figcaption>
    </figure>
  );
}

export default function ExercicioEvolucaoPage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);
  const exercicio = getExercicio(id);
  const [hist, setHist] = useState<PontoHistorico[] | null>(null);
  const [recordes, setRecordes] = useState<RecordesPessoais | null>(null);

  useEffect(() => {
    setHist(historicoExercicio(id));
    setRecordes(recordesPessoais(id));
  }, [id]);

  const prs = hist ? datasDePR(hist) : new Set<string>();

  return (
    <div className="p-4 space-y-5">
      <Link href="/relatorio/exercicios" className="inline-flex min-h-11 items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink">
        <ArrowLeft aria-hidden="true" size={ICON.sm} /> Exercícios
      </Link>

      <header className="space-y-1.5">
        <h1 className="text-xl font-semibold text-ink">{exercicio?.nome ?? "Exercício não encontrado"}</h1>
        {exercicio && <GrupoBadge grupo={exercicio.grupoMuscular} />}
      </header>

      {hist && hist.length === 0 && (
        <EstadoVazio Icone={Dumbbell} texto="Sem séries com carga e reps para este exercício." />
      )}

      {hist && hist.length > 0 && recordes && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-line bg-base-800 p-3 shadow-sm">
              <p className="text-[11px] text-ink-muted">Melhor 1RM estimado</p>
              <p className="text-lg font-bold text-ink">{formatarKg(recordes.melhor1RM!.kg)} kg</p>
              <p className="text-[11px] text-ink-faint">
                {formatarKg(recordes.melhor1RM!.cargaKg)} kg × {recordes.melhor1RM!.reps} · {formatarDataCurta(recordes.melhor1RM!.data)}
              </p>
            </div>
            <div className="rounded-xl border border-line bg-base-800 p-3 shadow-sm">
              <p className="text-[11px] text-ink-muted">Maior carga</p>
              <p className="text-lg font-bold text-ink">{formatarKg(recordes.cargaMax!.kg)} kg</p>
              <p className="text-[11px] text-ink-faint">{formatarDataCurta(recordes.cargaMax!.data)}</p>
            </div>
          </div>

          <section className="rounded-xl border border-line bg-base-800 p-4 shadow-sm">
            <GraficoEvolucao hist={hist} prs={prs} />
          </section>

          <section className="rounded-xl border border-line bg-base-800 p-4 shadow-sm">
            <h2 className="mb-2 text-base font-semibold text-ink">Sessões</h2>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-ink-faint">
                  <th className="py-1 font-medium">Data</th>
                  <th className="py-1 font-medium">Melhor série</th>
                  <th className="py-1 text-right font-medium">1RM est.</th>
                  <th className="py-1 text-right font-medium">Volume</th>
                </tr>
              </thead>
              <tbody>
                {[...hist].reverse().map((p) => (
                  <tr key={p.data} className="border-t border-line/60 text-ink">
                    <td className="py-1.5">{formatarDataCurta(p.data)}</td>
                    <td className="py-1.5">
                      {formatarKg(p.melhorSerie.cargaKg)} × {p.melhorSerie.reps}
                    </td>
                    <td className="py-1.5 text-right">
                      <span className="inline-flex items-center gap-1">
                        {prs.has(p.data) && <Trophy aria-label="Recorde" size={ICON.xs} className="text-accent" />}
                        {formatarKg(p.melhor1RM)}
                      </span>
                    </td>
                    <td className="py-1.5 text-right text-ink-muted">{Math.round(p.volumeKg)} kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
