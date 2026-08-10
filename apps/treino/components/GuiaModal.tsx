"use client";

import { useState } from "react";
import { toISODate } from "@/lib/program";
import { getDataInicio, setDataInicio } from "@/lib/storage";

export function GuiaModal({ dataInicio, onDataInicioChange }: { dataInicio: string; onDataInicioChange: (iso: string) => void }) {
  const [aberto, setAberto] = useState(false);
  const [inputData, setInputData] = useState(dataInicio);

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
          setAberto(true);
        }}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-base-800 text-ink-muted"
        aria-label="Guia do programa e configurações"
      >
        ⓘ
      </button>

      {aberto && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60" onClick={() => setAberto(false)}>
          <div
            className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-t-2xl border-t border-line bg-base-800 p-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Guia do programa</h2>
              <button type="button" onClick={() => setAberto(false)} className="text-ink-muted">
                ✕
              </button>
            </div>

            <section className="mb-4 rounded-xl border border-line bg-base-700 p-3">
              <h3 className="mb-1 text-sm font-medium">Início do Bloco 1</h3>
              <p className="mb-2 text-xs text-ink-muted">Define a partir de qual data o app calcula bloco, exposição e deload.</p>
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

            <div className="space-y-3 text-sm text-ink-muted">
              <p>
                <strong className="text-ink">Estrutura:</strong> Push / Pull / Legs 2x por semana (Seg-Sáb, Dom off). Cada
                sessão: aquecimento + bloco postural (6-8 min) + 5 exercícios × 3 séries.
              </p>
              <p>
                <strong className="text-ink">Rotação:</strong> 4 blocos de 15 dias. A cada bloco os exercícios mudam, mas o
                padrão de movimento e o grupo muscular se mantêm.
              </p>
              <p>
                <strong className="text-ink">Progressão:</strong> Exposição 1 = RIR 3 · Exp. 2 = RIR 2-3 · Exp. 3 = RIR 2 ·
                Exp. 4 = RIR 1-2. Ao fechar o topo da faixa de reps no RIR alvo em todas as séries, suba 2,5% (superiores) ou
                5% (inferiores) na exposição seguinte.
              </p>
              <p>
                <strong className="text-ink">Ciclo completo:</strong> Blocos 1→2→3→4 (8 semanas) → semana 9 = deload (metade
                das séries, RIR 4, cargas do Bloco 4 reduzidas em 10%) → reinicia no Bloco 1.
              </p>
              <p>
                <strong className="text-ink">Cadência:</strong> Compostos: excêntrica 2-3 s. Acessórios e postural:
                excêntrica 3-4 s. Sem balanço, sem encurtar amplitude para subir carga.
              </p>
              <p>
                <strong className="text-ink">Postura (cifose):</strong> Bloco postural diário fixo (não rotaciona) + razão
                puxar:empurrar ~1,5:1 + cues de retração escapular. Melhora realista em 8-16 semanas.
              </p>
              <p>
                <strong className="text-ink">Cardio Zona 2:</strong> 2-3x/semana, 30-40 min a 60-70% FCmáx, longe dos dias de
                perna.
              </p>
              <p>
                <strong className="text-ink">Autorregulação:</strong> Se 2 sessões seguidas com RIR real muito abaixo do
                previsto, sono ruim ou FC de repouso elevada: corte 1 série de cada exercício naquela semana.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function dataInicioPadrao(): string {
  return toISODate(new Date());
}
