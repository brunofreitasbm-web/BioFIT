"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";
import { erroMedioCalibracao, getDataInicio, setDataInicio } from "@/lib/storage";

export function GuiaModal({ dataInicio, onDataInicioChange }: { dataInicio: string; onDataInicioChange: (iso: string) => void }) {
  const [aberto, setAberto] = useState(false);
  const [inputData, setInputData] = useState(dataInicio);
  const [calibracao, setCalibracao] = useState<ReturnType<typeof erroMedioCalibracao>>({ amostras: 0, erroMedio: null });

  function salvar() {
    setDataInicio(inputData);
    onDataInicioChange(inputData);
    setAberto(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setInputData(getDataInicio() ?? dataInicio);
          setCalibracao(erroMedioCalibracao());
          setAberto(true);
        }}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-base-800 text-ink-muted"
        aria-label="Guia do programa e configurações"
      >
        <Info aria-hidden="true" size={20} strokeWidth={1.75} />
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-black/60"
          onClick={() => setAberto(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Guia do programa"
          onKeyDown={(e) => {
            if (e.key === "Escape") setAberto(false);
          }}
        >
          <div
            className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-t-2xl border-t border-line bg-base-800 p-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Guia do programa</h2>
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="flex h-11 w-11 shrink-0 items-center justify-center text-ink-muted"
                aria-label="Fechar"
              >
                <X aria-hidden="true" size={20} strokeWidth={1.75} />
              </button>
            </div>

            <section className="mb-4 rounded-xl border border-line bg-base-700 p-3">
              <h3 className="mb-1 text-sm font-medium">Início do programa</h3>
              <p className="mb-2 text-xs text-ink-muted">
                A partir desta data o app conta as sessões da fila (rodadas, deload, troca de mesociclo) e abre a janela
                de 14 dias da aderência.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={inputData}
                  onChange={(e) => setInputData(e.target.value)}
                  className="flex-1 rounded-lg border border-line bg-base-800 px-3 py-2 text-sm text-ink"
                />
                <button type="button" onClick={salvar} className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white">
                  Salvar
                </button>
              </div>
            </section>

            {calibracao.erroMedio !== null && (
              <section className="mb-4 rounded-xl border border-line bg-base-700 p-3">
                <h3 className="mb-1 text-sm font-medium">Calibração de esforço</h3>
                <p className="text-xs text-ink-muted">
                  Erro médio (real − palpite): <strong className="text-ink">{calibracao.erroMedio > 0 ? "+" : ""}{calibracao.erroMedio}</strong>{" "}
                  reps em {calibracao.amostras} teste(s).{" "}
                  {calibracao.erroMedio > 2
                    ? "Você para cedo demais — ajuste o RIR estimado para cima."
                    : "Estimativa dentro do aceitável."}
                </p>
              </section>
            )}

            <div className="space-y-3 text-sm text-ink-muted">
              <p>
                <strong className="text-ink">Por que mudou:</strong> registro de 10/08 a 03/10 — 29 dias treinados em 8
                semanas (~3,6/sem; 3/sem nas últimas 4). O PPL 6x virou 1x/semana por músculo na prática. Este programa
                entrega ~2x/semana a 5 sessões e degrada sem buracos quando você treina menos.
              </p>
              <p>
                <strong className="text-ink">Sequência:</strong> A Upper → B Lower → C Push → D Pull → E Legs → volta ao A.
                Não existe &ldquo;treino de quarta&rdquo;. Faltou um dia? Faça o PRÓXIMO da fila. Nenhum grupo é pulado por
                causa de agenda.
              </p>
              <p>
                <strong className="text-ink">Rodada e mesociclo:</strong> 1 rodada = A+B+C+D+E (5 sessões; a 5x/semana, 1
                rodada = 1 semana). Rodadas 1–4 = treino, rodada 5 = deload. Depois troca TODOS os exercícios (coluna
                &ldquo;Meso 2&rdquo;). A rotação é por exposições (4 por exercício), não por calendário: se a semana for
                fraca, o meso alonga, mas cada exercício recebe as mesmas 4 exposições — é o que permite medir progressão.
              </p>
              <p>
                <strong className="text-ink">Rodada 1 — calibração:</strong> na ÚLTIMA série de cada exercício marcado
                &ldquo;teste de falha&rdquo;, vá até a falha técnica (a repetição fica visivelmente lenta ou a técnica
                quebra). Antes da série, anote quantas reps você ACHA que faria. A diferença entre o palpite e o real é o
                seu erro de estimativa. Só em máquina/polia — nunca em halter acima da cabeça ou búlgaro.
              </p>
              <p>
                <strong className="text-ink">Rodadas 2–4 — esforço:</strong> compostos (exercícios 1–2 de cada sessão):
                parar quando sobrarem 1–2 reps. Isolados: parar quando sobrar 0–1. Se todas as séries saem com as MESMAS
                reps, você está longe da falha — o normal em esforço real é a última série cair 1–3 reps.
              </p>
              <p>
                <strong className="text-ink">Progressão (dupla):</strong> trabalhe dentro da faixa de reps. Quando TODAS as
                séries baterem o topo da faixa com o esforço-alvo, suba a carga na próxima exposição: menor incremento
                disponível no superior (máquina 2–5 kg; halter +1–2 kg cada), +5% no inferior. Voltou para o fundo da
                faixa? Normal. Suba as reps de novo. O e1RM (Epley) compara exposições com reps diferentes: se ele sobe,
                você progrediu.
              </p>
              <p>
                <strong className="text-ink">Deload (rodada 5):</strong> metade das séries, mesmas reps, carga −10%, longe
                da falha. Serve para dissipar fadiga antes de trocar os exercícios.
              </p>
              <p>
                <strong className="text-ink">Registro de carga:</strong> CARGA TOTAL, como o número da máquina/pino mostra.
                Registre sempre na MESMA máquina. Graviton: registrar a ASSISTÊNCIA (quanto MENOR, mais difícil —
                progressão é descer o número). Leg press 45° com 50 kg &ldquo;total&rdquo; está incoerente com hack de 30
                kg: confirme se o carrinho entra no total e mantenha o critério.
              </p>
              <p>
                <strong className="text-ink">Postural:</strong> saiu do bloco diário (abandonado após 19/08) e entrou
                DENTRO das sessões A e D: face pull, Y-raise e extensão torácica em prono. Não são opcionais: são o que
                justifica o volume de puxada.
              </p>
              <p>
                <strong className="text-ink">Execução:</strong> descida controlada, sem impulso, amplitude completa. Nos
                exercícios de costas: segurar 1 s na contração.
              </p>
              <p>
                <strong className="text-ink">Gatilho de aderência:</strong> meta de 10 sessões nas primeiras 2 semanas.
                Menos de 8 → o programa cai para Upper/Lower 4x, sem renegociação.
              </p>
              <p>
                <strong className="text-ink">Restrições respeitadas:</strong> sem terra, stiff, good morning, RDL ou
                agachamento livre. Remadas com apoio de tronco (sem carga em flexão lombar).
              </p>
              <p>
                <strong className="text-ink">Volume por rodada:</strong> costas 15 · quadríceps 15 · peito 10 · deltoide
                lateral/anterior 9 · panturrilha 8 · deltoide posterior/trapézio inferior 6 · posterior de coxa 6 · bíceps 5
                · tríceps 5 · core 5 · glúteo 3 (87 séries). Costas &gt; peito de propósito (puxar:empurrar ~1,5:1 por
                causa da cifose). Se a frequência cair para 3x/semana, divida por ~1,7.
              </p>
              <p>
                <strong className="text-ink">Cardio Z2:</strong> 2x/semana, 30–40 min, 60–70% FCmáx, longe das sessões B e
                E.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
