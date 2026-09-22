"use client";

import { useEffect, useState } from "react";
import { todosRegistrosBioimpedancia, gerarInsightsBasicos, formatarDataBR } from "@/lib/bioimpedancia";
import { salvarRegistroBioimpedancia, removerRegistroBioimpedancia, getRegistrosBioimpedanciaSalvos } from "@/lib/storage";
import type { RegistroBioimpedancia } from "@/lib/tipos";
import { GraficoLinha } from "@/components/GraficoLinha";
import { BioimpedanciaForm } from "@/components/BioimpedanciaForm";
import { cn } from "@/lib/cn";
import { CHART_COLORS } from "@/lib/colors";
import { Plus, Trash2 } from "lucide-react";

export default function BioimpedanciaPage() {
  const [pronto, setPronto] = useState(false);
  const [registros, setRegistros] = useState<RegistroBioimpedancia[]>([]);
  const [formAberto, setFormAberto] = useState(false);

  useEffect(() => {
    setRegistros(todosRegistrosBioimpedancia());
    setPronto(true);
  }, []);

  if (!pronto) return null;

  function recarregar() {
    setRegistros(todosRegistrosBioimpedancia());
  }

  function salvar(registro: RegistroBioimpedancia) {
    salvarRegistroBioimpedancia(registro);
    recarregar();
    setFormAberto(false);
  }

  function remover(data: string) {
    removerRegistroBioimpedancia(data);
    recarregar();
  }

  const ultimo = registros[registros.length - 1] ?? null;
  const primeiro = registros[0] ?? null;
  const salvosPeloUsuario = getRegistrosBioimpedanciaSalvos();
  const insights = gerarInsightsBasicos(registros);

  return (
    <div className="p-4">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-ink-faint">Bioimpedância</p>
          <h1 className="text-xl font-semibold">Evolução corporal</h1>
        </div>
        <button
          type="button"
          onClick={() => setFormAberto(true)}
          className="flex min-h-11 items-center gap-1.5 rounded-full bg-brand px-4 text-sm font-semibold text-white"
        >
          <Plus aria-hidden="true" size={16} strokeWidth={2.5} /> Medição
        </button>
      </header>

      {ultimo && primeiro && (
        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-line bg-base-800 p-3 text-center">
            <p className="text-[11px] text-ink-faint">Peso</p>
            <p className="text-lg font-semibold text-ink">{ultimo.pesoKg}kg</p>
          </div>
          <div className="rounded-xl border border-line bg-base-800 p-3 text-center">
            <p className="text-[11px] text-ink-faint">Gordura</p>
            <p className="text-lg font-semibold text-ink">{ultimo.percentualGordura}%</p>
          </div>
          <div className="rounded-xl border border-line bg-base-800 p-3 text-center">
            <p className="text-[11px] text-ink-faint">Massa magra</p>
            <p className="text-lg font-semibold text-ink">{ultimo.massaLivreGorduraKg}kg</p>
          </div>
        </div>
      )}

      {registros.length === 0 && (
        <p className="rounded-xl border border-line bg-base-800 p-6 text-center text-sm text-ink-muted">
          Nenhuma medição registrada ainda. Toque em &ldquo;Medição&rdquo; para adicionar a primeira.
        </p>
      )}

      {registros.length > 0 && (
        <div className="mb-4 space-y-3">
          <GraficoLinha titulo="Peso (kg)" pontos={registros.map((r) => ({ data: r.data, valor: r.pesoKg }))} unidade="kg" />
          <GraficoLinha
            titulo="% de gordura"
            pontos={registros.map((r) => ({ data: r.data, valor: r.percentualGordura }))}
            unidade="%"
            cor={CHART_COLORS.danger}
            corPositivaQuandoCai
          />
          <GraficoLinha
            titulo="Massa livre de gordura (kg)"
            pontos={registros.map((r) => ({ data: r.data, valor: r.massaLivreGorduraKg }))}
            unidade="kg"
            cor={CHART_COLORS.accent}
          />
          <GraficoLinha
            titulo="Água corporal (L)"
            pontos={registros.map((r) => ({ data: r.data, valor: r.aguaCorporalL }))}
            unidade="L"
            cor={CHART_COLORS.info}
          />
        </div>
      )}

      {insights.length > 0 && (
        <section className="mb-4 space-y-2">
          <h2 className="text-sm font-medium text-ink-muted">Insights</h2>
          {insights.map((ins, i) => (
            <div
              key={i}
              className={cn(
                "rounded-xl border p-3",
                ins.positivo ? "border-accent/30 bg-accent-soft" : "border-danger/30 bg-danger-soft",
              )}
            >
              <p className={cn("text-sm font-semibold", ins.positivo ? "text-accent" : "text-danger")}>{ins.titulo}</p>
              <p className="mt-0.5 text-xs text-ink-muted">{ins.mensagem}</p>
            </div>
          ))}
        </section>
      )}

      {registros.length > 0 && (
        <section className="mb-4">
          <h2 className="mb-2 text-sm font-medium text-ink-muted">Histórico ({registros.length})</h2>
          <div className="space-y-1.5">
            {[...registros].reverse().map((r) => (
              <div
                key={r.data}
                className="flex items-center justify-between rounded-lg border border-line bg-base-800 px-3 py-2 text-xs"
              >
                <span className="text-ink-muted">{formatarDataBR(r.data)}</span>
                <span className="text-ink">
                  {r.pesoKg}kg · {r.percentualGordura}% gordura · {r.massaLivreGorduraKg}kg magra
                </span>
                {salvosPeloUsuario[r.data] && (
                  <button
                    type="button"
                    onClick={() => remover(r.data)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center text-danger"
                    aria-label="Remover medição"
                  >
                    <Trash2 aria-hidden="true" size={17} strokeWidth={1.75} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {formAberto && <BioimpedanciaForm ultimoRegistro={ultimo} onSalvar={salvar} onFechar={() => setFormAberto(false)} />}
    </div>
  );
}
