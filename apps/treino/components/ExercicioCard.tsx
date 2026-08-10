"use client";

import { useEffect, useState } from "react";
import type { Exercicio, SerieRegistrada } from "@/lib/tipos";
import { GrupoBadge } from "./GrupoBadge";
import { VideoModal } from "./VideoModal";
import { SeletorExercicio } from "./SeletorExercicio";
import {
  getSubstituicao,
  removerSubstituicao,
  seriesDoExercicioNaData,
  setSubstituicao,
  ultimaExecucao,
  upsertSerie,
} from "@/lib/storage";
import { getExercicio } from "@/lib/exercicios";

function FallbackIcon({ grupo }: { grupo: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-base-700 text-2xl">
      <span aria-hidden>💪</span>
      <span className="sr-only">{grupo}</span>
    </div>
  );
}

// `exercicio` é o exercício planejado (o "slot" do dia). Se houver troca salva para hoje,
// tudo que é exibido/registrado usa o exercício efetivo (substituto); a troca em si sempre
// se refere ao slot original, para a lista de alternativas não ficar deriva.
export function ExercicioCard({ exercicio, data }: { exercicio: Exercicio; data: string }) {
  const [aberto, setAberto] = useState(false);
  const [series, setSeries] = useState<SerieRegistrada[]>([]);
  const [ultima, setUltima] = useState<SerieRegistrada[]>([]);
  const [imgOk, setImgOk] = useState(true);
  const [videoAberto, setVideoAberto] = useState(false);
  const [trocaAberta, setTrocaAberta] = useState(false);
  const [substitutoId, setSubstitutoId] = useState<string | null>(null);

  useEffect(() => {
    setSubstitutoId(getSubstituicao(data, exercicio.id));
  }, [exercicio.id, data]);

  const efetivo = (substitutoId && getExercicio(substitutoId)) || exercicio;

  useEffect(() => {
    setSeries(seriesDoExercicioNaData(efetivo.id, data));
    setUltima(ultimaExecucao(efetivo.id, data));
  }, [efetivo.id, data]);

  const feitas = series.filter((s) => s.cargaKg !== null || s.reps !== null).length;
  const completo = feitas >= efetivo.series;

  function registrar(serieNumero: number, campo: "cargaKg" | "reps", valor: string) {
    const num = valor === "" ? null : Number(valor);
    const atual = series.find((s) => s.serieNumero === serieNumero);
    const entry: SerieRegistrada = {
      exercicioId: efetivo.id,
      data,
      serieNumero,
      cargaKg: atual?.cargaKg ?? null,
      reps: atual?.reps ?? null,
      registradoEm: new Date().toISOString(),
      [campo]: num,
    } as SerieRegistrada;
    upsertSerie(entry);
    setSeries(seriesDoExercicioNaData(efetivo.id, data));
  }

  function trocarPara(novoId: string | null) {
    if (novoId) setSubstituicao(data, exercicio.id, novoId);
    else removerSubstituicao(data, exercicio.id);
    setSubstitutoId(novoId);
    setTrocaAberta(false);
  }

  const ultimaResumo =
    ultima.length > 0
      ? `Última vez: ${ultima.map((s) => (s.cargaKg != null ? `${s.cargaKg}kg${s.reps != null ? `×${s.reps}` : ""}` : null)).filter(Boolean).join(", ")}`
      : null;

  return (
    <div className="rounded-xl border border-line bg-base-800 shadow-panel">
      <div className="flex w-full items-center gap-3 p-3 text-left">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (efetivo.youtubeId) setVideoAberto(true);
          }}
          className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-line bg-base-700"
          aria-label={efetivo.youtubeId ? `Ver vídeo de ${efetivo.nome}` : efetivo.nome}
        >
          {efetivo.youtubeId && imgOk ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://img.youtube.com/vi/${efetivo.youtubeId}/mqdefault.jpg`}
                alt={efetivo.nome}
                className="h-full w-full object-cover"
                onError={() => setImgOk(false)}
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[10px] text-ink">▶</span>
              </span>
            </>
          ) : (
            <FallbackIcon grupo={efetivo.grupoMuscular} />
          )}
        </button>

        <button type="button" onClick={() => setAberto((v) => !v)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium">{efetivo.nome}</span>
              {completo && <span className="text-accent">✓</span>}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <GrupoBadge grupo={efetivo.grupoMuscular} />
              <span className="text-[11px] text-ink-muted">
                {efetivo.series}×{efetivo.reps} · desc. {efetivo.descanso}
              </span>
              {substitutoId && <span className="text-[11px] text-brand">trocado</span>}
            </div>
          </div>
          <span className="text-ink-faint">{aberto ? "▲" : "▼"}</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setTrocaAberta(true);
          }}
          className="shrink-0 self-start rounded-full border border-line bg-base-700 px-2 py-1 text-[11px] text-ink-muted"
          aria-label={`Mudar exercício: ${exercicio.nome}`}
        >
          🔄 Mudar
        </button>
      </div>

      {aberto && (
        <div className="border-t border-line p-3 pt-2">
          {efetivo.cadencia && <p className="mb-1 text-[11px] text-ink-muted">Cadência: {efetivo.cadencia}</p>}
          <p className="mb-3 text-sm text-ink-muted">{efetivo.notas}</p>
          {ultimaResumo && <p className="mb-2 text-[11px] text-brand">{ultimaResumo}</p>}

          <div className="grid grid-cols-[auto_1fr_1fr] items-center gap-x-2 gap-y-1.5 text-xs">
            <span className="text-ink-faint">Série</span>
            <span className="text-ink-faint">Carga (kg)</span>
            <span className="text-ink-faint">Reps</span>
            {Array.from({ length: efetivo.series }, (_, i) => i + 1).map((n) => {
              const s = series.find((x) => x.serieNumero === n);
              return (
                <FragmentoLinha
                  key={n}
                  n={n}
                  s={s}
                  onChange={(campo, valor) => registrar(n, campo, valor)}
                />
              );
            })}
          </div>
        </div>
      )}

      {videoAberto && efetivo.youtubeId && (
        <VideoModal youtubeId={efetivo.youtubeId} titulo={efetivo.nome} onClose={() => setVideoAberto(false)} />
      )}

      {trocaAberta && (
        <SeletorExercicio
          original={exercicio}
          substitutoAtualId={substitutoId}
          onEscolher={trocarPara}
          onFechar={() => setTrocaAberta(false)}
        />
      )}
    </div>
  );
}

function FragmentoLinha({
  n,
  s,
  onChange,
}: {
  n: number;
  s: SerieRegistrada | undefined;
  onChange: (campo: "cargaKg" | "reps", valor: string) => void;
}) {
  return (
    <>
      <span className="text-ink-muted">{n}</span>
      <input
        type="number"
        inputMode="decimal"
        placeholder="kg"
        defaultValue={s?.cargaKg ?? ""}
        onBlur={(e) => onChange("cargaKg", e.target.value)}
        className="w-full rounded-lg border border-line bg-base-700 px-2 py-1.5 text-ink"
      />
      <input
        type="number"
        inputMode="numeric"
        placeholder="reps"
        defaultValue={s?.reps ?? ""}
        onBlur={(e) => onChange("reps", e.target.value)}
        className="w-full rounded-lg border border-line bg-base-700 px-2 py-1.5 text-ink"
      />
    </>
  );
}
