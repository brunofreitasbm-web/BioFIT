"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getDataInicio, getSessaoEscolhida, migrarParaMeso1, seriesDoExercicioNaData, setSessaoEscolhida, ultimaExecucao } from "@/lib/storage";
import { recordesPessoais } from "@/lib/relatorio";
import { addDiasISO, getStatusAderencia, getStatusPrograma, sessaoSugerida as calcularSessaoSugerida, toISODate } from "@/lib/program";
import { getSessaoCompleta, SESSAO_LABEL, SESSAO_NOME } from "@/lib/exercicios";
import { calcularStreak, gerarInsightHoje, gerarInsightProximo } from "@/lib/motivacao";
import { ExercicioCard } from "@/components/ExercicioCard";
import { GuiaModal } from "@/components/GuiaModal";
import { SeletorSessao } from "@/components/SeletorSessao";
import { TreinoTimer } from "@/components/TreinoTimer";
import { BikeIndoorCard } from "@/components/BikeIndoorCard";
import { ResumoPrograma } from "@/components/ResumoPrograma";
import type { EscolhaDoDia, ExercicioEfetivo } from "@/lib/tipos";
import { AlertTriangle, CalendarClock, Coffee, CheckCircle2 } from "lucide-react";
import { ICON } from "@/lib/icones";
import { useDadosAtualizados } from "@/hooks/useDadosAtualizados";
import { AiCoachModal } from "@/components/ai/AiCoachModal";
import { AiCoachFloatingButton } from "@/components/ai/AiCoachFloatingButton";
import { GarminCard, type GarminBiometria } from "@/components/GarminCard";
import { ProntidaoBanner } from "@/components/ProntidaoBanner";
import { avaliarProntidao, diasDaJanela } from "@/lib/prontidao";
import { contextoIntegrado } from "@/lib/ai/contextoIntegrado";
import type { ContextoTreinoIA, GarminJanela } from "@/lib/ai/prompts";


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
  const [garminBiometria, setGarminBiometria] = useState<GarminBiometria | null>(null);
  const [garminCarregando, setGarminCarregando] = useState(false);
  const [garminJanela, setGarminJanela] = useState<GarminJanela | null>(null);

  const hojeISO = toISODate(hoje);
  // Preferência só deste aparelho (não entra no backup): "ignorar o ajuste de recuperação hoje".
  const [ignorarProntidao, setIgnorarProntidao] = useState(false);
  useEffect(() => {
    try {
      setIgnorarProntidao(localStorage.getItem(`biofit-ui:prontidao-ignorada:${hojeISO}`) === "1");
    } catch {
      // armazenamento indisponível: o ajuste fica ligado
    }
  }, [hojeISO]);
  function alternarProntidao() {
    const novo = !ignorarProntidao;
    setIgnorarProntidao(novo);
    try {
      if (novo) localStorage.setItem(`biofit-ui:prontidao-ignorada:${hojeISO}`, "1");
      else localStorage.removeItem(`biofit-ui:prontidao-ignorada:${hojeISO}`);
    } catch {
      // idem
    }
  }
  // Sobe quando o sync traz algo gravado fora deste aparelho (ex.: pelo MCP): remonta os
  // cards que leem o storage no mount.
  const versaoDados = useDadosAtualizados();

  useEffect(() => {
    migrarParaMeso1(hojeISO);
    setPronto(true);
    // Carrega métricas biométricas do Garmin
    setGarminCarregando(true);
    fetch("/api/garmin/today")
      .then((r) => r.json())
      .then((data) => {
        if (data?.disponivel && data.biometria) {
          setGarminBiometria(data.biometria);
          setGarminJanela(data.janela ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setGarminCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setDataInicioState(getDataInicio() ?? hojeISO);
    setEscolha(getSessaoEscolhida(hojeISO));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versaoDados]);

  const sessaoSugerida = pronto ? calcularSessaoSugerida(dataInicio, hojeISO) : "A";
  const sessaoEfetiva = escolha === "DESCANSO" ? null : (escolha ?? sessaoSugerida);
  const status = pronto ? getStatusPrograma(dataInicio, hojeISO, sessaoEfetiva) : null;
  const aderencia = pronto ? getStatusAderencia(dataInicio, hojeISO) : null;
  const mesoAtual = status?.meso;
  const diasGarmin = useMemo(() => diasDaJanela(garminJanela?.diario ?? []), [garminJanela]);
  const prontidao = useMemo(
    () => (garminBiometria ? avaliarProntidao(diasGarmin, hojeISO, Boolean(status?.isDeload)) : null),
    [garminBiometria, diasGarmin, hojeISO, status?.isDeload],
  );
  const ajusteRecuperacao = prontidao?.ajuste && !ignorarProntidao ? prontidao.ajuste : null;
  const exercicios = useMemo(
    () => (sessaoEfetiva && mesoAtual !== undefined ? getSessaoCompleta(sessaoEfetiva, mesoAtual) : []),
    [sessaoEfetiva, mesoAtual],
  );

  const insightHoje = status ? gerarInsightHoje(status, hojeISO, sessaoEfetiva) : null;
  const insightProximo = status ? gerarInsightProximo(sessaoEfetiva, sessaoSugerida, status.meso) : null;

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
    biometriaGarmin: garminBiometria ? {
      bodyBattery: garminBiometria.bodyBattery ?? undefined,
      sonoHoras: garminBiometria.sonoHoras ?? undefined,
      stress: garminBiometria.stress ?? undefined,
      hrvStatus: garminBiometria.hrvStatus ?? undefined,
    } : null,
    streakDias: calcularStreak(hojeISO),
    ...(coachAberto ? contextoIntegrado(garminJanela) : {}),
  } : null;

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
    <div className="p-4">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-ink-muted">{DIAS_SEMANA_LABEL[hoje.getDay()]}</p>
          <h1 className="text-3xl font-extrabold uppercase leading-none text-ink">
            {sessaoEfetiva ? `Treino ${sessaoEfetiva} · ${SESSAO_NOME[sessaoEfetiva]}` : "Hoje é dia de descanso"}
          </h1>
        </div>
        <GuiaModal dataInicio={dataInicio} onDataInicioChange={setDataInicioState} />
      </header>

      {sessaoEfetiva && exercicios.length > 0 && (
        <div className="sticky top-0 z-10 -mx-4 mb-3 border-b border-line bg-base-800/95 px-4 py-2 shadow-panel backdrop-blur">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-semibold text-ink">
              {treinoConcluido ? (
                <>
                  <CheckCircle2 size={ICON.md} className="anim-confirmar text-accent" />
                  <span>Treino Concluído!</span>
                </>
              ) : (
                <span>Progresso da Sessão</span>
              )}
            </span>
            <span className="font-medium text-ink-muted">
              {progressoSessao.feitas} de {progressoSessao.total} séries ({Math.round(progressoSessaoPct)}%)
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-base-600">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
              style={{ width: `${progressoSessaoPct}%` }}
            />
          </div>
        </div>
      )}

      <SeletorSessao hojeISO={hojeISO} sessaoSugerida={sessaoSugerida} valorAtual={escolha} onEscolher={escolher} />

      {!sessaoEfetiva && (
        <div className="mb-4 flex flex-col items-center justify-center rounded-xl border border-line bg-base-800 p-5 text-center shadow-panel">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Coffee size={ICON.lg} />
          </div>
          <h2 className="text-base font-semibold text-ink">Recuperação Muscular Ativa</h2>
          <p className="mt-1 text-xs text-ink-muted">
            O descanso planejado é fundamental para a hipertrofia e reconstrução tecidual. Mantenha a hidratação e priorize boas horas de sono!
          </p>
        </div>
      )}

      <GarminCard biometria={garminBiometria} carregando={garminCarregando} prontidao={prontidao} dias={diasGarmin} hojeISO={hojeISO} />

      {sessaoEfetiva && status && <TreinoTimer key={`timer:${versaoDados}`} hojeISO={hojeISO} sessaoTipo={sessaoEfetiva} />}

      {status && (
        <ResumoPrograma
          status={status}
          aderencia={aderencia && hojeISO <= addDiasISO(aderencia.fim, 7) ? aderencia : null}
          insight={insightHoje}
        />
      )}
      {status?.isDeload && sessaoEfetiva && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger-soft px-3 py-2.5">
          <AlertTriangle aria-hidden="true" size={ICON.sm} className="mt-0.5 shrink-0 text-danger" />
          <p className="text-xs font-medium text-danger">
            Rodada de deload — metade das séries, mesmas reps, carga −10%, longe da falha. Depois dela, todos os
            exercícios trocam.
          </p>
        </div>
      )}

      {sessaoEfetiva && status && <ProntidaoBanner prontidao={prontidao} ignorado={ignorarProntidao} onAlternar={alternarProntidao} />}

      {sessaoEfetiva && status && (
        <>
          <section className="mb-4">
            <h2 className="mb-2.5 text-base font-bold tracking-tight text-ink">{SESSAO_LABEL[sessaoEfetiva]}</h2>
            <div className="space-y-2">
              {exercicios.map((ex) => (
                <ExercicioCard
                  key={`${ex.id}:${versaoDados}`}
                  exercicio={ex}
                  status={status}
                  data={hojeISO}
                  expandido={exercicioAbertoId === ex.id}
                  onToggleExpandido={() => handleToggleExercicio(ex.id)}
                  onProgresso={handleProgresso}
                  onConsultarCoach={handleAbrirCoach}
                  ajusteRecuperacao={ajusteRecuperacao}
                />
              ))}
            </div>
          </section>
        </>
      )}

      <BikeIndoorCard key={`bike:${versaoDados}`} hojeISO={hojeISO} />

      {insightProximo && (
        <div className="mt-2 flex gap-3 rounded-xl border border-line bg-base-800 p-3 shadow-panel">
          <CalendarClock aria-hidden="true" size={ICON.md} className="mt-0.5 shrink-0 text-ink-muted" />
          <div>
            <p className="text-sm font-semibold text-ink">{insightProximo.titulo}</p>
            <p className="mt-1 text-sm text-ink-muted">{insightProximo.mensagem}</p>
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

