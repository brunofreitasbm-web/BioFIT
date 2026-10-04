"use client";

import { useEffect, useState } from "react";
import { Play, Square, CheckCircle2 } from "lucide-react";
import { getSessaoAtiva, iniciarSessao, reabrirSessao, terminarSessao } from "@/lib/storage";
import { SESSAO_NOME } from "@/lib/exercicios";
import type { RegistroSessao, SessaoTreino } from "@/lib/tipos";

function formatarDuracao(ms: number): string {
  const totalSegundos = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSegundos / 3600);
  const m = Math.floor((totalSegundos % 3600) / 60);
  const s = totalSegundos % 60;
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}min`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function TreinoTimer({ hojeISO, sessaoTipo }: { hojeISO: string; sessaoTipo: SessaoTreino }) {
  const nome = `${sessaoTipo} · ${SESSAO_NOME[sessaoTipo]}`;
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
    iniciarSessao(hojeISO, sessaoTipo);
    setRegistro(getSessaoAtiva(hojeISO, sessaoTipo));
    setAgora(Date.now());
  }

  function terminar() {
    if (!window.confirm(`Terminar o treino ${nome} agora? Dá pra reabrir depois se precisar.`)) return;
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
        className="toque mb-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-brand text-center text-base font-bold text-white shadow-panel hover:bg-brand-hover"
      >
        <Play aria-hidden="true" size={17} strokeWidth={2.25} fill="currentColor" />
        Iniciar treino {nome}
      </button>
    );
  }

  if (!registro.fimISO) {
    const decorrido = agora - new Date(registro.inicioISO).getTime();
    return (
      <div className="mb-4 flex items-center gap-2">
        <div className="flex flex-1 items-center justify-between rounded-xl border border-line bg-base-800 px-4 py-3">
          <span className="flex items-center gap-1.5 text-sm text-ink-muted">
            <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-danger" aria-hidden="true" />
            Treino {nome} em andamento
          </span>
          <span className="text-xl font-bold tabular-nums tracking-tight text-ink">{formatarDuracao(decorrido)}</span>
        </div>
        <button
          type="button"
          onClick={terminar}
          className="toque flex min-h-14 shrink-0 items-center gap-1.5 rounded-xl bg-danger px-4 text-sm font-semibold text-white hover:opacity-90"
        >
          <Square aria-hidden="true" size={15} strokeWidth={2.25} fill="currentColor" />
          Terminar
        </button>
      </div>
    );
  }

  const duracaoFinal = new Date(registro.fimISO).getTime() - new Date(registro.inicioISO).getTime();
  return (
    <div className="mb-4 flex items-center justify-between rounded-xl border border-accent/30 bg-accent-soft px-4 py-3">
      <span className="flex items-center gap-1.5 text-sm font-medium text-accent">
        <CheckCircle2 aria-hidden="true" size={17} strokeWidth={2} />
        Treino {nome} concluído · {formatarDuracao(duracaoFinal)}
      </span>
      <button type="button" onClick={reabrir} className="toque min-h-11 px-2 text-xs font-medium text-ink-muted underline">
        reabrir
      </button>
    </div>
  );
}
