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
                <strong className="text-ink">Estrutura:</strong> Push / Pull / Legs 2x por semana (Seg-Sáb, Dom off). A sessão
                de academia é 100% musculação: 6 exercícios; os compostos principais de cada sessão têm 4 séries, os demais 3
                (panturrilha 4). O bloco postural NÃO ocupa tempo de academia — é feito em casa.
              </p>
              <p>
                <strong className="text-ink">Orçamento de tempo real:</strong> PUSH ~54 min · PULL ~57 min · LEGS ~57 min
                (aquecimento 5-6 min + aproximações nos 2 primeiros exercícios 5-8 min + 19-21 séries de trabalho ~35 min +
                trocas de aparelho ~7 min). No limite dos 60 min: se precisar cortar por falta de tempo, corte primeiro o 6º
                exercício, depois a 4ª série do composto do slot 1 — nunca os slots diretos de postura (face pull, Y-raise,
                crucifixo inverso, remadas).
              </p>
              <p>
                <strong className="text-ink">Séries de aproximação:</strong> 1º exercício (composto pesado, 6-9 reps): 2-3
                aproximações subindo até a carga de trabalho (ex.: 50%×8, 70%×5, 85%×2, descanso curto entre elas). 2º
                exercício: 1 aproximação. Do 3º em diante: nenhuma. Não contam no volume.
              </p>
              <p>
                <strong className="text-ink">Rotação:</strong> 4 blocos de 15 dias. A cada bloco TODOS os exercícios mudam,
                mas o padrão de movimento e o grupo muscular se mantêm — isso preserva alguma transferência de carga entre
                blocos.
              </p>
              <p>
                <strong className="text-ink">Progressão:</strong> 4 exposições por exercício dentro do bloco. Exposição 1 =
                RIR 2-3 · Exp. 2 = RIR 2 · Exp. 3 = RIR 1 · Exp. 4 = RIR 0-1 (isoladores podem ir à falha na Exp. 4; compostos
                param em RIR 1). Ao fechar o topo da faixa de reps no RIR alvo em todas as séries, suba 2,5% (superiores) ou
                5% (inferiores) na exposição seguinte. Ao trocar de bloco, comece o exercício novo com carga conservadora
                (RIR 3-4 na 1ª exposição).
              </p>
              <p>
                <strong className="text-ink">Ciclo completo:</strong> Blocos 1→2→3→4 (8 semanas) → semana 9 = deload (metade
                das séries, RIR 4, mesmas cargas do Bloco 4 reduzidas em 10%) → reinicia no Bloco 1 com cargas de referência
                atualizadas.
              </p>
              <p>
                <strong className="text-ink">Execução:</strong> Sem cadência numérica prescrita — subir com intenção de força
                máxima, descer sem largar o peso. Atenção extra em 3 casos: posição alongada (sem impulso na virada, é onde
                está o melhor estímulo e o maior risco), remadas/posterior (1 s de pausa na contração, é trabalho postural
                direto) e bloco postural (controle total, ali o objetivo é controle motor, não hipertrofia).
              </p>
              <p>
                <strong className="text-ink">Papel postural — leitura honesta:</strong> cada exercício carrega um papel
                DIRETO (treina musculatura ligada à cifose: retratores escapulares, trapézio inferior, extensores
                torácicos), INDIRETO (ajuda por mecanismo secundário) ou NEUTRO (não serve à postura — a única exigência é
                não reforçar o padrão errado: tronco ereto, cabeça neutra, ombro sem encolher). PULL concentra a maior parte
                dos exercícios diretos da semana.
              </p>
              <p>
                <strong className="text-ink">Postura (cifose):</strong> Bloco Postural em casa, 7 dias/semana (o exercício 5,
                de força para os extensores torácicos, é 3-4x/semana) + razão puxar:empurrar ~1,5:1 + cues de retração
                escapular e extensão torácica. Melhora realista em 8-12 semanas com adesão — musculação não remodela
                curvatura estrutural.
              </p>
              <p>
                <strong className="text-ink">Lombar:</strong> Terra romeno, stiff, good morning e agachamento livre saíram do
                programa por dor lombar relatada — o slot 2 de perna virou trabalho de posterior/glúteo sem carga axial na
                coluna (flexora, elevação pélvica, extensão de quadril), e o slot 1 do Bloco 1 passou a ser
                goblet/belt squat. Agachamento frontal, hack e Smith seguem sob observação: carga anterior ou guiada reduz o
                braço de momento na lombar, mas não zera a compressão axial.
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
