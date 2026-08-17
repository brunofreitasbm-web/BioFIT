"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/cn";
import { getBikeIndoor, saveBikeIndoor, removerBikeIndoor } from "@/lib/storage";

interface BikeIndoorCardProps {
  hojeISO: string;
  onUpdate?: () => void;
}

const PRESETS = [15, 30, 45, 60];

export function BikeIndoorCard({ hojeISO, onUpdate }: BikeIndoorCardProps) {
  const [tempo, setTempo] = useState<string>("30");
  const [concluido, setConcluido] = useState<boolean>(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const reg = getBikeIndoor(hojeISO);
    if (reg) {
      setTempo(reg.tempoMinutos.toString());
      setConcluido(reg.concluido);
    } else {
      setTempo("30");
      setConcluido(false);
    }
  }, [hojeISO]);

  function handleCheckToggle() {
    const numTempo = parseInt(tempo, 10);
    if (isNaN(numTempo) || numTempo <= 0) {
      setErro("Insira um tempo válido em minutos (ex: 30)");
      return;
    }

    // Desmarcar apaga o registro do dia (sem undo) — confirma antes de um toque acidental.
    if (concluido && !window.confirm("Desmarcar remove o registro de cardio de hoje. Continuar?")) {
      return;
    }

    const novoStatus = !concluido;
    const salvou = novoStatus
      ? saveBikeIndoor({
          data: hojeISO,
          tempoMinutos: numTempo,
          concluido: true,
          registradoEm: new Date().toISOString(),
        })
      : removerBikeIndoor(hojeISO);

    if (!salvou) {
      setErro("Não foi possível salvar no dispositivo. Tente novamente.");
      return;
    }
    setErro(null);
    setConcluido(novoStatus);
    if (onUpdate) onUpdate();
  }

  function handlePresetClick(minutos: number) {
    setTempo(minutos.toString());
    setErro(null);
    if (concluido) {
      const salvou = saveBikeIndoor({
        data: hojeISO,
        tempoMinutos: minutos,
        concluido: true,
        registradoEm: new Date().toISOString(),
      });
      if (!salvou) {
        setErro("Não foi possível salvar no dispositivo. Tente novamente.");
        return;
      }
      if (onUpdate) onUpdate();
    }
  }

  function handleTempoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setTempo(val);
    setErro(null);
    const numTempo = parseInt(val, 10);
    if (concluido && !isNaN(numTempo) && numTempo > 0) {
      const salvou = saveBikeIndoor({
        data: hojeISO,
        tempoMinutos: numTempo,
        concluido: true,
        registradoEm: new Date().toISOString(),
      });
      if (!salvou) {
        setErro("Não foi possível salvar no dispositivo. Tente novamente.");
        return;
      }
      if (onUpdate) onUpdate();
    }
  }

  return (
    <div
      className={cn(
        "mb-4 rounded-xl border p-4 shadow-sm transition-all duration-200",
        concluido
          ? "border-accent bg-accent-soft/40 shadow-md"
          : "border-line bg-base-800"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            aria-hidden="true"
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl text-lg font-bold transition-all",
              concluido ? "bg-accent text-white" : "bg-base-700 text-ink-muted"
            )}
          >
            🚴‍♂️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-ink">Bike Indoor</h3>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                  concluido
                    ? "bg-accent/20 text-accent"
                    : "bg-base-600/50 text-ink-faint"
                )}
              >
                {concluido ? "Concluído" : "Cardio"}
              </span>
            </div>
            <p className="text-xs text-ink-muted">
              {concluido
                ? `Sessão de ${tempo} min finalizada!`
                : "Informe a duração e faça o check"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-lg border border-line bg-base-900 px-3 py-1.5">
          <span className="text-xs text-ink-faint" id="bike-duracao-label">Duração:</span>
          <input
            type="number"
            min="1"
            max="300"
            value={tempo}
            onChange={handleTempoChange}
            placeholder="30"
            aria-labelledby="bike-duracao-label"
            aria-describedby="bike-duracao-unidade"
            className="w-12 bg-transparent text-sm font-semibold text-ink text-center outline-none"
          />
          <span className="text-xs font-medium text-ink-muted" id="bike-duracao-unidade">min</span>
        </div>

        <div className="flex items-center gap-1">
          {PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => handlePresetClick(m)}
              aria-pressed={tempo === m.toString()}
              className={cn(
                "min-h-11 rounded-lg border px-2.5 text-xs font-medium transition-colors",
                tempo === m.toString()
                  ? "border-brand bg-brand-soft font-semibold text-brand"
                  : "border-line bg-base-900 text-ink-muted hover:border-brand/40"
              )}
            >
              {m}m
            </button>
          ))}
        </div>
      </div>

      {erro && (
        <p role="alert" className="mt-2 text-xs font-medium text-danger">{erro}</p>
      )}

      <button
        type="button"
        onClick={handleCheckToggle}
        className={cn(
          "mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all active:scale-[0.99]",
          concluido
            ? "bg-accent text-white shadow-sm hover:bg-accent/90"
            : "bg-brand text-white hover:bg-brand-hover shadow-sm"
        )}
      >
        <span className="text-sm" aria-hidden="true">{concluido ? "✓" : "○"}</span>
        <span>
          {concluido ? `Concluído (${tempo} min)` : "Marcar como Concluído"}
        </span>
      </button>
    </div>
  );
}
