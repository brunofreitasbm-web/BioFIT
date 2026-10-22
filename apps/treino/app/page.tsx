"use client";

import { useCallback, useEffect, useState } from "react";
import { getDataInicio, getSessaoEscolhida, migrarParaMeso1, setSessaoEscolhida } from "@/lib/storage";
import { addDiasISO, getStatusAderencia, getStatusPrograma, sessaoSugerida as calcularSessaoSugerida, toISODate } from "@/lib/program";
import { getSessaoCompleta, SESSAO_LABEL, SESSAO_NOME } from "@/lib/exercicios";
import { gerarInsightHoje, gerarInsightProximo, labelRodada } from "@/lib/motivacao";
import { cn } from "@/lib/cn";
import { ExercicioCard } from "@/components/ExercicioCard";
import { GuiaModal } from "@/components/GuiaModal";
import { SeletorSessao } from "@/components/SeletorSessao";
import { TreinoTimer } from "@/components/TreinoTimer";
import { BikeIndoorCard } from "@/components/BikeIndoorCard";
import { ProgressoMeso } from "@/components/ProgressoMeso";
import { AderenciaCard } from "@/components/AderenciaCard";
import type { EscolhaDoDia } from "@/lib/tipos";
import { AlertTriangle, ArrowRight, Coffee, CheckCircle2, Sparkles } from "lucide-react";
import { AiCoachModal } from "@/components/ai/AiCoachModal";
import { AiCoachFloatingButton } from "@/components/ai/AiCoachFloatingButton";
import { calcularStreak } from "@/lib/motivacao";
import { recordesPessoais } from "@/lib/relatorio";
import { seriesDoExercicioNaData, ultimaExecucao } from "@/lib/storage";
import type { ContextoTreinoIA } from "@/lib/ai/prompts";
import type { ExercicioEfetivo } from "@/lib/tipos";


const DIAS_SEMANA_LABEL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default function HojePage() {
  const [pronto, setPronto] = useState(false);
  const [dataInicio, setDataInicioState] = useState<string>("");
  const [hoje] = useState(() => new Date());
  const [escolha, setEscolha] = useState<EscolhaDoDia | null>(null);
  const [exercicioAbertoId, setExercicioAbertoId] = useState<string | null>(null);
  const [progressoPorExercicio, setProgressoPorExercicio] = useState<Record<string, { feitas: number; total: number }>>({});
  const [coachAberto, setCoachAberto] = useState(false);
  const [coachExercicio, setCoachExercicio] = useState<ExercicioEfetivo | null>(null);

  const hojeISO = toISODate(hoje);

  useEffect(() => {
    migrarParaMeso1(hojeISO);
    setDataInicioState(getDataInicio() ?? hojeISO);
    setEscolha(getSessaoEscolhida(hojeISO));
    setPronto(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sessaoSugerida = pronto ? calcularSessaoSugerida(dataInicio, hojeISO) : "A";
  const sessaoEfetiva = escolha === "DESCANSO" ? null : (escolha ?? sessaoSugerida);
  const status = pronto ? getStatusPrograma(dataInicio, hojeISO, sessaoEfetiva) : null;
  const aderencia = pronto ? getStatusAderencia(dataInicio, hojeISO) : null;
  const exercicios = sessaoEfetiva && status ? getSessaoCompleta(sessaoEfetiva, status.meso) : [];

  const insightHoje = status ? gerarInsightHoje(status, hojeISO, sessaoEfetiva) : null;
  const insightProximo = status ? gerarInsightProximo(sessaoEfetiva, sessaoSugerida, status.meso) : null;

  const handleAbrirCoach = useCallback((ex?: ExercicioEfetivo) => {
    setCoachExercicio(ex ?? (exercicioAbertoId ? exercicios.find((e) => e.id === exercicioAbertoId) ?? null : null));
    setCoachAberto(true);
  }, [exercicioAbertoId, exercicios]);

  const contextoCoach: ContextoTreinoIA | null = status ? {
    sessao: sessaoEfetiva,
    sessaoNome: sessaoEfetiva ? SESSAO_NOME[sessaoEfetiva] : undefined,
    statusPrograma: {
      meso: status.meso,
      rodada: status.rodada,
      isDeload: status.isDeload,
    },
    exercicioAtual: coachExercicio ? {
      id: coachExercicio.id,
      nome: coachExercicio.nome,
      grupoMuscular: coachExercicio.grupoMuscular,
      seriesPrescritas: coachExercicio.series,
      repsPrescritas: coachExercicio.reps,
      descanso: coachExercicio.descanso,
      partida: coachExercicio.partida,
      composto: coachExercicio.composto,
      notas: coachExercicio.notas,
    } : null,
    seriesHoje: coachExercicio ? seriesDoExercicioNaData(coachExercicio.id, hojeISO) : undefined,
    historicoUltimaSessao: coachExercicio ? ultimaExecucao(coachExercicio.id, hojeISO) : undefined,
    recorde1RM: coachExercicio ? recordesPessoais(coachExercicio.id, hojeISO).melhor1RM?.kg ?? null : null,
    streakDias: calcularStreak(hojeISO),
  } : null;

  // Fluxo guiado: mantém só um exercício da sessão principal aberto por vez. Ao completar
  // todas as séries do exercício aberto, avança sozinho para o próximo pendente da lista.
  useEffect(() => {
    if (exercicios.length === 0) {
      setExercicioAbertoId(null);
      return;
    }
    setExercicioAbertoId((atual) => {
      if (atual) {
        const aindaNaLista = exercicios.some((e) => e.id === atual);
        const p = progressoPorExercicio[atual];
        if (aindaNaLista && (!p || p.feitas < p.total)) return atual;
      }
      const proximo = exercicios.find((e) => {
        const p = progressoPorExercicio[e.id];
        return !p || p.feitas < p.total;
      });
      return proximo ? proximo.id : null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessaoEfetiva, progressoPorExercicio]);

  const handleToggleExercicio = useCallback((id: string) => {
    setExercicioAbertoId((atual) => (atual === id ? null : id));
  }, []);

  function escolher(valor: EscolhaDoDia) {
    setSessaoEscolhida(hojeISO, valor);
    setEscolha(valor);
  }

  const handleProgresso = useCallback((exercicioId: string, feitas: number, total: number) => {
    setProgressoPorExercicio((prev) => {
      const atual = prev[exercicioId];
      if (atual && atual.feitas === feitas && atual.total === total) return prev;
      return { ...prev, [exercicioId]: { feitas, total } };
    });
  }, []);

  if (!pronto) {
    return (
      <div className="p-4" aria-busy="true" aria-live="polite">
        <span className="sr-only">Carregando dados do treino do dia...</span>
        <div className="mb-4 animate-pulse space-y-2">
          <div className="h-3 w-20 rounded bg-base-600" />
          <div className="h-6 w-48 rounded bg-base-600" />
        </div>
        <div className="animate-pulse space-y-2">
          <div className="h-24 rounded-xl bg-base-600" />
          <div className="h-16 rounded-xl bg-base-600" />
          <div className="h-16 rounded-xl bg-base-600" />
        </div>
      </div>
    );
  }

  const progressoSessao = exercicios.reduce(
    (acc, ex) => {
      const p = progressoPorExercicio[ex.id];
      const total = p?.total ?? ex.series;
      const feitas = p ? Math.min(p.feitas, total) : 0;
      return { feitas: acc.feitas + feitas, total: acc.total + total };
    },
    { feitas: 0, total: 0 },
  );
  const progressoSessaoPct = progressoSessao.total > 0 ? Math.min(100, (progressoSessao.feitas / progressoSessao.total) * 100) : 0;
  const treinoConcluido = progressoSessao.total > 0 && progressoSessao.feitas >= progressoSessao.total;

  return (
    <div className="px-4 pb-4 pt-5">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">
            {DIAS_SEMANA_LABEL[hoje.getDay()]}
            {status && ` · ${labelRodada(status)}`}
          </p>
          <h1 className="mt-1 font-display text-[2rem] font-bold uppercase leading-none tracking-tight text-ink">
            {sessaoEfetiva ? (
              <>
                Treino {sessaoEfetiva} <span className="text-ink-faint">·</span> {SESSAO_NOME[sessaoEfetiva]}
              </>
            ) : (
              "Dia de descanso"
            )}
          </h1>
        </div>
        <GuiaModal dataInicio={dataInicio} onDataInicioChange={setDataInicioState} />
      </header>

      {sessaoEfetiva && exercicios.length > 0 && (
        <div className="sticky top-0 z-10 -mx-4 mb-4 border-b border-line bg-base-900/90 px-4 py-2.5 backdrop-blur">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-semibold uppercase tracking-wide text-ink">
              {treinoConcluido ? (
                <>
                  <CheckCircle2 aria-hidden="true" size={15} className="text-accent" />
                  Treino concluído
                </>
              ) : (
                "Sessão"
              )}
            </span>
            <span className="tabular-nums text-ink-muted">
              <span className="font-display text-base font-bold text-ink">{progressoSessao.feitas}</span>/{progressoSessao.total} séries
            </span>
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-base-600"
            role="progressbar"
            aria-label="Séries concluídas na sessão"
            aria-valuemin={0}
            aria-valuemax={progressoSessao.total}
            aria-valuenow={progressoSessao.feitas}
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-300 ease-out",
                treinoConcluido ? "bg-accent" : "bg-brand",
              )}
              style={{ width: `${progressoSessaoPct}%` }}
            />
          </div>
        </div>
      )}

      <SeletorSessao hojeISO={hojeISO} sessaoSugerida={sessaoSugerida} valorAtual={escolha} onEscolher={escolher} />

      {status && <ProgressoMeso status={status} />}

      {sessaoEfetiva && status && <TreinoTimer hojeISO={hojeISO} sessaoTipo={sessaoEfetiva} />}

      {status?.isDeload && sessaoEfetiva && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger-soft px-3 py-2.5">
          <AlertTriangle aria-hidden="true" size={16} strokeWidth={2.25} className="mt-0.5 shrink-0 text-danger" />
          <p className="text-xs font-medium text-danger">
            Rodada de deload — metade das séries, mesmas reps, carga −10%, longe da falha. Depois dela, todos os
            exercícios trocam.
          </p>
        </div>
      )}

      {insightHoje && (
        <div className="mb-4 rounded-xl border border-line border-l-[3px] border-l-brand bg-base-800 p-3">
          <p className="text-sm font-semibold text-ink">{insightHoje.titulo}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">{insightHoje.mensagem}</p>
        </div>
      )}

      {!sessaoEfetiva && (
        <div className="mb-4 flex flex-col items-center justify-center rounded-2xl border border-line bg-base-800 p-6 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            <Coffee aria-hidden="true" size={24} strokeWidth={2} />
          </div>
          <h2 className="font-display text-xl font-bold uppercase tracking-tight text-ink">Recuperação</h2>
          <p className="mt-1 max-w-xs text-sm text-ink-muted">
            O descanso faz parte do plano. Hidratação, sono e, se quiser, cardio Z2 leve.
          </p>
        </div>
      )}

      {sessaoEfetiva && status && (
        <section className="mb-5" aria-labelledby="titulo-sessao">
          <h2 id="titulo-sessao" className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
            {SESSAO_LABEL[sessaoEfetiva]}
          </h2>
          <div className="space-y-2.5">
            {exercicios.map((ex) => (
              <ExercicioCard
                key={ex.id}
                exercicio={ex}
                status={status}
                data={hojeISO}
                expandido={exercicioAbertoId === ex.id}
                onToggleExpandido={() => handleToggleExercicio(ex.id)}
                onProgresso={handleProgresso}
                onConsultarCoach={handleAbrirCoach}
              />
            ))}
          </div>
        </section>
      )}

      {aderencia && hojeISO <= addDiasISO(aderencia.fim, 7) && <AderenciaCard aderencia={aderencia} />}

      <BikeIndoorCard hojeISO={hojeISO} />

      {insightProximo && (
        <div className="flex items-start gap-3 rounded-xl border border-line bg-base-800 p-3">
          <ArrowRight aria-hidden="true" size={18} strokeWidth={2} className="mt-0.5 shrink-0 text-brand" />
          <div>
            <p className="text-sm font-semibold text-ink">{insightProximo.titulo}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">{insightProximo.mensagem}</p>
          </div>
        </div>
      )}

      <AiCoachFloatingButton onClick={() => handleAbrirCoach()} />

      <AiCoachModal
        aberto={coachAberto}
        onFechar={() => setCoachAberto(false)}
        contextoInicial={contextoCoach}
      />
    </div>
  );
}
