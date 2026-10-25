"use client";

import { useEffect } from "react";
import { Flame, PartyPopper, Zap } from "lucide-react";
import { useBackLayers } from "@/hooks/useBackHandler";
import { ICON } from "@/lib/icones";
import type { Conquista, Gamificacao } from "@/lib/gamificacao";
import { IconeConquista } from "@/components/IconeConquista";

export interface DadosCelebracao {
  sessaoConcluida: boolean;
  conquistasNovas: Conquista[];
  novoNivel: boolean;
}

// Momento de comemorar: treino concluído, conquista nova ou subida de nível. Curto de
// propósito — uma tela, um botão — porque o objetivo é o "quero mais um desses amanhã".
export function CelebracaoModal({ g, dados, onFechar }: { g: Gamificacao; dados: DadosCelebracao | null; onFechar: () => void }) {
  useBackLayers([{ active: !!dados, back: onFechar }]);
  useEffect(() => {
    if (!dados) return;
    const fechar = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", fechar);
    return () => window.removeEventListener("keydown", fechar);
  }, [dados, onFechar]);

  if (!dados) return null;
  const { semanas, semana, nivel, xp } = g;
  const titulo = dados.novoNivel
    ? `Nível ${nivel.nivel}: ${nivel.titulo}`
    : dados.conquistasNovas.length > 0 && !dados.sessaoConcluida
      ? "Conquista desbloqueada"
      : "Treino concluído";

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={titulo} onClick={onFechar}>
      <div className="anim-revelar w-full max-w-sm rounded-2xl border border-line bg-base-800 p-5 text-center shadow-panel" onClick={(e) => e.stopPropagation()}>
        <span aria-hidden="true" className="anim-pr mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-brand text-on-solid">
          <PartyPopper size={32} />
        </span>
        <h2 className="font-display text-2xl font-extrabold uppercase text-ink">{titulo}</h2>

        {dados.sessaoConcluida && (
          <>
            <p className="mt-1 text-sm text-ink-muted">Você apareceu hoje. É isso que dá resultado.</p>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-base-700 p-2">
                <dt className="flex items-center justify-center gap-1 text-[11px] font-medium text-ink-muted">
                  <Zap aria-hidden="true" size={ICON.xs} /> XP hoje
                </dt>
                <dd className="font-display text-xl font-bold tabular-nums text-ink">+{xp.hoje}</dd>
              </div>
              <div className="rounded-lg bg-base-700 p-2">
                <dt className="flex items-center justify-center gap-1 text-[11px] font-medium text-ink-muted">
                  <Flame aria-hidden="true" size={ICON.xs} /> Seguidas
                </dt>
                <dd className="font-display text-xl font-bold tabular-nums text-ink">{semanas.atual}</dd>
              </div>
              <div className="rounded-lg bg-base-700 p-2">
                <dt className="text-[11px] font-medium text-ink-muted">Semana</dt>
                <dd className="font-display text-xl font-bold tabular-nums text-ink">
                  {semana.feitos}/{semana.meta}
                </dd>
              </div>
            </dl>
          </>
        )}

        {dados.conquistasNovas.length > 0 && (
          <ul className="mt-4 space-y-2 text-left">
            {dados.conquistasNovas.map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-lg border border-brand/30 bg-brand-soft p-2.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-on-solid">
                  <IconeConquista icone={c.icone} size={ICON.md} />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-ink">{c.nome}</span>
                  <span className="block text-xs text-ink-muted">{c.descricao}</span>
                </span>
              </li>
            ))}
          </ul>
        )}

        {dados.sessaoConcluida && <p className="mt-4 text-xs text-ink-muted">{proximoPasso(g)}</p>}

        <button type="button" onClick={onFechar} className="toque mt-4 min-h-12 w-full rounded-xl bg-brand text-base font-bold text-on-solid hover:bg-brand-hover">
          Continuar
        </button>
      </div>
    </div>
  );
}

// O gancho para o próximo treino: dizer exatamente o que está em jogo.
function proximoPasso(g: Gamificacao): string {
  const { semana, semanas, proxima } = g;
  if (semana.batida) return `Meta da semana batida. ${semanas.atual >= 2 ? `${semanas.atual} semanas seguidas na meta.` : "Se mantiver o ritmo, a semana que vem soma uma seguida."}`;
  if (proxima && semana.faltam > 0) return `Faltam ${semana.faltam} treino(s) para fechar a semana. Próxima conquista: ${proxima.nome} (${proxima.atual}/${proxima.alvo}).`;
  return `Faltam ${semana.faltam} treino(s) para fechar a semana.`;
}
