"use client";

import { useEffect, useState } from "react";
import { getDataInicio, getSessaoEscolhida, setSessaoEscolhida } from "@/lib/storage";
import { getStatusPrograma, sessaoDoDia, toISODate, SESSAO_LABEL, type StatusPrograma } from "@/lib/program";
import { POSTURAL } from "@/lib/exercicios";
import { getSessaoCompleta } from "@/lib/programaAtual";
import { gerarInsightHoje, gerarInsightAmanha } from "@/lib/motivacao";
import { progressoSemana, progressoCiclo } from "@/lib/progresso";
import { ExercicioCard } from "@/components/ExercicioCard";
import { ExercicioPosturalCard } from "@/components/ExercicioPosturalCard";
import { GuiaModal, dataInicioPadrao } from "@/components/GuiaModal";
import { SeletorSessao } from "@/components/SeletorSessao";
import { TreinoTimer } from "@/components/TreinoTimer";
import { BikeIndoorCard } from "@/components/BikeIndoorCard";
import { ProgressoBloco } from "@/components/ProgressoBloco";
import { ProgressoCiclo } from "@/components/ProgressoCiclo";
import type { EscolhaDoDia } from "@/lib/tipos";


const DIAS_SEMANA_LABEL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default function HojePage() {
  const [pronto, setPronto] = useState(false);
  const [dataInicio, setDataInicioState] = useState<string>("");
  const [hoje] = useState(() => new Date());
  const [postural, setPostural] = useState(false);
  const [escolha, setEscolha] = useState<EscolhaDoDia | null>(null);
  const [exercicioAbertoId, setExercicioAbertoId] = useState<string | null>(null);
  const [posturalAbertoId, setPosturalAbertoId] = useState<string | null>(null);
  const [progressoPorExercicio, setProgressoPorExercicio] = useState<Record<string, { feitas: number; total: number }>>({});

  const hojeISO = toISODate(hoje);

  useEffect(() => {
    setDataInicioState(getDataInicio() ?? dataInicioPadrao());
    setEscolha(getSessaoEscolhida(hojeISO));
    setPronto(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status: StatusPrograma | null = pronto ? getStatusPrograma(dataInicio, hoje) : null;
  const sessaoSugerida = sessaoDoDia(hoje);
  const sessaoEfetiva = escolha === "DESCANSO" ? null : (escolha ?? sessaoSugerida);
  const exercicios = sessaoEfetiva ? getSessaoCompleta(sessaoEfetiva) : [];

  const insightHoje = status ? gerarInsightHoje(status, hojeISO, sessaoEfetiva) : null;
  const insightAmanha = status ? gerarInsightAmanha(status) : null;

  // Fluxo guiado: mantém só um exercício da sessão principal aberto por vez. Ao completar
  // todas as séries do exercício aberto, avança sozinho para o próximo pendente da lista.
  // Precisa vir antes de qualquer `return` condicional para não violar a ordem dos hooks.
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

  if (!pronto) {
    return (
      <div className="p-4" aria-hidden="true">
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

  function escolher(valor: EscolhaDoDia) {
    setSessaoEscolhida(hojeISO, valor);
    setEscolha(valor);
  }

  function handleProgresso(exercicioId: string, feitas: number, total: number) {
    setProgressoPorExercicio((prev) => {
      const atual = prev[exercicioId];
      if (atual && atual.feitas === feitas && atual.total === total) return prev;
      return { ...prev, [exercicioId]: { feitas, total } };
    });
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

  return (
    <div className="p-4">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-ink-faint">{DIAS_SEMANA_LABEL[hoje.getDay()]}</p>
          <h1 className="text-xl font-semibold">
            {sessaoEfetiva ? `Treino de hoje: ${sessaoEfetiva}` : "Hoje é descanso"}
          </h1>
        </div>
        <GuiaModal dataInicio={dataInicio} onDataInicioChange={setDataInicioState} />
      </header>

      {sessaoEfetiva && exercicios.length > 0 && (
        <div className="sticky top-0 z-10 -mx-4 mb-3 border-b border-line bg-base-900/95 px-4 py-2 shadow-[0_2px_8px_rgba(20,22,26,0.06)] backdrop-blur">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-ink">Sessão de hoje</span>
            <span className="text-ink-muted">
              {progressoSessao.feitas} de {progressoSessao.total} séries
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-base-600">
            <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${progressoSessaoPct}%` }} />
          </div>
        </div>
      )}

      {insightHoje && (
        <div className="mb-3 rounded-xl border border-brand-soft bg-brand-soft p-3">
          <p className="text-sm font-semibold text-accent">{insightHoje.titulo}</p>
          <p className="mt-1 text-sm text-ink-muted">{insightHoje.mensagem}</p>
        </div>
      )}

      <SeletorSessao hojeISO={hojeISO} sessaoSugerida={sessaoSugerida} valorAtual={escolha} onEscolher={escolher} />

      <BikeIndoorCard hojeISO={hojeISO} />

      {sessaoEfetiva && status && <TreinoTimer hojeISO={hojeISO} sessaoTipo={sessaoEfetiva} />}

      {status && (
        <>
          <ProgressoBloco info={progressoSemana(status)} />
          <ProgressoCiclo segmentos={progressoCiclo(status)} />
        </>
      )}
      {status?.isDeload && sessaoEfetiva && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger-soft px-3 py-2.5">
          <span aria-hidden="true" className="mt-0.5 text-danger">⚠</span>
          <p className="text-xs font-medium text-danger">
            Semana de deload — metade das séries, esforço leve, cargas reduzidas em 10%.
          </p>
        </div>
      )}

      {sessaoEfetiva && (
        <>
          <section className="mb-4">
            <button
              type="button"
              onClick={() => setPostural((v) => !v)}
              aria-expanded={postural}
              className="mb-2 flex min-h-11 w-full items-center justify-between text-sm font-medium text-ink-muted"
            >
              <span>Bloco postural diário (em casa, fora da academia)</span>
              <span aria-hidden="true">{postural ? "▲" : "▼"}</span>
            </button>
            {postural && (
              <div className="space-y-2">
                {POSTURAL.map((ex) => (
                  <ExercicioPosturalCard
                    key={ex.id}
                    exercicio={ex}
                    data={hojeISO}
                    expandido={posturalAbertoId === ex.id}
                    onToggleExpandido={() => setPosturalAbertoId((atual) => (atual === ex.id ? null : ex.id))}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="mb-4">
            <h2 className="mb-2 text-sm font-medium text-ink-muted">{SESSAO_LABEL[sessaoEfetiva]}</h2>
            <div className="space-y-2">
              {exercicios.map((ex) => (
                <ExercicioCard
                  key={ex.id}
                  exercicio={ex}
                  data={hojeISO}
                  expandido={exercicioAbertoId === ex.id}
                  onToggleExpandido={() => setExercicioAbertoId((atual) => (atual === ex.id ? null : ex.id))}
                  onProgresso={handleProgresso}
                />
              ))}
            </div>
          </section>
        </>
      )}

      {insightAmanha && (
        <div className="mt-2 rounded-xl border border-line bg-base-800 p-3">
          <p className="text-sm font-semibold">{insightAmanha.titulo}</p>
          <p className="mt-1 text-sm text-ink-muted">{insightAmanha.mensagem}</p>
        </div>
      )}
    </div>
  );
}
