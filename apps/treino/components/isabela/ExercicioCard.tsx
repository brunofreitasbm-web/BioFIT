"use client";

import { useEffect, useState } from "react";
import { useBackLayers } from "@/hooks/useBackHandler";
import { ArrowRight, ChevronDown, Image as ImageIcon, Check, Repeat, TrendingUp, Trophy } from "lucide-react";
import { ICON, STROKE } from "@/lib/isabela/icones";
import type { ExercicioEfetivo, SerieRegistrada } from "@/lib/isabela/tipos";
import { GrupoBadge } from "./GrupoBadge";
import { ImagemExercicio } from "./ImagemExercicio";
import { TrocaExercicio } from "./TrocaExercicio";
import { cn } from "@/lib/isabela/cn";
import { parseDescansoSegundos, textoDeEsforco } from "@/lib/isabela/descanso";
import { GRUPOS_INFERIORES } from "@/lib/isabela/exercicios";
import { sugerirProximaCarga } from "@/lib/isabela/progressao";
import { seriesDoDia } from "@/lib/isabela/program";
import { maiorCargaAntes, seriesDoExercicioNaData, ultimaExecucao, upsertSerie } from "@/lib/isabela/storage";
import { iniciarDescanso, pararDescanso } from "@/lib/isabela/timerDescanso";

// Uma posição do treino: séries e repetições à vista, uma linha por série, check para registrar.
// `exercicio` já vem com a troca aplicada; trocar só é possível antes da primeira série do dia
// (depois, as séries já feitas ficariam no exercício antigo).
export function ExercicioCard({
  exercicio,
  retomada,
  data,
  expandido,
  onToggleExpandido,
  onProgresso,
  onTrocar,
}: {
  exercicio: ExercicioEfetivo;
  retomada: boolean;
  data: string;
  expandido: boolean;
  onToggleExpandido: () => void;
  onProgresso?: (slotKey: string, feitas: number, total: number) => void;
  onTrocar: (slotKey: string, exercicioId: string) => void;
}) {
  const [series, setSeries] = useState<SerieRegistrada[]>([]);
  const [ultima, setUltima] = useState<SerieRegistrada[]>([]);
  const [anterior, setAnterior] = useState<SerieRegistrada[]>([]);
  const [maiorAntes, setMaiorAntes] = useState(0);
  const [preenchimento, setPreenchimento] = useState<{ kg: string; reps: string; n: number } | null>(null);
  const [fotoAberta, setFotoAberta] = useState(false);
  const [trocando, setTrocando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState(false);

  // Botão/gesto voltar do celular fecha a foto aberta (ver hooks/useBackHandler).
  useBackLayers([{ active: fotoAberta, back: () => setFotoAberta(false) }]);

  useEffect(() => {
    setSeries(seriesDoExercicioNaData(exercicio.id, data));
    const ult = ultimaExecucao(exercicio.id, data);
    setUltima(ult);
    setAnterior(ult.length > 0 ? ultimaExecucao(exercicio.id, ult[0].data) : []);
    setMaiorAntes(maiorCargaAntes(exercicio.id, data));
    setPreenchimento(null);
  }, [exercicio.id, data]);

  const totalSeries = seriesDoDia(exercicio.series, retomada);
  const feitas = series.filter((s) => s.cargaKg !== null || s.reps !== null).length;
  const completo = feitas >= totalSeries;
  const unidadeReps = exercicio.reps.includes(" s") ? "Seg" : "Reps";
  const podeTrocar = feitas === 0 && exercicio.opcoes.length > 1;

  const ultimaCarga = ultima.find((s) => s.serieNumero === 1)?.cargaKg ?? null;
  const sugestao = sugerirProximaCarga(exercicio.reps, ultima, anterior, {
    inferior: GRUPOS_INFERIORES.has(exercicio.grupoMuscular),
    assistencia: false,
  });
  const cargaNova = maiorAntes > 0 && series.some((s) => s.cargaKg != null && s.reps != null && s.reps > 0 && s.cargaKg > maiorAntes);

  useEffect(() => {
    onProgresso?.(exercicio.slotKey, feitas, totalSeries);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercicio.slotKey, feitas, totalSeries]);

  function registrar(serieNumero: number, kgStr: string, repsStr: string): boolean {
    return upsertSerie({
      exercicioId: exercicio.id,
      sessao: exercicio.sessao,
      data,
      serieNumero,
      cargaKg: kgStr === "" ? null : Number(kgStr),
      reps: repsStr === "" ? null : Number(repsStr),
      registradoEm: new Date().toISOString(),
    });
  }

  function confirmarSerie(serieNumero: number, kgStr: string, repsStr: string) {
    const salvou = registrar(serieNumero, kgStr, repsStr);
    setErroSalvar(!salvou);
    setSeries(seriesDoExercicioNaData(exercicio.id, data));
    const ultimaDoExercicio = serieNumero >= totalSeries;
    if (salvou && ultimaDoExercicio) pararDescanso(); // acabou o exercício: o descanso da série anterior não vale mais
    if (salvou && !ultimaDoExercicio) {
      const segundos = parseDescansoSegundos(exercicio.descanso);
      if (segundos) iniciarDescanso(segundos, `${exercicio.slotKey} · ${exercicio.nome}`);
    }
  }

  const ultimaResumo =
    ultima.length > 0
      ? `Última vez: ${ultima
          .map((s) => (s.cargaKg != null ? `${s.cargaKg}kg${s.reps != null ? `×${s.reps}` : ""}` : s.reps != null ? `${s.reps}` : null))
          .filter(Boolean)
          .join(", ")}`
      : "Primeira vez neste exercício: escolha uma carga leve, que permita terminar todas as repetições com folga.";

  return (
    <div className={cn("rounded-xl border bg-base-800 shadow-panel transition-colors duration-200", completo ? "border-accent/40 bg-accent-soft/40" : "border-line")}>
      <div className="flex w-full items-center gap-2 p-3 text-left">
        <button type="button" onClick={onToggleExpandido} aria-expanded={expandido} className="flex min-h-12 min-w-0 flex-1 items-center gap-2 text-left">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-base-600 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-ink-muted">{exercicio.slotKey}</span>
              <span className="line-clamp-2 min-w-0 text-[15px] font-semibold leading-tight tracking-tight text-ink">{exercicio.nome}</span>
              {completo && (
                <span className="anim-confirmar flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-on-solid">
                  <Check aria-hidden="true" size={ICON.xs} strokeWidth={STROKE.forte} />
                </span>
              )}
              {cargaNova && (
                <span className="anim-pr inline-flex shrink-0 items-center gap-0.5 rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-bold text-accent">
                  <Trophy aria-hidden="true" size={ICON.xs} strokeWidth={STROKE.forte} /> Carga nova
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <GrupoBadge grupo={exercicio.grupoMuscular} />
              <span className="text-sm font-bold tabular-nums text-ink">
                {totalSeries} × {exercicio.reps}
              </span>
              <span className="text-[11px] text-ink-muted">· {feitas}/{totalSeries} feitas · desc. {exercicio.descanso}</span>
            </div>
          </div>
          <ChevronDown aria-hidden="true" size={ICON.md} className={cn("shrink-0 text-ink-faint transition-transform duration-200", expandido && "rotate-180")} />
        </button>

        {expandido && exercicio.imagem && (
          <button
            type="button"
            onClick={() => setFotoAberta(true)}
            className="toque flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line bg-base-700 text-ink-muted hover:border-brand/40 hover:text-brand"
            aria-label={`Ver foto de ${exercicio.nome}`}
          >
            <ImageIcon aria-hidden="true" size={ICON.md} />
          </button>
        )}
      </div>

      {expandido && (
        <div className="anim-revelar border-t border-line p-3 pt-3">
          {erroSalvar && (
            <p role="alert" className="mb-2 text-[11px] font-medium text-danger">
              Não foi possível salvar no dispositivo. Tente novamente.
            </p>
          )}
          {exercicio.notas && <p className="mb-2 text-sm text-ink-muted">{exercicio.notas}</p>}
          <p className="mb-2 text-[11px] text-ink-faint">{textoDeEsforco(exercicio.composto, retomada)}</p>
          <p className="mb-2 text-[11px] text-brand">{ultimaResumo}</p>
          {sugestao && (
            <button
              type="button"
              onClick={() => setPreenchimento((p) => ({ kg: String(sugestao.cargaKg), reps: String(sugestao.repsPreencher), n: (p?.n ?? 0) + 1 }))}
              className="mb-3 flex min-h-11 w-full items-center gap-2 rounded-lg border border-brand/30 bg-brand-soft px-3 py-2 text-left"
              aria-label={`Usar sugestão: ${sugestao.cargaKg} kg por ${sugestao.repsAlvo} repetições`}
            >
              <TrendingUp aria-hidden="true" size={ICON.sm} className="shrink-0 text-brand" />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-brand">
                  Hoje: {String(sugestao.cargaKg).replace(".", ",")} kg × {sugestao.repsAlvo}
                </span>
                <span className="block text-[11px] text-ink-muted">{sugestao.motivo}</span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-brand">
                usar <ArrowRight aria-hidden="true" size={ICON.xs} />
              </span>
            </button>
          )}

          <div className="grid grid-cols-[1.25rem_1fr_1fr_auto] items-center gap-x-2.5 gap-y-2 text-xs">
            <span className="text-ink-faint">Série</span>
            <span className="text-ink-faint">Carga (kg)</span>
            <span className="text-ink-faint">{unidadeReps}</span>
            <span />
            {Array.from({ length: totalSeries }, (_, i) => i + 1).map((n) => {
              const s = series.find((x) => x.serieNumero === n);
              const anteriorHoje = series.find((x) => x.serieNumero === n - 1)?.cargaKg ?? null;
              return (
                <FragmentoLinha
                  key={n}
                  n={n}
                  s={s}
                  ultimaValor={ultima.find((x) => x.serieNumero === n)}
                  cargaInicial={preenchimento ? Number(preenchimento.kg) : (anteriorHoje ?? ultimaCarga)}
                  repsSugeridas={preenchimento ? preenchimento.reps : null}
                  versaoPreenchimento={preenchimento?.n ?? 0}
                  cargaOpcional={exercicio.pesoCorporal}
                  onConfirmar={(kg, reps) => confirmarSerie(n, kg, reps)}
                />
              );
            })}
          </div>

          {exercicio.opcoes.length > 1 && (
            <div className="mt-3 border-t border-line pt-1">
              <button
                type="button"
                onClick={() => setTrocando(true)}
                disabled={!podeTrocar}
                className="toque flex min-h-11 items-center gap-1.5 text-xs font-semibold text-brand disabled:text-ink-faint"
              >
                <Repeat aria-hidden="true" size={ICON.sm} /> Trocar exercício{exercicio.trocado ? " (você já trocou)" : ""}
              </button>
              {!podeTrocar && feitas > 0 && <p className="text-[11px] text-ink-faint">Só dá para trocar antes da primeira série. Vale a partir do próximo treino.</p>}
            </div>
          )}
        </div>
      )}

      {fotoAberta && exercicio.imagem && <ImagemExercicio pasta={exercicio.imagem} titulo={exercicio.nome} onClose={() => setFotoAberta(false)} />}
      {trocando && (
        <TrocaExercicio
          exercicio={exercicio}
          series={totalSeries}
          onFechar={() => setTrocando(false)}
          onEscolher={(id) => {
            setTrocando(false);
            if (id !== exercicio.id) onTrocar(exercicio.slotKey, id);
          }}
        />
      )}
    </div>
  );
}

function FragmentoLinha({
  n,
  s,
  ultimaValor,
  cargaInicial,
  repsSugeridas,
  versaoPreenchimento,
  cargaOpcional,
  onConfirmar,
}: {
  n: number;
  s: SerieRegistrada | undefined;
  ultimaValor: SerieRegistrada | undefined;
  cargaInicial: number | null;
  repsSugeridas: string | null;
  versaoPreenchimento: number;
  cargaOpcional: boolean;
  onConfirmar: (kg: string, reps: string) => void;
}) {
  const [kg, setKg] = useState(() => (s?.cargaKg ?? cargaInicial ?? "").toString());
  const [reps, setReps] = useState(() => (s?.reps ?? ultimaValor?.reps ?? "").toString());
  const feita = s !== undefined && (s.cargaKg !== null || s.reps !== null);

  // Repopula os campos se o registro salvo mudar por fora (ex.: dado carregado do storage).
  useEffect(() => {
    setKg((s?.cargaKg ?? cargaInicial ?? "").toString());
    setReps((s?.reps ?? repsSugeridas ?? ultimaValor?.reps ?? "").toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s?.cargaKg, s?.reps, cargaInicial, ultimaValor?.reps, versaoPreenchimento]);

  const isDisabled = !entradaValida(kg, reps, cargaOpcional);
  const kgPlaceholder = cargaOpcional ? "opcional" : "kg";
  const repsPlaceholder = ultimaValor?.reps != null ? `${ultimaValor.reps}` : "reps";

  return (
    <>
      <span className="text-center text-sm font-semibold tabular-nums text-ink-muted">{n}</span>
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
        className="campo-serie"
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
        className="campo-serie"
      />
      <button
        type="button"
        disabled={isDisabled}
        onClick={() => !isDisabled && onConfirmar(kg, reps)}
        className={cn(
          "toque flex h-12 w-12 shrink-0 items-center justify-center rounded-full border text-base font-semibold",
          isDisabled
            ? "cursor-not-allowed border-line bg-base-800 text-ink-faint opacity-40"
            : feita
            ? "anim-confirmar border-accent bg-accent text-on-solid"
            : "border-brand bg-brand text-on-solid shadow-sm hover:bg-brand-hover",
        )}
        aria-label={`Confirmar série ${n}`}
      >
        <Check aria-hidden="true" size={ICON.md} strokeWidth={STROKE.forte} />
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
