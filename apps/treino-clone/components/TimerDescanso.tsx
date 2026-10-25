"use client";

import { useEffect, useRef, useState } from "react";
import { BellRing, Minus, Plus, SkipForward, Timer } from "lucide-react";
import { ICON } from "@/lib/icones";
import {
  ajustarDescanso,
  avisarFimDescanso,
  EVENTO_DESCANSO,
  formatarMMSS,
  getDescansoAtivo,
  pararDescanso,
  restanteSeg,
  type DescansoAtivo,
} from "@/lib/timerDescanso";

// Quanto tempo o aviso "Descanso terminado" fica na tela antes de sumir sozinho.
const AVISO_MS = 8000;

// Barra fixa acima da navegação. Montada uma vez no layout: o descanso continua visível
// mesmo quando o fluxo guiado fecha o card do exercício (que é justamente o que acontece
// depois da última série).
export function TimerDescanso() {
  const [descanso, setDescanso] = useState<DescansoAtivo | null>(null);
  const [agora, setAgora] = useState(0);
  const avisadoRef = useRef<number | null>(null);

  useEffect(() => {
    const sync = () => {
      setDescanso(getDescansoAtivo());
      setAgora(Date.now());
    };
    sync();
    window.addEventListener(EVENTO_DESCANSO, sync);
    window.addEventListener("storage", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.removeEventListener(EVENTO_DESCANSO, sync);
      window.removeEventListener("storage", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  useEffect(() => {
    if (!descanso) return;
    const id = setInterval(() => setAgora(Date.now()), 250);
    return () => clearInterval(id);
  }, [descanso]);

  const restante = descanso ? restanteSeg(descanso.fimEm, agora) : 0;
  const terminou = descanso !== null && agora > 0 && restante === 0;

  useEffect(() => {
    if (!descanso || !terminou) return;
    // Avisa uma vez por descanso — e só se ele terminou há pouco. Ao reabrir o app horas
    // depois, um descanso velho é apenas descartado em silêncio.
    if (avisadoRef.current !== descanso.fimEm) {
      avisadoRef.current = descanso.fimEm;
      if (agora - descanso.fimEm < AVISO_MS) avisarFimDescanso();
    }
    const id = setTimeout(pararDescanso, Math.max(0, descanso.fimEm + AVISO_MS - agora));
    return () => clearTimeout(id);
  }, [descanso, terminou, agora]);

  // Enquanto há descanso na tela, o <main> ganha folga embaixo para a barra não cobrir o
  // último card (ver globals.css).
  useEffect(() => {
    if (descanso) document.body.dataset.descanso = "1";
    else delete document.body.dataset.descanso;
  }, [descanso]);

  if (!descanso || agora === 0) return null;
  if (terminou && agora - descanso.fimEm >= AVISO_MS) return null;

  const pct = descanso.totalSeg > 0 ? Math.min(100, (restante / descanso.totalSeg) * 100) : 0;

  return (
    <div
      role="timer"
      aria-live={terminou ? "assertive" : "off"}
      className="fixed inset-x-0 z-20 mx-auto max-w-xl px-3"
      style={{ bottom: "calc(4.75rem + env(safe-area-inset-bottom))" }}
    >
      <div
        className={
          terminou
            ? "anim-confirmar overflow-hidden rounded-xl border border-accent bg-accent text-on-solid shadow-panel"
            : "overflow-hidden rounded-xl border border-brand/40 bg-base-800 shadow-panel"
        }
      >
        <div className="flex items-center gap-2 px-3 py-2">
          {terminou ? (
            <BellRing aria-hidden="true" size={ICON.md} className="shrink-0" />
          ) : (
            <Timer aria-hidden="true" size={ICON.md} className="shrink-0 text-brand" />
          )}
          <div className="min-w-0 flex-1">
            <p className={terminou ? "text-sm font-bold" : "text-xl font-bold tabular-nums tracking-tight text-ink"}>
              {terminou ? "Descanso terminado — próxima série" : formatarMMSS(restante)}
            </p>
            <p className={terminou ? "truncate text-[11px] opacity-90" : "truncate text-[11px] text-ink-muted"}>
              {descanso.rotulo}
            </p>
          </div>
          {!terminou && (
            <>
              <button
                type="button"
                onClick={() => ajustarDescanso(-15)}
                className="toque flex h-11 w-11 items-center justify-center rounded-full border border-line text-ink-muted hover:text-ink"
                aria-label="Menos 15 segundos"
              >
                <Minus aria-hidden="true" size={ICON.sm} />
              </button>
              <button
                type="button"
                onClick={() => ajustarDescanso(15)}
                className="toque flex h-11 w-11 items-center justify-center rounded-full border border-line text-ink-muted hover:text-ink"
                aria-label="Mais 15 segundos"
              >
                <Plus aria-hidden="true" size={ICON.sm} />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={pararDescanso}
            className={
              terminou
                ? "toque flex min-h-11 items-center gap-1 px-2 text-xs font-semibold"
                : "toque flex min-h-11 items-center gap-1 px-2 text-xs font-semibold text-brand"
            }
          >
            {terminou ? (
              "ok"
            ) : (
              <>
                <SkipForward aria-hidden="true" size={ICON.xs} /> pular
              </>
            )}
          </button>
        </div>
        {!terminou && (
          <div className="h-1 w-full bg-base-600">
            <div className="h-full bg-brand transition-[width] duration-300 ease-linear" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}
