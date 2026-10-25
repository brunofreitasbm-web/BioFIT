"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { garantirDataInicio, getCelebrado, getDataInicio, getSessaoEscolhida, setCelebrado, setSessaoEscolhida } from "@/lib/storage";
import { getStatusPrograma, sessaoSugerida as calcularSessaoSugerida, toISODate } from "@/lib/program";
import { getSessaoCompleta, SESSAO_LABEL, SESSAO_NOME } from "@/lib/exercicios";
import { gerarInsightHoje, gerarInsightProximo } from "@/lib/motivacao";
import { ExercicioCard } from "@/components/ExercicioCard";
import { GuiaModal } from "@/components/GuiaModal";
import { SeletorSessao } from "@/components/SeletorSessao";
import { TreinoTimer } from "@/components/TreinoTimer";
import { ResumoPrograma } from "@/components/ResumoPrograma";
import { PainelGamificacao } from "@/components/PainelGamificacao";
import { DiaLeveCard } from "@/components/DiaLeveCard";
import { CelebracaoModal, type DadosCelebracao } from "@/components/CelebracaoModal";
import { useGamificacao } from "@/hooks/useGamificacao";
import type { EscolhaDoDia } from "@/lib/tipos";
import { AlertTriangle, CalendarClock, Coffee, CheckCircle2 } from "lucide-react";
import { ICON } from "@/lib/icones";

const DIAS_SEMANA_LABEL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default function HojePage() {
  const [pronto, setPronto] = useState(false);
  const [dataInicio, setDataInicioState] = useState<string>("");
  const [hoje] = useState(() => new Date());
  const [escolha, setEscolha] = useState<EscolhaDoDia | null>(null);
  const [exercicioAbertoId, setExercicioAbertoId] = useState<string | null>(null);
  const [progressoPorExercicio, setProgressoPorExercicio] = useState<Record<string, { feitas: number; total: number }>>({});
  const [celebracao, setCelebracao] = useState<DadosCelebracao | null>(null);
  const [sessaoParaCelebrar, setSessaoParaCelebrar] = useState(false);
  // Sobe quando algo muda fora das séries (timer do treino, dia leve) e a gamificação precisa reler.
  const [versao, setVersao] = useState(0);
  const concluidoAntes = useRef(false);

  const hojeISO = toISODate(hoje);

  useEffect(() => {
    setDataInicioState(garantirDataInicio(hojeISO));
    setEscolha(getSessaoEscolhida(hojeISO));
    setPronto(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sessaoSugerida = pronto ? calcularSessaoSugerida(dataInicio, hojeISO) : "A";
  const sessaoEfetiva = escolha === "DESCANSO" ? null : (escolha ?? sessaoSugerida);
  const status = pronto ? getStatusPrograma(dataInicio, hojeISO, sessaoEfetiva) : null;
  const mesoAtual = status?.meso;
  const exercicios = useMemo(
    () => (sessaoEfetiva && mesoAtual !== undefined ? getSessaoCompleta(sessaoEfetiva, mesoAtual) : []),
    [sessaoEfetiva, mesoAtual],
  );

  const insightHoje = status ? gerarInsightHoje(status, sessaoEfetiva) : null;
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


  const { g, recalcular } = useGamificacao(hojeISO, `${progressoSessao.feitas}:${versao}`);

  // Treino concluído (todas as séries feitas) → comemora uma vez. Quem já comemorou este treino
  // não vê de novo ao reabrir o app.
  useEffect(() => {
    if (treinoConcluido && !concluidoAntes.current) setSessaoParaCelebrar(true);
    concluidoAntes.current = treinoConcluido;
  }, [treinoConcluido]);

  const chaveSessao = sessaoEfetiva ? `${hojeISO}:${sessaoEfetiva}` : null;
  // Treino no meio (séries feitas, ainda não concluído): segura as comemorações para não
  // interromper entre uma série e outra. Elas aparecem ao concluir.
  const emTreino = sessaoEfetiva !== null && progressoSessao.feitas > 0 && !sessaoParaCelebrar;
  useEffect(() => {
    if (!g || celebracao || emTreino) return;
    const visto = getCelebrado();
    const conquistasNovas = g.conquistas.filter((c) => c.desbloqueada && !visto.conquistas.includes(c.id));
    const novoNivel = g.nivel.nivel > visto.nivel;
    const sessaoConcluida = sessaoParaCelebrar && chaveSessao !== null && !visto.treinos.includes(chaveSessao);
    if (conquistasNovas.length > 0 || novoNivel || sessaoConcluida) setCelebracao({ sessaoConcluida, conquistasNovas, novoNivel });
  }, [g, sessaoParaCelebrar, chaveSessao, celebracao, emTreino]);

  function fecharCelebracao() {
    if (g) {
      const visto = getCelebrado();
      setCelebrado({
        conquistas: g.conquistas.filter((c) => c.desbloqueada).map((c) => c.id),
        nivel: Math.max(visto.nivel, g.nivel.nivel),
        treinos: chaveSessao && celebracao?.sessaoConcluida ? [...visto.treinos, chaveSessao].slice(-60) : visto.treinos,
      });
    }
    setSessaoParaCelebrar(false);
    setCelebracao(null);
  }

  // Treino terminado no timer (mesmo sem todas as séries) também vale comemoração.
  function aoMudarTimer(terminou: boolean) {
    if (terminou) setSessaoParaCelebrar(true);
    setVersao((v) => v + 1);
  }

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

      {g && <PainelGamificacao g={g} />}

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

      {!sessaoEfetiva && <DiaLeveCard key={`leve:${versao}`} hojeISO={hojeISO} onMudou={recalcular} />}

      {sessaoEfetiva && status && <TreinoTimer hojeISO={hojeISO} sessaoTipo={sessaoEfetiva} onMudou={aoMudarTimer} />}

      {status && <ResumoPrograma status={status} insight={insightHoje} />}
      {status?.isDeload && sessaoEfetiva && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger-soft px-3 py-2.5">
          <AlertTriangle aria-hidden="true" size={ICON.sm} className="mt-0.5 shrink-0 text-danger" />
          <p className="text-xs font-medium text-danger">
            Rodada de deload — metade das séries, mesmas reps, carga −10%, longe da falha. Depois dela, todos os
            exercícios trocam.
          </p>
        </div>
      )}

      {sessaoEfetiva && status && (
        <>
          <section className="mb-4">
            <h2 className="mb-2.5 text-base font-bold tracking-tight text-ink">{SESSAO_LABEL[sessaoEfetiva]}</h2>
            <div className="space-y-2">
              {exercicios.map((ex) => (
                <ExercicioCard
                  key={ex.id}
                  exercicio={ex}
                  status={status}
                  data={hojeISO}
                  expandido={exercicioAbertoId === ex.id}
                  onToggleExpandido={() => handleToggleExercicio(ex.id)}
                  onProgresso={handleProgresso}
                />
              ))}
            </div>
          </section>
        </>
      )}

      {insightProximo && (
        <div className="mt-2 flex gap-3 rounded-xl border border-line bg-base-800 p-3 shadow-panel">
          <CalendarClock aria-hidden="true" size={ICON.md} className="mt-0.5 shrink-0 text-ink-muted" />
          <div>
            <p className="text-sm font-semibold text-ink">{insightProximo.titulo}</p>
            <p className="mt-1 text-sm text-ink-muted">{insightProximo.mensagem}</p>
          </div>
        </div>
      )}

      {g && <CelebracaoModal g={g} dados={celebracao} onFechar={fecharCelebracao} />}
    </div>
  );
}

