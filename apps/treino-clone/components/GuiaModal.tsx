"use client";

import { useState } from "react";
import { useBackLayers } from "@/hooks/useBackHandler";
import { Info, Save, X } from "lucide-react";
import { ICON } from "@/lib/icones";
import { erroMedioCalibracao, getDataInicio, setDataInicio } from "@/lib/storage";

export function GuiaModal({ dataInicio, onDataInicioChange }: { dataInicio: string; onDataInicioChange: (iso: string) => void }) {
  const [aberto, setAberto] = useState(false);
  const [inputData, setInputData] = useState(dataInicio);
  const [calibracao, setCalibracao] = useState<ReturnType<typeof erroMedioCalibracao>>({ amostras: 0, erroMedio: null });

  // Botão/gesto voltar do celular fecha o modal (ver hooks/useBackHandler).
  useBackLayers([{ active: aberto, back: () => setAberto(false) }]);

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
        <Info aria-hidden="true" size={ICON.md} />
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
                <X aria-hidden="true" size={ICON.md} />
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
                <button
                  type="button"
                  onClick={salvar}
                  className="toque flex min-h-11 items-center gap-1.5 rounded-lg bg-brand px-3 text-sm font-medium text-on-solid"
                >
                  <Save aria-hidden="true" size={ICON.sm} /> Salvar
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
                <strong className="text-ink">Sequência de treinos:</strong> A → B → C → D → E → volta ao A. Não existe &ldquo;treino de
                quarta&rdquo;. Faltou um dia? Faça o PRÓXIMO da fila — nenhum grupo é pulado por causa de agenda.
              </p>
              <p>
                <strong className="text-ink">Rodada e mesociclo:</strong> 1 rodada = A+B+C+D+E. Rodadas 1–4 = treino, rodada 5 = deload
                (metade das séries, mesmas reps, carga −10%). Depois troca TODOS os exercícios. A rotação é por treinos feitos, não por
                calendário: semana fraca alonga o ciclo, nada se perde.
              </p>
              <p>
                <strong className="text-ink">Progressão (dupla):</strong> trabalhe dentro da faixa de reps. Quando TODAS as séries baterem
                o topo da faixa, suba a carga no próximo treino. Voltou para o fundo da faixa? Normal: suba as reps de novo.
              </p>
              <p>
                <strong className="text-ink">Registro de carga:</strong> a carga total, como a máquina mostra, sempre na MESMA máquina.
              </p>
              <p>
                <strong className="text-ink">Sequência de dias e XP:</strong> veja a aba Conquistas. Dia sem musculação? Registre um dia
                leve e a sequência segue.
              </p>
              <p>
                <strong className="text-ink">Seus dados:</strong> ficam só neste celular. Faça o backup (Relatório → Backup) de vez em
                quando — se limpar os dados do navegador, sem backup o histórico some.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
