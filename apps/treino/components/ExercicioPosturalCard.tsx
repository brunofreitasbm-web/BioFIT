"use client";

import { useEffect, useState } from "react";
import type { ExercicioPostural, SerieRegistrada } from "@/lib/tipos";
import { GrupoBadge } from "./GrupoBadge";
import { VideoModal } from "./VideoModal";
import { cn } from "@/lib/cn";
import { seriesDoExercicioNaData, ultimaExecucao, upsertSerie } from "@/lib/storage";

// Card do bloco postural (em casa): mesma lógica de registro de séries do ExercicioCard,
// mas sem troca de exercício (não tem banco de opções, não rotaciona), sem timer de
// descanso (não tem prescrição de descanso) e mostrando a frequência semanal em vez disso.
export function ExercicioPosturalCard({
  exercicio,
  data,
  expandido,
  onToggleExpandido,
}: {
  exercicio: ExercicioPostural;
  data: string;
  expandido: boolean;
  onToggleExpandido: () => void;
}) {
  const [series, setSeries] = useState<SerieRegistrada[]>([]);
  const [ultima, setUltima] = useState<SerieRegistrada[]>([]);
  const [videoAberto, setVideoAberto] = useState(false);
  const [dicasAbertas, setDicasAbertas] = useState(false);
  const [erroSalvar, setErroSalvar] = useState(false);

  useEffect(() => {
    setSeries(seriesDoExercicioNaData(exercicio.id, data));
    setUltima(ultimaExecucao(exercicio.id, data));
    setDicasAbertas(false);
  }, [exercicio.id, data]);

  const feitas = series.filter((s) => s.reps !== null).length;
  const completo = feitas >= exercicio.series;

  function confirmarSerie(serieNumero: number, repsStr: string) {
    const entry: SerieRegistrada = {
      exercicioId: exercicio.id,
      data,
      serieNumero,
      cargaKg: null,
      reps: repsStr === "" ? null : Number(repsStr),
      registradoEm: new Date().toISOString(),
    };
    const salvou = upsertSerie(entry);
    setErroSalvar(!salvou);
    setSeries(seriesDoExercicioNaData(exercicio.id, data));
  }

  const ultimaResumo = ultima.length > 0 ? `Última vez: ${ultima.length} série(s) registrada(s)` : null;

  return (
    <div className="rounded-xl border border-line bg-base-800 shadow-panel">
      <button type="button" onClick={onToggleExpandido} className="flex w-full items-center gap-2 p-3 text-left">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{exercicio.nome}</span>
            {completo && <span className="text-accent">✓</span>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <GrupoBadge grupo={exercicio.grupoMuscular} />
            <span className="text-[11px] text-ink-muted">
              {exercicio.series}×{exercicio.reps} · {exercicio.frequencia}
            </span>
          </div>
        </div>
        {exercicio.youtubeId && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              setVideoAberto(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                setVideoAberto(true);
              }
            }}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-base-700 text-base"
            aria-label={`Ver vídeo de ${exercicio.nome}`}
          >
            <span aria-hidden="true">🎬</span>
          </span>
        )}
        <span className="text-ink-faint" aria-hidden="true">{expandido ? "▲" : "▼"}</span>
      </button>

      {expandido && (
        <div className="border-t border-line p-3 pt-2">
          {erroSalvar && (
            <p role="alert" className="mb-2 text-[11px] font-medium text-danger">
              Não foi possível salvar a série no dispositivo. Tente novamente.
            </p>
          )}
          {exercicio.notas && (
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
              {dicasAbertas && <p className="mt-1.5 text-sm text-ink-muted">{exercicio.notas}</p>}
            </div>
          )}
          {ultimaResumo && <p className="mb-2 text-[11px] text-brand">{ultimaResumo}</p>}

          <div className="mb-1.5 text-[11px] text-ink-faint">{feitas}/{exercicio.series} séries</div>
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-1.5 text-xs">
            <span className="text-ink-faint">Série</span>
            <span className="text-ink-faint">Reps/Tempo</span>
            <span />
            {Array.from({ length: exercicio.series }, (_, i) => i + 1).map((n) => {
              const s = series.find((x) => x.serieNumero === n);
              const feita = s !== undefined && s.reps !== null;
              return <LinhaPostural key={n} n={n} feita={feita} onConfirmar={(reps) => confirmarSerie(n, reps)} />;
            })}
          </div>
        </div>
      )}

      {videoAberto && exercicio.youtubeId && (
        <VideoModal youtubeId={exercicio.youtubeId} titulo={exercicio.nome} onClose={() => setVideoAberto(false)} />
      )}
    </div>
  );
}

function LinhaPostural({ n, feita, onConfirmar }: { n: number; feita: boolean; onConfirmar: (reps: string) => void }) {
  const [feito, setFeito] = useState(feita);

  useEffect(() => setFeito(feita), [feita]);

  return (
    <>
      <span className="text-ink-muted">{n}</span>
      <span className="text-ink-faint">feito</span>
      <button
        type="button"
        onClick={() => {
          const proximo = !feito;
          setFeito(proximo);
          onConfirmar(proximo ? "1" : "");
        }}
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-base font-semibold transition-colors",
          feito
            ? "border-accent bg-accent-soft text-accent"
            : "border-brand bg-brand text-white shadow-sm hover:opacity-90 active:scale-95",
        )}
        aria-label={`Confirmar série ${n}`}
      >
        <span aria-hidden="true">✓</span>
      </button>
    </>
  );
}
