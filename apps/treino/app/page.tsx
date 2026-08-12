"use client";

import { useEffect, useState } from "react";
import { getDataInicio, getSessaoEscolhida, setSessaoEscolhida, diasTreinadosPorTipo } from "@/lib/storage";
import { getStatusPrograma, sessaoDoDia, toISODate, SESSAO_LABEL, type StatusPrograma } from "@/lib/program";
import { calcularExposicao } from "@/lib/descanso";
import { exerciciosDoBloco, POSTURAL } from "@/lib/exercicios";
import { gerarInsightHoje, gerarInsightAmanha } from "@/lib/motivacao";
import { ExercicioCard } from "@/components/ExercicioCard";
import { GuiaModal, dataInicioPadrao } from "@/components/GuiaModal";
import { SeletorSessao } from "@/components/SeletorSessao";
import { TreinoTimer } from "@/components/TreinoTimer";
import { BikeIndoorCard } from "@/components/BikeIndoorCard";
import type { EscolhaDoDia } from "@/lib/tipos";


const DIAS_SEMANA_LABEL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default function HojePage() {
  const [pronto, setPronto] = useState(false);
  const [dataInicio, setDataInicioState] = useState<string>("");
  const [hoje] = useState(() => new Date());
  const [postural, setPostural] = useState(true);
  const [escolha, setEscolha] = useState<EscolhaDoDia | null>(null);

  const hojeISO = toISODate(hoje);

  useEffect(() => {
    setDataInicioState(getDataInicio() ?? dataInicioPadrao());
    setEscolha(getSessaoEscolhida(hojeISO));
    setPronto(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!pronto) return null;

  const status: StatusPrograma | null = getStatusPrograma(dataInicio, hoje);
  const sessaoSugerida = sessaoDoDia(hoje);
  const sessaoEfetiva = escolha === "DESCANSO" ? null : (escolha ?? sessaoSugerida);
  const blocoAtivo = status ? (status.isDeload ? 4 : status.bloco) : 1;
  const exposicaoAtual =
    sessaoEfetiva && status
      ? calcularExposicao(sessaoEfetiva, toISODate(status.blocoStartDate), hojeISO, diasTreinadosPorTipo(sessaoEfetiva))
      : 0;
  const exercicios = sessaoEfetiva ? exerciciosDoBloco(blocoAtivo, sessaoEfetiva) : [];

  const insightHoje = status ? gerarInsightHoje(status, hojeISO, sessaoEfetiva, exposicaoAtual) : null;
  const insightAmanha = status ? gerarInsightAmanha(status) : null;

  function escolher(valor: EscolhaDoDia) {
    setSessaoEscolhida(hojeISO, valor);
    setEscolha(valor);
  }

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

      {insightHoje && (
        <div className="mb-3 rounded-xl border border-brand-soft bg-brand-soft p-3">
          <p className="text-sm font-semibold text-accent">{insightHoje.titulo}</p>
          <p className="mt-1 text-sm text-ink-muted">{insightHoje.mensagem}</p>
        </div>
      )}

      <SeletorSessao hojeISO={hojeISO} sessaoSugerida={sessaoSugerida} valorAtual={escolha} onEscolher={escolher} />

      <BikeIndoorCard hojeISO={hojeISO} />

      {sessaoEfetiva && status && <TreinoTimer hojeISO={hojeISO} sessaoTipo={sessaoEfetiva} bloco={blocoAtivo} />}


      {status && !status.isDeload && sessaoEfetiva && (
        <p className="mb-4 text-xs text-ink-faint">
          Bloco {status.bloco} de 4 · Exposição {exposicaoAtual}/4
        </p>
      )}
      {status?.isDeload && sessaoEfetiva && (
        <p className="mb-4 text-xs text-danger">Semana de deload — metade das séries, esforço leve, cargas reduzidas em 10%.</p>
      )}

      {sessaoEfetiva && (
        <>
          <section className="mb-4">
            <button
              type="button"
              onClick={() => setPostural((v) => !v)}
              className="mb-2 flex w-full items-center justify-between text-sm font-medium text-ink-muted"
            >
              <span>Bloco postural diário (em casa, fora da academia)</span>
              <span>{postural ? "▲" : "▼"}</span>
            </button>
            {postural && (
              <div className="space-y-2">
                {POSTURAL.map((ex) => (
                  <ExercicioCard key={ex.id} exercicio={ex} data={hojeISO} />
                ))}
              </div>
            )}
          </section>

          <section className="mb-4">
            <h2 className="mb-2 text-sm font-medium text-ink-muted">{SESSAO_LABEL[sessaoEfetiva]}</h2>
            <div className="space-y-2">
              {exercicios.map((ex) => (
                <ExercicioCard key={ex.id} exercicio={ex} data={hojeISO} />
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
