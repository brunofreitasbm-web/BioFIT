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
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-base-800 text-ink-muted"
        aria-label="Guia do programa e configurações"
      >
        <span aria-hidden="true">ⓘ</span>
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
                <span aria-hidden="true">✕</span>
              </button>
            </div>

            <section className="mb-4 rounded-xl border border-line bg-base-700 p-3">
              <h3 className="mb-1 text-sm font-medium">Início do programa</h3>
              <p className="mb-2 text-xs text-ink-muted">Define a partir de qual data o app calcula semana e deload.</p>
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
                <strong className="text-ink">Estrutura:</strong> Push / Pull / Legs 2x por semana (Seg-Sáb, Dom off). Fase:
                manutenção/recomposição. A sessão de academia é 100% musculação: 6 exercícios; os compostos principais têm 4
                séries, os demais 3 (panturrilha 4). O bloco postural NÃO ocupa tempo de academia — é feito em casa.
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
                <strong className="text-ink">Banco de exercícios (sem troca automática):</strong> os 24 exercícios que
                existiam nos antigos blocos de 15 dias viraram um banco de opções por posição (slot). O que você treina
                agora é o Programa Atual — você troca um exercício quando decidir (estagnação, dor, falta de equipamento),
                nunca por calendário, e a troca fica registrada no Log de Trocas. Trocar sem necessidade reinicia a
                referência de carga daquele exercício; não troque só por variedade.
              </p>
              <p>
                <strong className="text-ink">Progressão de RIR (contínua):</strong> não existe mais &ldquo;exposição 1 a 4
                dentro do bloco&rdquo; — a progressão acompanha o tempo de uso de CADA exercício. Sessões 1-2 de um exercício novo (ou
                recém-trocado) = RIR 2-3 (aprendizado motor); sessões 3-6 = RIR 2; sessão 7 em diante = RIR 1 (isoladores
                podem ir à falha; compostos param em RIR 1). Ao trocar um exercício, só a progressão DAQUELE exercício
                reinicia — os outros 5 da sessão continuam de onde estavam.
              </p>
              <p>
                <strong className="text-ink">Progressão de carga:</strong> ao fechar o topo da faixa de reps no RIR alvo em
                todas as séries, suba 2,5% (superiores) ou 5% (inferiores) na sessão seguinte — progressão contínua, sem
                limite de sessões e sem reset por calendário. Ao trocar um exercício, comece o novo com carga conservadora
                (RIR 3-4 na 1ª sessão).
              </p>
              <p>
                <strong className="text-ink">Deload:</strong> a cada 8 semanas corridas (contadas a partir do início do
                programa, ou do último deload) — 1 semana de deload: metade das séries, RIR 4, cargas atuais reduzidas em
                10%. Depois do deload as cargas seguem progredindo de onde pararam, e o ciclo de 8 semanas recomeça.
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
                dos exercícios diretos da semana (4 de 6).
              </p>
              <p>
                <strong className="text-ink">Postura (cifose):</strong> Bloco Postural em casa, 7 dias/semana (o exercício 5
                — extensão torácica em prono, o mais importante da aba — é 3-4x/semana, por ser treino de força e precisar
                de recuperação) + razão puxar:empurrar ~1,5:1 + cues de retração escapular e extensão torácica. Melhora
                realista em 8-12 semanas com adesão — musculação não remodela curvatura estrutural.
              </p>
              <p>
                <strong className="text-ink">Lombar:</strong> terra romeno, stiff, good morning e agachamento livre saíram do
                programa por dor lombar relatada — o slot 2 de perna virou trabalho de posterior/glúteo sem carga axial na
                coluna (flexora, elevação pélvica, extensão de quadril), e o slot 1 passou a ser goblet/belt squat.
                Agachamento frontal, hack e Smith seguem sob observação: carga anterior ou guiada reduz o braço de momento na
                lombar, mas não zera a compressão axial.
              </p>
              <p>
                <strong className="text-ink">Cardio Zona 2:</strong> 2-3x/semana, 30-40 min a 60-70% FCmáx, em horário
                separado da musculação, nos dias de PUSH e/ou domingo — longe dos dias de perna.
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
