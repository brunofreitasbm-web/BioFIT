"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Film, Lightbulb, Timer, Check, Link2, TrendingUp, Trophy, Sparkles } from "lucide-react";
import type { ExercicioEfetivo, SerieRegistrada } from "@/lib/tipos";
import { GrupoBadge } from "./GrupoBadge";
import { VideoModal } from "./VideoModal";
import { cn } from "@/lib/cn";
import { alvoDeEsforco, e1rm, parseDescansoSegundos } from "@/lib/descanso";
import { EXERCICIOS_ASSISTIDOS, GRUPOS_INFERIORES, partidaKg } from "@/lib/exercicios";
import { sugerirProximaCarga } from "@/lib/progressao";
import { estimar1RM, recordesPessoais } from "@/lib/relatorio";
import { seriesDaRodada, type StatusPrograma } from "@/lib/program";
import { getPalpite, salvarPalpite, seriesDoExercicioNaData, ultimaExecucao, upsertSerie } from "@/lib/storage";

function formatarDescanso(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function melhorE1rm(series: SerieRegistrada[]): number | null {
  let melhor: number | null = null;
  for (const s of series) {
    if (s.cargaKg == null || s.reps == null || s.cargaKg <= 0) continue;
    const v = e1rm(s.cargaKg, s.reps);
    if (melhor === null || v > melhor) melhor = v;
  }
  return melhor;
}

function arredondarMeioKg(kg: number): number {
  return Math.round(kg * 2) / 2;
}

// `exercicio` é a posição da sessão já resolvida para o mesociclo corrente. Não existe troca
// manual: os exercícios mudam todos juntos na virada do mesociclo.
export function ExercicioCard({
  exercicio,
  status,
  data,
  expandido,
  onToggleExpandido,
  onProgresso,
  onConsultarCoach,
}: {
  exercicio: ExercicioEfetivo;
  status: StatusPrograma;
  data: string;
  expandido: boolean;
  onToggleExpandido: () => void;
  onProgresso?: (exercicioId: string, feitas: number, total: number) => void;
  onConsultarCoach?: (exercicio: ExercicioEfetivo) => void;
}) {
  const [series, setSeries] = useState<SerieRegistrada[]>([]);
  const [ultima, setUltima] = useState<SerieRegistrada[]>([]);
  const [anterior, setAnterior] = useState<SerieRegistrada[]>([]);
  const [recorde1RMAnterior, setRecorde1RMAnterior] = useState<number | null>(null);
  // Incrementa a cada toque na sugestão para a linha de input repopular os campos.
  const [preenchimento, setPreenchimento] = useState<{ kg: string; reps: string; n: number } | null>(null);
  const [videoAberto, setVideoAberto] = useState(false);
  const [descansoRestante, setDescansoRestante] = useState<number | null>(null);
  const [dicasAbertas, setDicasAbertas] = useState(false);
  const [seriesIndividuais, setSeriesIndividuais] = useState(false);
  const [erroSalvar, setErroSalvar] = useState(false);
  const [palpite, setPalpite] = useState("");

  useEffect(() => {
    setSeries(seriesDoExercicioNaData(exercicio.id, data));
    const ult = ultimaExecucao(exercicio.id, data);
    setUltima(ult);
    setAnterior(ult.length > 0 ? ultimaExecucao(exercicio.id, ult[0].data) : []);
    setRecorde1RMAnterior(recordesPessoais(exercicio.id, data).melhor1RM?.kg ?? null);
    setPreenchimento(null);
    setPalpite(getPalpite(exercicio.id, data)?.toString() ?? "");
    setDescansoRestante(null);
    setDicasAbertas(false);
    setSeriesIndividuais(false);
  }, [exercicio.id, data]);

  const totalSeries = seriesDaRodada(exercicio.series, status.isDeload);
  const feitas = series.filter((s) => s.cargaKg !== null || s.reps !== null).length;
  const completo = feitas >= totalSeries;
  const alvo = alvoDeEsforco(exercicio, status);
  const ultimaSerieHoje = series.find((s) => s.serieNumero === totalSeries);
  const unidadeReps = exercicio.reps.includes(" s") ? "Seg" : "Reps";

  // Carga pré-preenchida: última carga usada; no deload, ela −10%; sem histórico, a
  // "Partida (kg)" da planilha.
  const ultimaCarga = ultima.find((s) => s.serieNumero === 1)?.cargaKg ?? null;
  const cargaDeload = status.isDeload && ultimaCarga ? arredondarMeioKg(ultimaCarga * 0.9) : null;
  const cargaInicial = cargaDeload ?? ultimaCarga ?? partidaKg(exercicio.partida);

  const assistencia = EXERCICIOS_ASSISTIDOS.has(exercicio.id);
  const sugestao = sugerirProximaCarga(
    exercicio.reps,
    ultima,
    anterior,
    { inferior: GRUPOS_INFERIORES.has(exercicio.grupoMuscular), assistencia },
    status.isDeload,
  );
  // PR de hoje: alguma série confirmada hoje supera o melhor 1RM estimado de antes de hoje.
  // No Graviton o número é assistência, então "mais kg" não é recorde.
  const bateuPR =
    !assistencia &&
    recorde1RMAnterior !== null &&
    series.some((s) => s.cargaKg != null && s.reps != null && s.cargaKg > 0 && s.reps > 0 && estimar1RM(s.cargaKg, s.reps) > recorde1RMAnterior + 1e-9);

  useEffect(() => {
    onProgresso?.(exercicio.id, feitas, totalSeries);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercicio.id, feitas, totalSeries]);

  useEffect(() => {
    if (descansoRestante === null || descansoRestante <= 0) return;
    const id = setTimeout(() => setDescansoRestante((v) => (v === null ? null : v - 1)), 1000);
    return () => clearTimeout(id);
  }, [descansoRestante]);

  function registrar(serieNumero: number, kgStr: string, repsStr: string, registradoEm: string): boolean {
    const anterior = series.find((s) => s.serieNumero === serieNumero);
    return upsertSerie({
      exercicioId: exercicio.id,
      sessao: exercicio.sessao,
      data,
      serieNumero,
      cargaKg: kgStr === "" ? null : Number(kgStr),
      reps: repsStr === "" ? null : Number(repsStr),
      rir: anterior?.rir ?? null,
      registradoEm,
    });
  }

  function aposSalvar(salvou: boolean) {
    setErroSalvar(!salvou);
    setSeries(seriesDoExercicioNaData(exercicio.id, data));
    if (salvou) {
      const segundos = parseDescansoSegundos(exercicio.descanso);
      if (segundos) setDescansoRestante(segundos);
    }
  }

  function confirmarSerie(serieNumero: number, kgStr: string, repsStr: string) {
    aposSalvar(registrar(serieNumero, kgStr, repsStr, new Date().toISOString()));
  }

  // Replica a mesma carga/reps para todas as séries do exercício de uma vez.
  function confirmarTodas(kgStr: string, repsStr: string) {
    const agora = new Date().toISOString();
    let salvouTudo = true;
    for (let n = 1; n <= totalSeries; n++) salvouTudo = registrar(n, kgStr, repsStr, agora) && salvouTudo;
    aposSalvar(salvouTudo);
  }

  function salvarRir(valor: string) {
    if (!ultimaSerieHoje) return;
    const salvou = upsertSerie({ ...ultimaSerieHoje, rir: valor === "" ? null : Number(valor) });
    setErroSalvar(!salvou);
    setSeries(seriesDoExercicioNaData(exercicio.id, data));
  }

  function salvarPalpiteAtual(valor: string) {
    setPalpite(valor);
    const n = Number(valor);
    if (valor !== "" && Number.isFinite(n) && n > 0) {
      setErroSalvar(!salvarPalpite({ data, exercicioId: exercicio.id, palpite: n }));
    }
  }

  const e1rmHoje = melhorE1rm(series);
  const e1rmUltima = melhorE1rm(ultima);
  const ultimaResumo =
    ultima.length > 0
      ? `Última vez: ${ultima
          .map((s) => (s.cargaKg != null ? `${s.cargaKg}kg${s.reps != null ? `×${s.reps}` : ""}` : s.reps != null ? `${s.reps}` : null))
          .filter(Boolean)
          .join(", ")}${e1rmUltima ? ` · e1RM ${e1rmUltima}` : ""}`
      : null;
  const partidaTexto =
    exercicio.partida === "calibrar"
      ? "Partida: calibrar — na 1ª exposição, ache a carga que dá o topo da faixa com ~2 reps sobrando"
      : exercicio.partida === "peso corporal"
        ? "Partida: peso corporal"
        : `Partida: ${exercicio.partida} kg`;

  const realCalibracao = ultimaSerieHoje?.reps ?? null;
  const palpiteNum = palpite === "" ? null : Number(palpite);
  const erroCalibracao = realCalibracao !== null && palpiteNum !== null ? realCalibracao - palpiteNum : null;

  return (
    <div
      className={cn(
        "rounded-2xl border bg-base-800 shadow-panel transition-colors duration-200",
        expandido ? "border-brand/50" : completo ? "border-accent/30" : "border-line",
      )}
    >
      <div className="flex w-full items-center gap-2 p-3 text-left">
        <button
          type="button"
          onClick={onToggleExpandido}
          aria-expanded={expandido}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span
            aria-hidden="true"
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-display text-lg font-bold tabular-nums transition-colors",
              completo
                ? "bg-accent text-accent-ink"
                : expandido
                  ? "bg-brand text-brand-ink"
                  : "bg-base-700 text-ink-muted",
            )}
          >
            {completo ? <Check size={20} strokeWidth={3} /> : `${exercicio.sessao}${exercicio.ordem}`}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={cn("font-semibold leading-snug [overflow-wrap:anywhere]", completo ? "text-ink-muted" : "text-ink")}>
                {exercicio.nome}
              </span>
              {completo && <span className="sr-only">(concluído)</span>}
              {bateuPR && (
                <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                  <Trophy aria-hidden="true" size={11} strokeWidth={2.5} /> PR
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <GrupoBadge grupo={exercicio.grupoMuscular} />
              <span className="text-xs tabular-nums text-ink-muted">
                <strong className="font-semibold text-ink">{totalSeries}×{exercicio.reps}</strong> · {exercicio.descanso}
              </span>
              {exercicio.bisetCom && (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-brand">
                  <Link2 aria-hidden="true" size={12} strokeWidth={2.25} /> biset
                </span>
              )}
              {alvo.testeFalha && (
                <span className="rounded-md bg-danger-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-danger">
                  teste de falha
                </span>
              )}
            </div>
          </div>
          {expandido ? (
            <ChevronUp aria-hidden="true" size={18} className="shrink-0 text-ink-faint" />
          ) : (
            <ChevronDown aria-hidden="true" size={18} className="shrink-0 text-ink-faint" />
          )}
        </button>

        {exercicio.youtubeId && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setVideoAberto(true);
            }}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-base-700 text-ink-muted"
            aria-label={`Ver vídeo de ${exercicio.nome}`}
          >
            <Film aria-hidden="true" size={18} strokeWidth={1.75} />
          </button>
        )}
      </div>

      {expandido && (
        <div className="border-t border-line px-3 pb-3 pt-2.5">
          {erroSalvar && (
            <p role="alert" className="mb-2 text-[11px] font-medium text-danger">
              Não foi possível salvar no dispositivo. Tente novamente.
            </p>
          )}
          <p className="mb-2 text-[11px] text-ink-faint">
            RIR alvo: {alvo.rirAlvo} · {alvo.label}
          </p>
          {exercicio.notas && (
            <div className="mb-3">
              <button
                type="button"
                onClick={() => setDicasAbertas((v) => !v)}
                className="flex min-h-11 items-center gap-1 text-[11px] text-ink-faint"
                aria-expanded={dicasAbertas}
              >
                {dicasAbertas ? <ChevronUp aria-hidden="true" size={14} /> : <ChevronDown aria-hidden="true" size={14} />}
                <Lightbulb aria-hidden="true" size={13} strokeWidth={2} /> Notas
              </button>
              {dicasAbertas && <p className="mt-1.5 text-sm text-ink-muted">{exercicio.notas}</p>}
            </div>
          )}
          <p className="mb-2 text-[11px] text-brand">{ultimaResumo ?? partidaTexto}</p>
          {sugestao && (
            <button
              type="button"
              onClick={() =>
                setPreenchimento((p) => ({ kg: String(sugestao.cargaKg), reps: String(sugestao.repsPreencher), n: (p?.n ?? 0) + 1 }))
              }
              className="mb-2 flex min-h-11 w-full items-center gap-2 rounded-lg border border-brand/30 bg-brand-soft px-3 py-2 text-left"
              aria-label={`Usar sugestão: ${sugestao.cargaKg} kg por ${sugestao.repsAlvo} repetições`}
            >
              <TrendingUp aria-hidden="true" size={16} strokeWidth={2} className="shrink-0 text-brand" />
              <span className="min-w-0 flex-1">
                <span className="block font-display text-base font-bold uppercase tracking-wide text-brand">
                  Hoje {String(sugestao.cargaKg).replace(".", ",")} kg × {sugestao.repsAlvo}
                </span>
                <span className="block text-[11px] text-ink-muted">{sugestao.motivo}</span>
              </span>
              <span className="shrink-0 text-[11px] font-medium text-brand underline">usar</span>
            </button>
          )}

          {onConsultarCoach && (
            <button
              type="button"
              onClick={() => onConsultarCoach(exercicio)}
              className="mb-2.5 flex items-center justify-between w-full rounded-lg border border-brand/25 bg-brand-soft/60 px-3 py-2 text-xs text-brand hover:border-brand/50 hover:bg-brand-soft transition-all active:scale-[0.99]"
            >
              <span className="flex items-center gap-2 font-semibold">
                <Sparkles size={14} className="text-brand shrink-0" />
                BioFIT Coach (DeepSeek)
              </span>
              <span className="text-[11px] text-ink-muted">Ajuste de carga ou máquina ocupada →</span>
            </button>
          )}

          {alvo.testeFalha && (
            <div className="mb-3 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2">
              <p className="mb-1.5 text-[11px] text-danger">
                Antes da {totalSeries}ª série: quantas reps você ACHA que faz até a falha? Depois vá até a falha técnica.
              </p>
              <div className="flex items-center gap-2 text-xs">
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="99"
                  placeholder="palpite"
                  aria-label="Palpite de repetições até a falha"
                  value={palpite}
                  onChange={(e) => salvarPalpiteAtual(e.target.value)}
                  className="w-20 rounded-lg border border-line bg-base-700 px-2 py-2 text-ink focus:border-brand focus:outline-none"
                />
                <span className="text-ink-muted">
                  {realCalibracao === null
                    ? "O real vem da última série registrada"
                    : `Real: ${realCalibracao}${erroCalibracao !== null ? ` · erro ${erroCalibracao > 0 ? "+" : ""}${erroCalibracao}` : ""}`}
                </span>
              </div>
            </div>
          )}

          {descansoRestante !== null && descansoRestante > 0 && (
            <div className="mb-3 flex items-center justify-between rounded-lg border border-brand/30 bg-brand-soft px-3 py-2">
              <span className="flex items-center gap-1.5 text-xs font-medium text-brand">
                <Timer aria-hidden="true" size={15} strokeWidth={2} /> Descanso: {formatarDescanso(descansoRestante)}
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

          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs tabular-nums text-ink-faint">
              {feitas}/{totalSeries} séries{e1rmHoje ? ` · e1RM hoje ${e1rmHoje}` : ""}
            </span>
            <button
              type="button"
              onClick={() => setSeriesIndividuais((v) => !v)}
              className="min-h-9 text-xs font-medium text-ink-muted underline decoration-line underline-offset-4 hover:text-ink"
            >
              {seriesIndividuais ? "Usar 1 campo para todas" : "Ajustar série por série"}
            </button>
          </div>

          {seriesIndividuais ? (
            <div className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-x-2 gap-y-2 text-xs">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">Série</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">Carga (kg)</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">{unidadeReps}</span>
              <span />
              {Array.from({ length: totalSeries }, (_, i) => i + 1).map((n) => {
                const s = series.find((x) => x.serieNumero === n);
                const ultimaValor = ultima.find((x) => x.serieNumero === n);
                return (
                  <FragmentoLinha
                    key={n}
                    n={n}
                    s={s}
                    ultimaValor={ultimaValor}
                    cargaInicial={cargaInicial}
                    cargaOpcional={exercicio.pesoCorporal}
                    onConfirmar={(kg, reps) => confirmarSerie(n, kg, reps)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-x-2 gap-y-1 text-xs">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">Carga (kg)</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">{unidadeReps} · todas</span>
              <span />
              <LinhaReplicada
                totalSeries={totalSeries}
                series={series}
                ultima={ultima}
                cargaInicial={cargaInicial}
                cargaOpcional={exercicio.pesoCorporal}
                preenchimento={preenchimento}
                onConfirmarTodas={confirmarTodas}
              />
            </div>
          )}

          {completo && !alvo.testeFalha && !status.isDeload && (
            <div className="mt-3 flex items-center gap-2 text-xs">
              <label htmlFor={`rir-${exercicio.id}`} className="text-ink-muted">
                RIR da última série
              </label>
              <input
                id={`rir-${exercicio.id}`}
                type="number"
                inputMode="numeric"
                min="0"
                max="10"
                step="1"
                placeholder="0-5"
                value={ultimaSerieHoje?.rir ?? ""}
                onChange={(e) => salvarRir(e.target.value)}
                className="w-16 rounded-lg border border-line bg-base-700 px-2 py-2 text-ink focus:border-brand focus:outline-none"
              />
            </div>
          )}
        </div>
      )}

      {videoAberto && exercicio.youtubeId && (
        <VideoModal youtubeId={exercicio.youtubeId} titulo={exercicio.nome} onClose={() => setVideoAberto(false)} />
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
  cargaInicial,
  cargaOpcional,
  preenchimento,
  onConfirmarTodas,
}: {
  totalSeries: number;
  series: SerieRegistrada[];
  ultima: SerieRegistrada[];
  cargaInicial: number | null;
  cargaOpcional: boolean;
  preenchimento: { kg: string; reps: string; n: number } | null;
  onConfirmarTodas: (kg: string, reps: string) => void;
}) {
  const primeira = series.find((s) => s.serieNumero === 1);
  const ultimaPrimeira = ultima.find((s) => s.serieNumero === 1);
  const [kg, setKg] = useState(() => (primeira?.cargaKg ?? cargaInicial ?? "").toString());
  const [reps, setReps] = useState(() => (primeira?.reps ?? ultimaPrimeira?.reps ?? "").toString());
  const todasFeitas =
    series.filter((s) => s.cargaKg !== null || s.reps !== null).length >= totalSeries && totalSeries > 0;

  useEffect(() => {
    setKg((primeira?.cargaKg ?? cargaInicial ?? "").toString());
    setReps((primeira?.reps ?? ultimaPrimeira?.reps ?? "").toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primeira?.cargaKg, primeira?.reps, cargaInicial, ultimaPrimeira?.reps]);

  // Toque em "usar" na sugestão de progressão: sobrescreve os campos (sem confirmar).
  useEffect(() => {
    if (!preenchimento) return;
    setKg(preenchimento.kg);
    setReps(preenchimento.reps);
  }, [preenchimento]);

  const isDisabled = !entradaValida(kg, reps, cargaOpcional);
  const kgPlaceholder = cargaOpcional ? "opcional" : "kg";
  const repsPlaceholder = ultimaPrimeira?.reps != null ? `${ultimaPrimeira.reps}` : "reps";

  return (
    <>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        max="999"
        step="0.5"
        placeholder={kgPlaceholder}
        aria-label="Carga em quilos, todas as séries"
        value={kg}
        onChange={(e) => setKg(e.target.value)}
        className="h-12 w-full rounded-xl border border-line bg-base-700 px-3 text-center font-display text-xl font-bold tabular-nums text-ink placeholder:text-ink-faint placeholder:font-sans placeholder:text-sm placeholder:font-normal focus:border-brand focus:outline-none"
      />
      <input
        type="number"
        inputMode="numeric"
        min="0"
        max="999"
        step="1"
        placeholder={repsPlaceholder}
        aria-label="Repetições, todas as séries"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        className="h-12 w-full rounded-xl border border-line bg-base-700 px-3 text-center font-display text-xl font-bold tabular-nums text-ink placeholder:text-ink-faint placeholder:font-sans placeholder:text-sm placeholder:font-normal focus:border-brand focus:outline-none"
      />
      <button
        type="button"
        disabled={isDisabled}
        onClick={() => !isDisabled && onConfirmarTodas(kg, reps)}
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-base font-semibold transition-all duration-150",
          isDisabled
            ? "cursor-not-allowed border-line bg-base-800 text-ink-faint opacity-40"
            : todasFeitas
            ? "border-accent bg-accent-soft text-accent"
            : "border-brand bg-brand text-brand-ink shadow-glow hover:bg-brand-hover active:scale-95",
        )}
        aria-label={`Confirmar as ${totalSeries} séries`}
      >
        <Check aria-hidden="true" size={18} strokeWidth={3} />
      </button>
    </>
  );
}

function FragmentoLinha({
  n,
  s,
  ultimaValor,
  cargaInicial,
  cargaOpcional,
  onConfirmar,
}: {
  n: number;
  s: SerieRegistrada | undefined;
  ultimaValor: SerieRegistrada | undefined;
  cargaInicial: number | null;
  cargaOpcional: boolean;
  onConfirmar: (kg: string, reps: string) => void;
}) {
  const [kg, setKg] = useState(() => (s?.cargaKg ?? cargaInicial ?? "").toString());
  const [reps, setReps] = useState(() => (s?.reps ?? ultimaValor?.reps ?? "").toString());
  const feita = s !== undefined && (s.cargaKg !== null || s.reps !== null);

  // Repopula os campos se o registro salvo mudar por fora (ex.: dado carregado do storage).
  useEffect(() => {
    setKg((s?.cargaKg ?? cargaInicial ?? "").toString());
    setReps((s?.reps ?? ultimaValor?.reps ?? "").toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s?.cargaKg, s?.reps, cargaInicial, ultimaValor?.reps]);

  const isDisabled = !entradaValida(kg, reps, cargaOpcional);
  const kgPlaceholder = cargaOpcional ? "opcional" : "kg";
  const repsPlaceholder = ultimaValor?.reps != null ? `${ultimaValor.reps}` : "reps";

  return (
    <>
      <span className="w-6 text-center font-display text-base font-bold text-ink-faint">{n}</span>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        max="999"
        step="0.5"
        placeholder={kgPlaceholder}
        aria-label={`Carga em quilos, série ${n}`}
        value={kg}
        onChange={(e) => setKg(e.target.value)}
        className="h-12 w-full rounded-xl border border-line bg-base-700 px-3 text-center font-display text-xl font-bold tabular-nums text-ink placeholder:text-ink-faint placeholder:font-sans placeholder:text-sm placeholder:font-normal focus:border-brand focus:outline-none"
      />
      <input
        type="number"
        inputMode="numeric"
        min="0"
        max="999"
        step="1"
        placeholder={repsPlaceholder}
        aria-label={`Repetições, série ${n}`}
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        className="h-12 w-full rounded-xl border border-line bg-base-700 px-3 text-center font-display text-xl font-bold tabular-nums text-ink placeholder:text-ink-faint placeholder:font-sans placeholder:text-sm placeholder:font-normal focus:border-brand focus:outline-none"
      />
      <button
        type="button"
        disabled={isDisabled}
        onClick={() => !isDisabled && onConfirmar(kg, reps)}
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-base font-semibold transition-all duration-150",
          isDisabled
            ? "cursor-not-allowed border-line bg-base-800 text-ink-faint opacity-40"
            : feita
            ? "border-accent bg-accent-soft text-accent"
            : "border-brand bg-brand text-brand-ink shadow-glow hover:bg-brand-hover active:scale-95",
        )}
        aria-label={`Confirmar série ${n}`}
      >
        <Check aria-hidden="true" size={18} strokeWidth={3} />
      </button>
    </>
  );
}

// Reps sempre obrigatórias; carga obrigatória exceto em exercício de peso corporal
// (extensão torácica, prancha lateral), onde vazio = sem carga extra.
function entradaValida(kg: string, reps: string, cargaOpcional: boolean): boolean {
  const repsNum = Number(reps);
  if (!reps.trim() || isNaN(repsNum) || repsNum <= 0) return false;
  if (!kg.trim()) return cargaOpcional;
  const kgNum = Number(kg);
  return !isNaN(kgNum) && (cargaOpcional ? kgNum >= 0 : kgNum > 0);
}
