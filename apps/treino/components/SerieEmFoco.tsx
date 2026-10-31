"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Check, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { ICON, STROKE } from "@/lib/icones";
import { ajustar } from "@/lib/serieEmFoco";
import type { SerieRegistrada } from "@/lib/tipos";

const RIRS = [3, 2, 1, 0];

export interface SerieEmFocoProps {
  nome: string;
  posicao: string; // ex.: "A2"
  descricao: string; // grupo, séries × reps, descanso, RIR alvo
  totalSeries: number;
  serieNumero: number | null; // null = exercício completo
  series: SerieRegistrada[];
  kgInicial: string;
  repsInicial: string;
  unidadeReps: string;
  cargaOpcional: boolean;
  ultimaResumo: string | null;
  sugestaoTexto: string | null;
  onConfirmar: (serieNumero: number, kg: string, reps: string, rir: number | null) => void;
  onFechar: () => void;
}

const formatarKg = (kg: number) => String(kg).replace(".", ",");

// Tela cheia para registrar uma série por vez. O pai remonta o componente (key) a cada série
// confirmada, então o estado local sempre começa nos valores iniciais da série da vez.
export function SerieEmFoco({
  nome,
  posicao,
  descricao,
  totalSeries,
  serieNumero,
  series,
  kgInicial,
  repsInicial,
  unidadeReps,
  cargaOpcional,
  ultimaResumo,
  sugestaoTexto,
  onConfirmar,
  onFechar,
}: SerieEmFocoProps) {
  const [kg, setKg] = useState(kgInicial);
  const [reps, setReps] = useState(repsInicial);
  const [rir, setRir] = useState<number | null>(null);

  // Esconde as abas de navegação enquanto a tela está aberta (ver globals.css).
  useEffect(() => {
    document.body.dataset.foco = "1";
    return () => {
      delete document.body.dataset.foco;
    };
  }, []);

  const repsNum = Number(reps);
  const kgNum = Number(kg);
  const repsOk = reps.trim() !== "" && !Number.isNaN(repsNum) && repsNum > 0;
  const kgOk = kg.trim() === "" ? cargaOpcional : !Number.isNaN(kgNum) && (cargaOpcional ? kgNum >= 0 : kgNum > 0);
  const valido = repsOk && kgOk;
  const feitas = series.filter((s) => s.cargaKg !== null || s.reps !== null).sort((a, b) => a.serieNumero - b.serieNumero);

  const botaoPasso =
    "toque flex shrink-0 items-center justify-center rounded-xl border-2 border-brand bg-base-900 text-brand disabled:opacity-40";

  return (
    <div role="dialog" aria-modal="true" aria-label={`Registrar série de ${nome}`} className="fixed inset-0 z-[15] overflow-y-auto bg-base-900">
      <div className="mx-auto flex min-h-full max-w-xl flex-col gap-5 p-5 pb-28">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onFechar}
            aria-label="Voltar à lista"
            className="toque flex h-12 w-12 items-center justify-center rounded-xl border border-line/60 bg-base-800 text-ink"
          >
            <ArrowLeft aria-hidden="true" size={ICON.md} strokeWidth={STROKE.forte} />
          </button>
          <span className="font-mono text-sm text-ink-muted">{posicao}</span>
        </div>

        <div>
          <h2 className="text-3xl font-bold leading-tight text-ink">{nome}</h2>
          <p className="mt-1.5 text-base text-ink-muted">{descricao}</p>
        </div>

        <div className="flex gap-2" role="img" aria-label={`${feitas.length} de ${totalSeries} séries feitas`}>
          {Array.from({ length: totalSeries }, (_, i) => i + 1).map((n) => {
            const feita = feitas.some((s) => s.serieNumero === n);
            return (
              <span
                key={n}
                className={cn(
                  "h-2.5 flex-1 rounded-full border-2",
                  feita ? "border-brand bg-brand" : n === serieNumero ? "border-brand bg-base-900" : "border-base-500 bg-base-600",
                )}
              />
            );
          })}
        </div>

        {serieNumero === null ? (
          <div className="rounded-2xl border border-accent/40 bg-accent-soft p-5 text-center">
            <p className="text-xl font-bold text-accent">Exercício completo</p>
            <p className="mt-1 text-sm text-ink-muted">Todas as {totalSeries} séries registradas.</p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-line/60 bg-base-800 p-4">
              <p className="mb-2 text-[15px] font-semibold text-ink-muted">Carga</p>
              <div className="flex items-center justify-between gap-2">
                <button type="button" aria-label="Diminuir 2,5 quilos" onClick={() => setKg(ajustar(kg, -2.5))} className={cn(botaoPasso, "h-16 w-16")}>
                  <Minus aria-hidden="true" size={ICON.lg} strokeWidth={STROKE.forte} />
                </button>
                <div className="flex min-w-0 items-baseline gap-1.5">
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="999"
                    step="0.5"
                    value={kg}
                    placeholder={cargaOpcional ? "—" : "0"}
                    aria-label="Carga em quilos"
                    onChange={(e) => setKg(e.target.value)}
                    className="w-32 min-w-0 bg-transparent text-center font-mono text-[64px] font-semibold leading-none tracking-tighter text-ink placeholder:text-ink-faint"
                  />
                  <span className="text-xl font-medium text-ink-muted">kg</span>
                </div>
                <button type="button" aria-label="Aumentar 2,5 quilos" onClick={() => setKg(ajustar(kg, 2.5))} className={cn(botaoPasso, "h-16 w-16")}>
                  <Plus aria-hidden="true" size={ICON.lg} strokeWidth={STROKE.forte} />
                </button>
              </div>
              {(ultimaResumo || sugestaoTexto) && (
                <p className="mt-3 border-t border-line/40 pt-2 font-mono text-sm text-ink-muted">{ultimaResumo ?? sugestaoTexto}</p>
              )}
            </div>

            <div className="grid gap-3">
              <div className="rounded-2xl border border-line/60 bg-base-800 p-3.5">
                <p className="mb-2 text-[15px] font-semibold text-ink-muted">{unidadeReps === "Seg" ? "Segundos" : "Repetições"}</p>
                <div className="flex items-center justify-between gap-2">
                  <button type="button" aria-label="Menos uma" onClick={() => setReps(ajustar(reps, -1))} className={cn(botaoPasso, "h-14 w-14")}>
                    <Minus aria-hidden="true" size={ICON.md} strokeWidth={STROKE.forte} />
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="999"
                    step="1"
                    value={reps}
                    placeholder="0"
                    aria-label={unidadeReps === "Seg" ? "Segundos" : "Repetições"}
                    onChange={(e) => setReps(e.target.value)}
                    className="w-24 min-w-0 bg-transparent text-center font-mono text-[44px] font-semibold leading-none text-ink placeholder:text-ink-faint"
                  />
                  <button type="button" aria-label="Mais uma" onClick={() => setReps(ajustar(reps, 1))} className={cn(botaoPasso, "h-14 w-14")}>
                    <Plus aria-hidden="true" size={ICON.md} strokeWidth={STROKE.forte} />
                  </button>
                </div>
              </div>
              <div className="rounded-2xl border border-line/60 bg-base-800 p-3.5">
                <p className="mb-2 text-[15px] font-semibold text-ink-muted">Reps na reserva</p>
                <div className="flex gap-1.5" role="group" aria-label="Repetições na reserva">
                  {RIRS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      aria-pressed={rir === v}
                      onClick={() => setRir(rir === v ? null : v)}
                      className={cn(
                        "toque h-14 flex-1 rounded-xl border-2 font-mono text-xl font-semibold",
                        rir === v ? "border-brand bg-brand text-on-solid" : "border-line bg-base-900 text-ink",
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {feitas.length > 0 && (
          <div>
            <p className="mb-2 text-[15px] font-semibold text-ink">Hoje neste exercício</p>
            <ul className="space-y-1.5 font-mono text-base">
              {feitas.map((s) => (
                <li key={s.serieNumero} className="flex justify-between rounded-lg bg-accent-soft px-3 py-2.5">
                  <span>S{s.serieNumero}</span>
                  <span className="font-semibold">
                    {s.cargaKg !== null ? `${formatarKg(s.cargaKg)} kg` : "sem carga"}
                    {s.reps !== null ? ` × ${s.reps}` : ""}
                    {s.rir != null ? ` · RIR ${s.rir}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-[16] border-t border-line/60 bg-base-900 px-5 pb-5 pt-3">
        <div className="mx-auto max-w-xl">
          {serieNumero === null ? (
            <button type="button" onClick={onFechar} className="toque h-16 w-full rounded-2xl bg-brand text-xl font-bold text-on-solid">
              Voltar à lista
            </button>
          ) : (
            <button
              type="button"
              disabled={!valido}
              onClick={() => valido && onConfirmar(serieNumero, kg, reps, rir)}
              className="toque flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-brand text-xl font-bold text-on-solid disabled:opacity-40"
            >
              <Check aria-hidden="true" size={ICON.lg} strokeWidth={STROKE.forte} />
              Registrar série {serieNumero}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
