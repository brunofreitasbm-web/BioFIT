"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Film, RefreshCw, Lightbulb, Timer, Check, TrendingUp, Trophy } from "lucide-react";
import type { ExercicioEfetivo, SerieRegistrada } from "@/lib/tipos";
import { GrupoBadge } from "./GrupoBadge";
import { VideoModal } from "./VideoModal";
import { SeletorExercicio } from "./SeletorExercicio";
import { cn } from "@/lib/cn";
import { calcularEstagioRIR, parseDescansoSegundos } from "@/lib/descanso";
import { seriesDoExercicioNaData, ultimaExecucao, upsertSerie } from "@/lib/storage";
import { getExercicioDoSlot, sessoesRegistradasDoExercicio, trocarExercicioDoSlot } from "@/lib/programaAtual";
import { sugerirProximaCarga } from "@/lib/progressao";
import { estimar1RM, recordesPessoais } from "@/lib/relatorio";

function formatarDescanso(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const PAPEL_ESTILO: Record<string, string> = {
  DIRETO: "text-brand",
  INDIRETO: "text-ink-muted",
  NEUTRO: "text-ink-faint",
};

// `exercicio` é o exercício efetivo do slot para a sessão de hoje (escolha atual do
// Programa Atual, já mesclada com a prescrição do slot). Trocar aqui muda o programa —
// não é uma substituição só de hoje — e fica registrado no Log de Trocas.
export function ExercicioCard({
  exercicio,
  data,
  expandido,
  isDeload = false,
  onToggleExpandido,
  onProgresso,
}: {
  exercicio: ExercicioEfetivo;
  data: string;
  expandido: boolean;
  isDeload?: boolean;
  onToggleExpandido: () => void;
  onProgresso?: (exercicioId: string, feitas: number, total: number) => void;
}) {
  const [efetivo, setEfetivo] = useState(exercicio);
  const [series, setSeries] = useState<SerieRegistrada[]>([]);
  const [ultima, setUltima] = useState<SerieRegistrada[]>([]);
  const [anterior, setAnterior] = useState<SerieRegistrada[]>([]);
  const [recorde1RMAnterior, setRecorde1RMAnterior] = useState<number | null>(null);
  // Incrementa a cada toque na sugestão para a linha de input repopular os campos.
  const [preenchimento, setPreenchimento] = useState<{ kg: string; reps: string; n: number } | null>(null);
  const [videoAberto, setVideoAberto] = useState(false);
  const [trocaAberta, setTrocaAberta] = useState(false);
  const [descansoRestante, setDescansoRestante] = useState<number | null>(null);
  const [dicasAbertas, setDicasAbertas] = useState(false);
  const [seriesIndividuais, setSeriesIndividuais] = useState(false);
  const [erroSalvar, setErroSalvar] = useState(false);

  useEffect(() => {
    setEfetivo(exercicio);
  }, [exercicio]);

  useEffect(() => {
    setSeries(seriesDoExercicioNaData(efetivo.id, data));
    const ult = ultimaExecucao(efetivo.id, data);
    setUltima(ult);
    setAnterior(ult.length > 0 ? ultimaExecucao(efetivo.id, ult[0].data) : []);
    setRecorde1RMAnterior(recordesPessoais(efetivo.id, data).melhor1RM?.kg ?? null);
    setPreenchimento(null);
    setDescansoRestante(null);
    // Recolhida sempre que o card muda de exercício (troca ou dia novo), para não vazar o
    // estado "aberto" de um exercício para o próximo.
    setDicasAbertas(false);
    setSeriesIndividuais(false);
  }, [efetivo.id, data]);

  const feitas = series.filter((s) => s.cargaKg !== null || s.reps !== null).length;
  const completo = feitas >= efetivo.series;
  const estagio = calcularEstagioRIR(sessoesRegistradasDoExercicio(efetivo.id));
  // Sugestão calculada sobre as sessões ANTERIORES a hoje; o estágio de RIR conta só as
  // sessões passadas para não mudar de regra no meio do treino de hoje.
  const sessoesAntes = sessoesRegistradasDoExercicio(efetivo.id) - (feitas > 0 ? 1 : 0);
  const sugestao = sugerirProximaCarga(efetivo.reps, ultima, anterior, calcularEstagioRIR(sessoesAntes), isDeload);
  // PR de hoje: alguma série confirmada hoje supera o melhor 1RM estimado de antes de hoje.
  const bateuPR =
    recorde1RMAnterior !== null &&
    series.some((s) => s.cargaKg != null && s.reps != null && s.cargaKg > 0 && s.reps > 0 && estimar1RM(s.cargaKg, s.reps) > recorde1RMAnterior + 1e-9);

  useEffect(() => {
    onProgresso?.(efetivo.id, feitas, efetivo.series);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [efetivo.id, feitas, efetivo.series]);

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

  function trocarPara(novoId: string, motivo: string) {
    trocarExercicioDoSlot(efetivo.sessao, efetivo.slot, novoId, data, motivo);
    setEfetivo(getExercicioDoSlot(efetivo.sessao, efetivo.slot));
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
              {completo && <Check aria-hidden="true" size={16} strokeWidth={3} className="shrink-0 text-accent" />}
              {bateuPR && (
                <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                  <Trophy aria-hidden="true" size={11} strokeWidth={2.5} /> PR
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <GrupoBadge grupo={efetivo.grupoMuscular} />
              <span className="text-[11px] text-ink-muted">
                {efetivo.series}×{efetivo.reps} · desc. {efetivo.descanso}
              </span>
              <span className={cn("text-[11px] font-medium", PAPEL_ESTILO[efetivo.papelPostural])}>
                {efetivo.papelPostural}
              </span>
            </div>
          </div>
          {expandido ? (
            <ChevronUp aria-hidden="true" size={18} className="shrink-0 text-ink-faint" />
          ) : (
            <ChevronDown aria-hidden="true" size={18} className="shrink-0 text-ink-faint" />
          )}
        </button>

        {efetivo.youtubeId && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setVideoAberto(true);
            }}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-base-700 text-ink-muted"
            aria-label={`Ver vídeo de ${efetivo.nome}`}
          >
            <Film aria-hidden="true" size={18} strokeWidth={1.75} />
          </button>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setTrocaAberta(true);
          }}
          className="flex min-h-11 shrink-0 items-center gap-1 self-start rounded-full border border-line bg-base-700 px-3 py-2 text-[11px] text-ink-muted"
          aria-label={`Trocar exercício: ${efetivo.nome}`}
        >
          <RefreshCw aria-hidden="true" size={13} strokeWidth={2} /> Trocar
        </button>
      </div>

      {expandido && (
        <div className="border-t border-line p-3 pt-2">
          {erroSalvar && (
            <p role="alert" className="mb-2 text-[11px] font-medium text-danger">
              Não foi possível salvar a série no dispositivo. Tente novamente.
            </p>
          )}
          <p className="mb-2 text-[11px] text-ink-faint">
            RIR alvo: {estagio.rirAlvo} · {estagio.label} ({estagio.sessoesFeitas} {estagio.sessoesFeitas === 1 ? "sessão" : "sessões"} neste exercício)
          </p>
          {(efetivo.execucao || efetivo.notas) && (
            <div className="mb-3">
              <button
                type="button"
                onClick={() => setDicasAbertas((v) => !v)}
                className="flex min-h-11 items-center gap-1 text-[11px] text-ink-faint"
                aria-expanded={dicasAbertas}
              >
                {dicasAbertas ? <ChevronUp aria-hidden="true" size={14} /> : <ChevronDown aria-hidden="true" size={14} />}
                <Lightbulb aria-hidden="true" size={13} strokeWidth={2} /> Dicas e execução
              </button>
              {dicasAbertas && (
                <div className="mt-1.5">
                  {efetivo.execucao && <p className="mb-1 text-[11px] text-ink-muted">Execução: {efetivo.execucao}</p>}
                  <p className="text-sm text-ink-muted">{efetivo.notas}</p>
                </div>
              )}
            </div>
          )}
          {ultimaResumo && <p className="mb-2 text-[11px] text-brand">{ultimaResumo}</p>}
          {sugestao && (
            sugestao.cargaKg !== null ? (
              <button
                type="button"
                onClick={() =>
                  setPreenchimento((p) => ({
                    kg: String(sugestao.cargaKg),
                    reps: String(sugestao.repsPreencher),
                    n: (p?.n ?? 0) + 1,
                  }))
                }
                className="mb-2 flex min-h-11 w-full items-center gap-2 rounded-lg border border-brand/30 bg-brand-soft px-3 py-2 text-left"
                aria-label={`Usar sugestão: ${sugestao.cargaKg} kg por ${sugestao.repsAlvo} repetições`}
              >
                <TrendingUp aria-hidden="true" size={16} strokeWidth={2} className="shrink-0 text-brand" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-brand">
                    Hoje: {String(sugestao.cargaKg).replace(".", ",")} kg × {sugestao.repsAlvo}
                  </span>
                  <span className="block text-[11px] text-ink-muted">{sugestao.motivo}</span>
                </span>
                <span className="shrink-0 text-[11px] font-medium text-brand underline">usar</span>
              </button>
            ) : (
              <p className="mb-2 text-[11px] text-ink-faint">
                {sugestao.repsAlvo} reps · {sugestao.motivo}
              </p>
            )
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
                preenchimento={preenchimento}
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
        <SeletorExercicio atual={efetivo} onEscolher={trocarPara} onFechar={() => setTrocaAberta(false)} />
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
  preenchimento,
  onConfirmarTodas,
}: {
  totalSeries: number;
  series: SerieRegistrada[];
  ultima: SerieRegistrada[];
  preenchimento: { kg: string; reps: string; n: number } | null;
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

  // Toque em "usar" na sugestão de progressão: sobrescreve os campos (sem confirmar).
  useEffect(() => {
    if (!preenchimento) return;
    setKg(preenchimento.kg);
    setReps(preenchimento.reps);
  }, [preenchimento]);

  const kgNum = Number(kg);
  const repsNum = Number(reps);
  const isDisabled = !kg.trim() || !reps.trim() || isNaN(kgNum) || kgNum <= 0 || isNaN(repsNum) || repsNum <= 0;
  const kgPlaceholder = ultimaPrimeira?.cargaKg != null ? `${ultimaPrimeira.cargaKg}` : "kg";
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
        className="w-full rounded-lg border border-line bg-base-700 px-2 py-2.5 text-ink focus:border-brand focus:outline-none"
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
        className="w-full rounded-lg border border-line bg-base-700 px-2 py-2.5 text-ink focus:border-brand focus:outline-none"
      />
      <button
        type="button"
        disabled={isDisabled}
        onClick={() => !isDisabled && onConfirmarTodas(kg, reps)}
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-base font-semibold transition-colors",
          isDisabled
            ? "cursor-not-allowed border-line bg-base-800 text-ink-faint opacity-40"
            : todasFeitas
            ? "border-accent bg-accent-soft text-accent"
            : "border-brand bg-brand text-white shadow-sm hover:opacity-90 active:scale-95",
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

  const kgNum = Number(kg);
  const repsNum = Number(reps);
  const isDisabled = !kg.trim() || !reps.trim() || isNaN(kgNum) || kgNum <= 0 || isNaN(repsNum) || repsNum <= 0;
  const kgPlaceholder = ultimaValor?.cargaKg != null ? `${ultimaValor.cargaKg}` : "kg";
  const repsPlaceholder = ultimaValor?.reps != null ? `${ultimaValor.reps}` : "reps";

  return (
    <>
      <span className="text-ink-muted">{n}</span>
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
        className="w-full rounded-lg border border-line bg-base-700 px-2 py-2.5 text-ink focus:border-brand focus:outline-none"
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
        className="w-full rounded-lg border border-line bg-base-700 px-2 py-2.5 text-ink focus:border-brand focus:outline-none"
      />
      <button
        type="button"
        disabled={isDisabled}
        onClick={() => !isDisabled && onConfirmar(kg, reps)}
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-base font-semibold transition-colors",
          isDisabled
            ? "cursor-not-allowed border-line bg-base-800 text-ink-faint opacity-40"
            : feita
            ? "border-accent bg-accent-soft text-accent"
            : "border-brand bg-brand text-white shadow-sm hover:opacity-90 active:scale-95",
        )}
        aria-label={`Confirmar série ${n}`}
      >
        <Check aria-hidden="true" size={18} strokeWidth={3} />
      </button>
    </>
  );
}
