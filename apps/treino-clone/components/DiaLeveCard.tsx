"use client";

import { useState } from "react";
import { CheckCircle2, Footprints } from "lucide-react";
import { ICON } from "@/lib/icones";
import type { RegistroDiaLeve } from "@/lib/tipos";
import { getDiasLeves, registrarDiaLeve, removerDiaLeve } from "@/lib/storage";

const ATIVIDADES = ["Caminhada", "Mobilidade", "Alongamento", "Bike leve"];

// Dia sem musculação: um toque registra algo leve e mantém a sequência. É a válvula que deixa
// o app pedir "todo dia" sem pedir treino pesado em dias seguidos.
export function DiaLeveCard({ hojeISO, onMudou }: { hojeISO: string; onMudou: () => void }) {
  const [registro, setRegistro] = useState<RegistroDiaLeve | null>(() => getDiasLeves()[hojeISO] ?? null);

  function registrar(atividade: string) {
    registrarDiaLeve(hojeISO, atividade);
    setRegistro(getDiasLeves()[hojeISO] ?? null);
    onMudou();
  }

  function desfazer() {
    removerDiaLeve(hojeISO);
    setRegistro(null);
    onMudou();
  }

  if (registro) {
    return (
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-accent/30 bg-accent-soft p-3">
        <CheckCircle2 aria-hidden="true" size={ICON.md} className="anim-confirmar shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">Dia leve registrado</p>
          <p className="text-xs text-ink-muted">{registro.atividade} · sua sequência está salva hoje.</p>
        </div>
        <button type="button" onClick={desfazer} className="toque min-h-11 px-2 text-xs font-semibold text-ink-muted">
          Desfazer
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-line bg-base-800 p-3 shadow-panel">
      <div className="mb-2 flex items-center gap-2">
        <Footprints aria-hidden="true" size={ICON.md} className="text-brand" />
        <h2 className="text-sm font-semibold text-ink">Mantenha a sequência hoje</h2>
      </div>
      <p className="mb-2 text-xs text-ink-muted">Sem musculação hoje? Mexer o corpo um pouco já conta: caminhada, mobilidade, alongamento.</p>
      <div className="flex flex-wrap gap-2">
        {ATIVIDADES.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => registrar(a)}
            className="toque min-h-11 rounded-full border border-line bg-base-700 px-3 text-xs font-semibold text-ink hover:border-brand"
          >
            {a}
          </button>
        ))}
      </div>
    </div>
  );
}
