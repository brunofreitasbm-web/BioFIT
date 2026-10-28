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
import { ReguaMeso } from "@/components/ReguaMeso";
import type { EscolhaDoDia, ExercicioEfetivo } from "@/lib/tipos";
import { AlertTriangle, CalendarClock, Coffee, CheckCircle2 } from "lucide-react";
import { ICON } from "@/lib/icones";
import { cn } from "@/lib/cn";
import { useDadosAtualizados } from "@/hooks/useDadosAtualizados";
import { AiCoachModal } from "@/components/ai/AiCoachModal";
import { DetalhesDoDia } from "@/components/DetalhesDoDia";
import { GarminCard, type GarminBiometria } from "@/components/GarminCard";
import { ProntidaoBanner } from "@/components/ProntidaoBanner";
import { avaliarProntidao, diasDaJanela, type AvaliacaoVfc } from "@/lib/prontidao";
import { contextoIntegrado } from "@/lib/ai/contextoIntegrado";
import type { ContextoTreinoIA, GarminJanela } from "@/lib/ai/prompts";


const DIAS_SEMANA_LABEL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MESES_LABEL = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

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
  const [garminVfc, setGarminVfc] = useState<AvaliacaoVfc | null>(null);

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
          setGarminVfc(data.vfc ?? null);
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
    () => (garminBiometria ? avaliarProntidao(diasGarmin, hojeISO, Boolean(status?.isDeload), garminVfc) : null),
    [garminBiometria, diasGarmin, hojeISO, status?.isDeload, garminVfc],
  );
  const ajusteRecuperacao = prontidao?.ajuste && !ignorarProntidao ? prontidao.ajuste : null;
  const exercicios = useMemo(
    () => (sessaoEfetiva && mesoAtual !== undefined ? getSessaoCompleta(sessaoEfetiva, mesoAtual) : []),
    [sessaoEfetiva, mesoAtual],
  );

  const aderenciaVisivel = aderencia && hojeISO <= addDiasISO(aderencia.fim, 7) ? aderencia : null;
  const alertaAderencia = aderenciaVisivel?.decisao === "CAIR_UPPER_LOWER";
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
      <header className="mb-4 flex items-end justify-between">
        <div className="flex items-end gap-3.5">
          {sessaoEfetiva && (
            <span aria-hidden="true" className="font-display text-[104px] font-bold leading-[0.8] tracking-tighter text-brand">
              {sessaoEfetiva}
            </span>
          )}
          <div className="pb-1">
            <p className="font-mono text-[13px] text-ink-muted">
              {DIAS_SEMANA_LABEL[hoje.getDay()]} · {hoje.getDate()} {MESES_LABEL[hoje.getMonth()]}
            </p>
            <h1 className="text-[26px] font-semibold leading-none text-ink">
              {sessaoEfetiva ? (
                <>
                  <span className="sr-only">Treino {sessaoEfetiva} · </span>
                  {SESSAO_NOME[sessaoEfetiva]}
                </>
              ) : (
                "Dia de descanso"
              )}
            </h1>
          </div>
        </div>
        <GuiaModal dataInicio={dataInicio} onDataInicioChange={setDataInicioState} />
      </header>

      {sessaoEfetiva && status && <ReguaMeso status={status} />}

      {sessaoEfetiva && exercicios.length > 0 && (
        <div className="sticky top-0 z-10 -mx-4 mb-3 vidro-barra border-b px-4 py-2">
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
              className={cn(
                "h-full rounded-full transition-[width,background-color] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
                treinoConcluido ? "bg-accent" : "bg-gradient-to-r from-brand to-brand-hover shadow-[0_0_10px_rgb(var(--c-brand)/0.5)]",
              )}
              style={{ width: `${progressoSessaoPct}%` }}
            />
          </div>
        </div>
      )}

      {sessaoEfetiva && status && <TreinoTimer key={`timer:${versaoDados}`} hojeISO={hojeISO} sessaoTipo={sessaoEfetiva} />}

      {status?.isDeload && sessaoEfetiva && (
        <p className="mb-3 flex items-center gap-2 rounded-xl border border-danger/30 bg-danger-soft px-3 py-2.5 text-xs font-semibold text-danger">
          <AlertTriangle aria-hidden="true" size={ICON.sm} className="shrink-0" />
          Deload: metade das séries, carga −10%, longe da falha
        </p>
      )}

      {sessaoEfetiva && status && <ProntidaoBanner prontidao={prontidao} ignorado={ignorarProntidao} onAlternar={alternarProntidao} />}

      {!sessaoEfetiva && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border vidro p-4 shadow-panel">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Coffee aria-hidden="true" size={ICON.md} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-ink">Dia de recuperação</h2>
            <p className="text-xs text-ink-muted">Hidratação e sono contam como treino hoje.</p>
          </div>
        </div>
      )}

      {sessaoEfetiva && status && (
        <section className="mb-4">
          <h2 className="mb-2.5 text-base font-bold tracking-tight text-ink">{SESSAO_LABEL[sessaoEfetiva]}</h2>
          <ol className="relative">
            <span aria-hidden="true" className="absolute bottom-4 left-4 top-4 w-0.5 -translate-x-1/2 bg-line/60" />
            {exercicios.map((ex, i) => {
              const p = progressoPorExercicio[ex.id];
              const feito = Boolean(p && p.total > 0 && p.feitas >= p.total);
              const aberto = exercicioAbertoId === ex.id;
              return (
                <li key={`${ex.id}:${versaoDados}`} className="relative flex gap-3 pb-2.5">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 font-mono text-sm font-semibold",
                      feito && "border-accent bg-accent text-on-solid",
                      !feito && aberto && "border-brand bg-brand text-on-solid",
                      !feito && !aberto && "border-line bg-base-900 text-ink",
                    )}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <ExercicioCard
                      exercicio={ex}
                      status={status}
                      data={hojeISO}
                      expandido={aberto}
                      onToggleExpandido={() => handleToggleExercicio(ex.id)}
                      onProgresso={handleProgresso}
                      onConsultarCoach={handleAbrirCoach}
                      ajusteRecuperacao={ajusteRecuperacao}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <DetalhesDoDia forcarAberto={!sessaoEfetiva || alertaAderencia}>
        <SeletorSessao hojeISO={hojeISO} sessaoSugerida={sessaoSugerida} valorAtual={escolha} onEscolher={escolher} />

        <GarminCard biometria={garminBiometria} carregando={garminCarregando} prontidao={prontidao} dias={diasGarmin} hojeISO={hojeISO} vfc={garminVfc} />

        {status && <ResumoPrograma status={status} aderencia={aderenciaVisivel} insight={insightHoje} />}

        <BikeIndoorCard key={`bike:${versaoDados}`} hojeISO={hojeISO} />

        {insightProximo && (
          <div className="mt-2 flex gap-3 rounded-xl border vidro p-3 shadow-panel">
            <CalendarClock aria-hidden="true" size={ICON.md} className="mt-0.5 shrink-0 text-ink-muted" />
            <div>
              <p className="text-sm font-semibold text-ink">{insightProximo.titulo}</p>
              <p className="mt-1 text-sm text-ink-muted">{insightProximo.mensagem}</p>
            </div>
          </div>
        )}
      </DetalhesDoDia>

      <AiCoachModal
        aberto={coachAberto}
        onFechar={() => setCoachAberto(false)}
        contextoInicial={contextoCoach}
      />
    </div>
  );
}

