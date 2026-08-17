"use client";

import { useEffect, useState } from "react";
import { getSessaoAtiva, iniciarSessao, reabrirSessao, terminarSessao } from "@/lib/storage";
import type { RegistroSessao, SessaoTreino } from "@/lib/tipos";

function formatarDuracao(ms: number): string {
  const totalSegundos = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSegundos / 3600);
  const m = Math.floor((totalSegundos % 3600) / 60);
  const s = totalSegundos % 60;
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}min`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function TreinoTimer({ hojeISO, sessaoTipo, bloco }: { hojeISO: string; sessaoTipo: SessaoTreino; bloco: number }) {
  const [registro, setRegistro] = useState<RegistroSessao | null>(null);
  const [agora, setAgora] = useState<number>(0);

  useEffect(() => {
    setRegistro(getSessaoAtiva(hojeISO, sessaoTipo));
    setAgora(Date.now());
  }, [hojeISO, sessaoTipo]);

  useEffect(() => {
    if (!registro || registro.fimISO) return;
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [registro]);

  function iniciar() {
    iniciarSessao(hojeISO, sessaoTipo, bloco);
    setRegistro(getSessaoAtiva(hojeISO, sessaoTipo));
    setAgora(Date.now());
  }

  function terminar() {
    if (!window.confirm(`Terminar o treino de ${sessaoTipo} agora? Dá pra reabrir depois se precisar.`)) return;
    terminarSessao(hojeISO, sessaoTipo);
    setRegistro(getSessaoAtiva(hojeISO, sessaoTipo));
  }

  function reabrir() {
    reabrirSessao(hojeISO, sessaoTipo);
    setRegistro(getSessaoAtiva(hojeISO, sessaoTipo));
    setAgora(Date.now());
  }

  if (!registro) {
    return (
      <button
        type="button"
        onClick={iniciar}
        className="mb-4 w-full rounded-xl bg-brand py-3 text-center text-sm font-semibold text-white"
      >
        <span aria-hidden="true">▶</span> Iniciar treino de {sessaoTipo}
      </button>
    );
  }

  if (!registro.fimISO) {
    const decorrido = agora - new Date(registro.inicioISO).getTime();
    return (
      <div className="mb-4 flex items-center gap-2">
        <div className="flex flex-1 items-center justify-between rounded-xl border border-line bg-base-800 px-4 py-3">
          <span className="text-sm text-ink-muted">Treino de {sessaoTipo} em andamento</span>
          <span className="font-mono text-sm font-semibold text-ink">{formatarDuracao(decorrido)}</span>
        </div>
        <button type="button" onClick={terminar} className="shrink-0 rounded-xl bg-danger px-4 py-3 text-sm font-semibold text-white">
          <span aria-hidden="true">■</span> Terminar
        </button>
      </div>
    );
  }

  const duracaoFinal = new Date(registro.fimISO).getTime() - new Date(registro.inicioISO).getTime();
  return (
    <div className="mb-4 flex items-center justify-between rounded-xl border border-accent/30 bg-accent-soft px-4 py-3">
      <span className="text-sm font-medium text-accent">
        <span aria-hidden="true">✓</span> Treino de {sessaoTipo} concluído · {formatarDuracao(duracaoFinal)}
      </span>
      <button type="button" onClick={reabrir} className="min-h-11 px-2 text-xs font-medium text-ink-muted underline">
        reabrir
      </button>
    </div>
  );
}
