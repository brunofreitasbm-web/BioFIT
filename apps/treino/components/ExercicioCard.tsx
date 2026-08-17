"use client";

import { useEffect, useState } from "react";
import type { Exercicio, SerieRegistrada } from "@/lib/tipos";
import { GrupoBadge } from "./GrupoBadge";
import { VideoModal } from "./VideoModal";
import { SeletorExercicio } from "./SeletorExercicio";
import { cn } from "@/lib/cn";
import { parseDescansoSegundos } from "@/lib/descanso";
import {
  getSubstituicao,
  removerSubstituicao,
  seriesDoExercicioNaData,
  setSubstituicao,
  ultimaExecucao,
  upsertSerie,
} from "@/lib/storage";
import { getExercicio } from "@/lib/exercicios";

function formatarDescanso(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// `exercicio` é o exercício planejado (o "slot" do dia). Se houver troca salva para hoje,
// tudo que é exibido/registrado usa o exercício efetivo (substituto); a troca em si sempre
// se refere ao slot original, para a lista de alternativas não ficar deriva.
export function ExercicioCard({
  exercicio,
  data,
  expandido,
  onToggleExpandido,
  onProgresso,
}: {
  exercicio: Exercicio;
  data: string;
  expandido: boolean;
  onToggleExpandido: () => void;
  onProgresso?: (exercicioId: string, feitas: number, total: number) => void;
}) {
  const [series, setSeries] = useState<SerieRegistrada[]>([]);
  const [ultima, setUltima] = useState<SerieRegistrada[]>([]);
  const [videoAberto, setVideoAberto] = useState(false);
  const [trocaAberta, setTrocaAberta] = useState(false);
  const [substitutoId, setSubstitutoId] = useState<string | null>(null);
  const [descansoRestante, setDescansoRestante] = useState<number | null>(null);
  const [dicasAbertas, setDicasAbertas] = useState(false);
  const [seriesIndividuais, setSeriesIndividuais] = useState(false);
  const [erroSalvar, setErroSalvar] = useState(false);

  useEffect(() => {
    setSubstitutoId(getSubstituicao(data, exercicio.id));
  }, [exercicio.id, data]);

  const efetivo = (substitutoId && getExercicio(substitutoId)) || exercicio;

  useEffect(() => {
    setSeries(seriesDoExercicioNaData(efetivo.id, data));
    setUltima(ultimaExecucao(efetivo.id, data));
    setDescansoRestante(null);
    // Recolhida sempre que o card muda de exercício (troca ou dia novo), para não vazar o
    // estado "aberto" de um exercício para o próximo.
    setDicasAbertas(false);
    setSeriesIndividuais(false);
  }, [efetivo.id, data]);

  const feitas = series.filter((s) => s.cargaKg !== null || s.reps !== null).length;
  const completo = feitas >= efetivo.series;

  useEffect(() => {
    onProgresso?.(exercicio.id, feitas, efetivo.series);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercicio.id, feitas, efetivo.series]);

  useEffect(() => {
    if (descansoRestante === null || descansoRestante <= 0) return;
    const id = setTimeout(() => setDescansoRestante((v) => (v === null ? null : v - 1)), 1000);
    return () => clearTimeout(id);
  }, [descansoRestante]);

  function confirmarSerie(serieNumero: number, kgStr: string, repsStr: string) {
    const entry: SerieRegistrada = {
      exercicioId: efetivo.id,
      data,
      serieNumero,
      cargaKg: kgStr === "" ? null : Number(kgStr),
      reps: repsStr === "" ? null : Number(repsStr),
      registradoEm: new Date().toISOString(),
    };
    const salvou = upsertSerie(entry);
    setErroSalvar(!salvou);
    setSeries(seriesDoExercicioNaData(efetivo.id, data));
    if (salvou) {
      const segundos = parseDescansoSegundos(efetivo.descanso);
      if (segundos) setDescansoRestante(segundos);
    }
  }

  // Replica a mesma carga/reps para todas as séries do exercício de uma vez, já que na
  // prática a maioria é feita com o mesmo peso — evita repetir os mesmos números 4x.
  function confirmarTodas(kgStr: string, repsStr: string) {
    const agora = new Date().toISOString();
    let salvouTudo = true;
    for (let n = 1; n <= efetivo.series; n++) {
      const salvou = upsertSerie({
        exercicioId: efetivo.id,
        data,
        serieNumero: n,
        cargaKg: kgStr === "" ? null : Number(kgStr),
        reps: repsStr === "" ? null : Number(repsStr),
        registradoEm: agora,
      });
      salvouTudo = salvouTudo && salvou;
    }
    setErroSalvar(!salvouTudo);
    setSeries(seriesDoExercicioNaData(efetivo.id, data));
    if (salvouTudo) {
      const segundos = parseDescansoSegundos(efetivo.descanso);
      if (segundos) setDescansoRestante(segundos);
    }
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
      <div className="flex w-full items-center gap-2 p-3 text-left">
        <button type="button" onClick={onToggleExpandido} className="flex min-w-0 flex-1 items-center gap-2 text-left">
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
          <span className="text-ink-faint" aria-hidden="true">{expandido ? "▲" : "▼"}</span>
        </button>

        {efetivo.youtubeId && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setVideoAberto(true);
            }}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-base-700 text-base"
            aria-label={`Ver vídeo de ${efetivo.nome}`}
          >
            <span aria-hidden="true">🎬</span>
          </button>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setTrocaAberta(true);
          }}
          className="flex min-h-11 shrink-0 items-center gap-1 self-start rounded-full border border-line bg-base-700 px-3 py-2 text-[11px] text-ink-muted"
          aria-label={`Mudar exercício: ${exercicio.nome}`}
        >
          <span aria-hidden="true">🔄</span> Mudar
        </button>
      </div>

      {expandido && (
        <div className="border-t border-line p-3 pt-2">
          {erroSalvar && (
            <p role="alert" className="mb-2 text-[11px] font-medium text-danger">
              Não foi possível salvar a série no dispositivo. Tente novamente.
            </p>
          )}
          {(efetivo.cadencia || efetivo.notas) && (
            <div className="mb-3">
              <button
                type="button"
                onClick={() => setDicasAbertas((v) => !v)}
                className="flex min-h-11 items-center gap-1 text-[11px] text-ink-faint"
                aria-expanded={dicasAbertas}
              >
                <span aria-hidden="true">{dicasAbertas ? "▲" : "▼"}</span>
                <span aria-hidden="true">💡</span> Dicas e execução
              </button>
              {dicasAbertas && (
                <div className="mt-1.5">
                  {efetivo.cadencia && <p className="mb-1 text-[11px] text-ink-muted">Execução: {efetivo.cadencia}</p>}
                  <p className="text-sm text-ink-muted">{efetivo.notas}</p>
                </div>
              )}
            </div>
          )}
          {ultimaResumo && <p className="mb-2 text-[11px] text-brand">{ultimaResumo}</p>}

          {descansoRestante !== null && descansoRestante > 0 && (
            <div className="mb-3 flex items-center justify-between rounded-lg border border-brand/30 bg-brand-soft px-3 py-2">
              <span className="text-xs font-medium text-brand">
                <span aria-hidden="true">⏱</span> Descanso: {formatarDescanso(descansoRestante)}
              </span>
              <button
                type="button"
                onClick={() => setDescansoRestante(null)}
                className="min-h-11 px-2 text-[11px] font-medium text-brand underline"
              >
                pular
              </button>
            </div>
          )}

          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] text-ink-faint">{feitas}/{efetivo.series} séries</span>
            <button
              type="button"
              onClick={() => setSeriesIndividuais((v) => !v)}
              className="text-[11px] text-ink-faint underline"
            >
              {seriesIndividuais ? "Usar 1 campo para todas" : "Ajustar série por série"}
            </button>
          </div>

          {seriesIndividuais ? (
            <div className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-x-2 gap-y-1.5 text-xs">
              <span className="text-ink-faint">Série</span>
              <span className="text-ink-faint">Carga (kg)</span>
              <span className="text-ink-faint">Reps</span>
              <span />
              {Array.from({ length: efetivo.series }, (_, i) => i + 1).map((n) => {
                const s = series.find((x) => x.serieNumero === n);
                const ultimaValor = ultima.find((x) => x.serieNumero === n);
                return (
                  <FragmentoLinha
                    key={n}
                    n={n}
                    s={s}
                    ultimaValor={ultimaValor}
                    onConfirmar={(kg, reps) => confirmarSerie(n, kg, reps)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-x-2 text-xs">
              <LinhaReplicada
                totalSeries={efetivo.series}
                series={series}
                ultima={ultima}
                onConfirmarTodas={confirmarTodas}
              />
            </div>
          )}
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

// Campo único que confirma as `totalSeries` séries de uma vez, todas com a mesma carga/reps.
// As séries em si continuam existindo (e ficam acessíveis via "Ajustar série por série");
// aqui só entra o valor uma vez e o check aplica pra todas.
function LinhaReplicada({
  totalSeries,
  series,
  ultima,
  onConfirmarTodas,
}: {
  totalSeries: number;
  series: SerieRegistrada[];
  ultima: SerieRegistrada[];
  onConfirmarTodas: (kg: string, reps: string) => void;
}) {
  const primeira = series.find((s) => s.serieNumero === 1);
  const ultimaPrimeira = ultima.find((s) => s.serieNumero === 1);
  const [kg, setKg] = useState(() => (primeira?.cargaKg ?? ultimaPrimeira?.cargaKg ?? "").toString());
  const [reps, setReps] = useState(() => (primeira?.reps ?? ultimaPrimeira?.reps ?? "").toString());
  const todasFeitas =
    series.filter((s) => s.cargaKg !== null || s.reps !== null).length >= totalSeries && totalSeries > 0;

  useEffect(() => {
    setKg((primeira?.cargaKg ?? ultimaPrimeira?.cargaKg ?? "").toString());
    setReps((primeira?.reps ?? ultimaPrimeira?.reps ?? "").toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primeira?.cargaKg, primeira?.reps, ultimaPrimeira?.cargaKg, ultimaPrimeira?.reps]);

  return (
    <>
      <input
        type="number"
        inputMode="decimal"
        placeholder="kg"
        aria-label="Carga em quilos, todas as séries"
        value={kg}
        onChange={(e) => setKg(e.target.value)}
        className="w-full rounded-lg border border-line bg-base-700 px-2 py-2.5 text-ink"
      />
      <input
        type="number"
        inputMode="numeric"
        placeholder="reps"
        aria-label="Repetições, todas as séries"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        className="w-full rounded-lg border border-line bg-base-700 px-2 py-2.5 text-ink"
      />
      <button
        type="button"
        onClick={() => onConfirmarTodas(kg, reps)}
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-base font-semibold transition-colors",
          todasFeitas ? "border-accent bg-accent-soft text-accent" : "border-line bg-base-700 text-ink-faint",
        )}
        aria-label={`Confirmar as ${totalSeries} séries`}
      >
        <span aria-hidden="true">✓</span>
      </button>
    </>
  );
}

function FragmentoLinha({
  n,
  s,
  ultimaValor,
  onConfirmar,
}: {
  n: number;
  s: SerieRegistrada | undefined;
  ultimaValor: SerieRegistrada | undefined;
  onConfirmar: (kg: string, reps: string) => void;
}) {
  const [kg, setKg] = useState(() => (s?.cargaKg ?? ultimaValor?.cargaKg ?? "").toString());
  const [reps, setReps] = useState(() => (s?.reps ?? ultimaValor?.reps ?? "").toString());
  const feita = s !== undefined && (s.cargaKg !== null || s.reps !== null);

  // Repopula os campos se o registro salvo mudar por fora (ex.: troca de exercício, dado carregado do storage).
  useEffect(() => {
    setKg((s?.cargaKg ?? ultimaValor?.cargaKg ?? "").toString());
    setReps((s?.reps ?? ultimaValor?.reps ?? "").toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s?.cargaKg, s?.reps, ultimaValor?.cargaKg, ultimaValor?.reps]);

  return (
    <>
      <span className="text-ink-muted">{n}</span>
      <input
        type="number"
        inputMode="decimal"
        placeholder="kg"
        aria-label={`Carga em quilos, série ${n}`}
        value={kg}
        onChange={(e) => setKg(e.target.value)}
        className="w-full rounded-lg border border-line bg-base-700 px-2 py-2.5 text-ink"
      />
      <input
        type="number"
        inputMode="numeric"
        placeholder="reps"
        aria-label={`Repetições, série ${n}`}
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        className="w-full rounded-lg border border-line bg-base-700 px-2 py-2.5 text-ink"
      />
      <button
        type="button"
        onClick={() => onConfirmar(kg, reps)}
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-base font-semibold transition-colors",
          feita ? "border-accent bg-accent-soft text-accent" : "border-line bg-base-700 text-ink-faint",
        )}
        aria-label={`Confirmar série ${n}`}
      >
        <span aria-hidden="true">✓</span>
      </button>
    </>
  );
}
