"use client";

import { useState } from "react";
import type { RegistroBioimpedancia } from "@/lib/tipos";
import { ALTURA_M } from "@/lib/bioimpedancia";
import { toISODate } from "@/lib/program";

function num(v: string, fallback: number): number {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

// Campos avançados vêm pré-preenchidos com a última medição (menos digitação — o usuário só
// muda o que de fato mudou). Peso e % de gordura são os únicos realmente obrigatórios.
export function BioimpedanciaForm({
  ultimoRegistro,
  onSalvar,
  onFechar,
}: {
  ultimoRegistro: RegistroBioimpedancia | null;
  onSalvar: (registro: RegistroBioimpedancia) => void;
  onFechar: () => void;
}) {
  const [data, setData] = useState(toISODate(new Date()));
  const [peso, setPeso] = useState(ultimoRegistro ? String(ultimoRegistro.pesoKg) : "");
  const [percentualGordura, setPercentualGordura] = useState(ultimoRegistro ? String(ultimoRegistro.percentualGordura) : "");
  const [aguaCorporal, setAguaCorporal] = useState(ultimoRegistro ? String(ultimoRegistro.aguaCorporalL) : "");
  const [nivelVisceral, setNivelVisceral] = useState(ultimoRegistro ? String(ultimoRegistro.nivelGorduraVisceral) : "");
  const [mostrarAvancado, setMostrarAvancado] = useState(false);
  const [taxaMetabolica, setTaxaMetabolica] = useState(ultimoRegistro ? String(ultimoRegistro.taxaMetabolicaBasalKcal) : "");
  const [indiceApendicular, setIndiceApendicular] = useState(ultimoRegistro ? String(ultimoRegistro.indiceApendicular) : "");
  const [idadeMetabolica, setIdadeMetabolica] = useState(ultimoRegistro ? String(ultimoRegistro.idadeMetabolica) : "");
  const [erro, setErro] = useState<string | null>(null);

  function salvar() {
    const pesoNum = num(peso, 0);
    const pctNum = num(percentualGordura, 0);
    if (pesoNum <= 0 || pctNum <= 0) {
      setErro("Informe peso e % de gordura maiores que zero para salvar.");
      return;
    }
    setErro(null);
    const massaGordura = Math.round(((pesoNum * pctNum) / 100) * 10) / 10;
    const massaLivre = Math.round((pesoNum - massaGordura) * 10) / 10;
    const imc = Math.round((pesoNum / (ALTURA_M * ALTURA_M)) * 10) / 10;

    onSalvar({
      data,
      pesoKg: pesoNum,
      percentualGordura: pctNum,
      massaGorduraKg: massaGordura,
      massaLivreGorduraKg: massaLivre,
      aguaCorporalL: num(aguaCorporal, ultimoRegistro?.aguaCorporalL ?? 0),
      imc,
      taxaMetabolicaBasalKcal: num(taxaMetabolica, ultimoRegistro?.taxaMetabolicaBasalKcal ?? 0),
      indiceApendicular: num(indiceApendicular, ultimoRegistro?.indiceApendicular ?? 0),
      idadeMetabolica: num(idadeMetabolica, ultimoRegistro?.idadeMetabolica ?? 0),
      nivelGorduraVisceral: num(nivelVisceral, ultimoRegistro?.nivelGorduraVisceral ?? 0),
      massaMagraSegmentar: ultimoRegistro?.massaMagraSegmentar ?? {
        bracoDireitoKg: 0,
        bracoEsquerdoKg: 0,
        troncoKg: 0,
        pernaDireitaKg: 0,
        pernaEsquerdaKg: 0,
      },
    });
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/60"
      onClick={onFechar}
      role="dialog"
      aria-modal="true"
      aria-label="Nova medição"
      onKeyDown={(e) => {
        if (e.key === "Escape") onFechar();
      }}
    >
      <div
        className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-t-2xl border-t border-line bg-base-800 p-4 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Nova medição</h2>
          <button
            type="button"
            onClick={onFechar}
            className="flex h-11 w-11 shrink-0 items-center justify-center text-ink-muted"
            aria-label="Fechar"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <div className="space-y-3">
          <label className="block text-xs text-ink-muted">
            Data
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-base-700 px-3 py-2 text-sm text-ink"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-ink-muted">
              Peso (kg)
              <input
                type="number"
                inputMode="decimal"
                min="0"
                max="300"
                step="0.1"
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
                aria-invalid={erro ? true : undefined}
                className="mt-1 w-full rounded-lg border border-line bg-base-700 px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
              />
            </label>
            <label className="block text-xs text-ink-muted">
              % de gordura
              <input
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                step="0.1"
                value={percentualGordura}
                onChange={(e) => setPercentualGordura(e.target.value)}
                aria-invalid={erro ? true : undefined}
                className="mt-1 w-full rounded-lg border border-line bg-base-700 px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-ink-muted">
              Água corporal (L)
              <input
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                step="0.1"
                value={aguaCorporal}
                onChange={(e) => setAguaCorporal(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line bg-base-700 px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
              />
            </label>
            <label className="block text-xs text-ink-muted">
              Gordura visceral (nível)
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max="50"
                step="1"
                value={nivelVisceral}
                onChange={(e) => setNivelVisceral(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line bg-base-700 px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => setMostrarAvancado((v) => !v)}
            aria-expanded={mostrarAvancado}
            className="min-h-11 text-xs font-medium text-brand underline"
          >
            {mostrarAvancado ? "Ocultar" : "Mais detalhes (opcional)"}
          </button>

          {mostrarAvancado && (
            <div className="grid grid-cols-3 gap-3">
              <label className="block text-xs text-ink-muted">
                Taxa metab. basal (kcal)
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="5000"
                  step="1"
                  value={taxaMetabolica}
                  onChange={(e) => setTaxaMetabolica(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-base-700 px-2 py-2 text-sm text-ink focus:border-brand focus:outline-none"
                />
              </label>
              <label className="block text-xs text-ink-muted">
                Índice apendicular
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="50"
                  step="0.1"
                  value={indiceApendicular}
                  onChange={(e) => setIndiceApendicular(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-base-700 px-2 py-2 text-sm text-ink focus:border-brand focus:outline-none"
                />
              </label>
              <label className="block text-xs text-ink-muted">
                Idade metabólica
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="120"
                  step="1"
                  value={idadeMetabolica}
                  onChange={(e) => setIdadeMetabolica(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-base-700 px-2 py-2 text-sm text-ink focus:border-brand focus:outline-none"
                />
              </label>
            </div>
          )}

          <p className="text-[11px] text-ink-faint">
            Massa de gordura, massa livre de gordura e IMC são calculados automaticamente a partir do peso e altura ({ALTURA_M}m).
          </p>

          {erro && (
            <p role="alert" className="text-xs font-medium text-danger">
              {erro}
            </p>
          )}

          <button
            type="button"
            disabled={!peso || num(peso, 0) <= 0 || !percentualGordura || num(percentualGordura, 0) <= 0}
            onClick={salvar}
            className={`min-h-11 w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-all ${
              !peso || num(peso, 0) <= 0 || !percentualGordura || num(percentualGordura, 0) <= 0
                ? "cursor-not-allowed bg-base-600 opacity-50"
                : "bg-brand hover:bg-brand-hover shadow-sm"
            }`}
          >
            Salvar medição
          </button>
        </div>
      </div>
    </div>
  );
}
