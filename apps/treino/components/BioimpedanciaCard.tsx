"use client";

import { useEffect, useState } from "react";
import { Scale, Plus, X, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  delta,
  getMedicoes,
  removerMedicao,
  resumoBioimpedancia,
  salvarMedicao,
  type MedicaoBioimpedancia,
  type ResumoBioimpedancia,
} from "@/lib/bioimpedancia";

type Campo = Exclude<keyof MedicaoBioimpedancia, "data" | "observacoes">;

const CAMPOS: { chave: Campo; label: string; unidade: string; melhorQuando?: "menor" | "maior" }[] = [
  { chave: "pesoKg", label: "Peso", unidade: "kg" },
  { chave: "gorduraPct", label: "Gordura", unidade: "%", melhorQuando: "menor" },
  { chave: "massaMagraKg", label: "Massa magra", unidade: "kg", melhorQuando: "maior" },
  { chave: "massaMuscularEsqueleticaKg", label: "Músc. esquelética", unidade: "kg", melhorQuando: "maior" },
  { chave: "gorduraVisceral", label: "Gord. visceral", unidade: "nível", melhorQuando: "menor" },
  { chave: "aguaCorporalPct", label: "Água corporal", unidade: "%" },
  { chave: "tmbKcal", label: "TMB", unidade: "kcal" },
  { chave: "idadeMetabolica", label: "Idade metabólica", unidade: "anos", melhorQuando: "menor" },
];

function hojeISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dia}`;
}

function num(v: string): number | null {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function BioimpedanciaCard({ onAtualizar }: { onAtualizar?: () => void }) {
  const [resumo, setResumo] = useState<ResumoBioimpedancia | null>(null);
  const [aberto, setAberto] = useState(false);
  const [data, setData] = useState(hojeISO());
  const [valores, setValores] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string | null>(null);

  function recarregar() {
    setResumo(resumoBioimpedancia());
    onAtualizar?.();
  }

  useEffect(() => {
    setResumo(resumoBioimpedancia());
  }, []);

  function salvar() {
    const medicao: MedicaoBioimpedancia = {
      data,
      pesoKg: num(valores.pesoKg ?? ""),
      gorduraPct: num(valores.gorduraPct ?? ""),
      massaMagraKg: num(valores.massaMagraKg ?? ""),
      massaMuscularEsqueleticaKg: num(valores.massaMuscularEsqueleticaKg ?? ""),
      gorduraVisceral: num(valores.gorduraVisceral ?? ""),
      aguaCorporalPct: num(valores.aguaCorporalPct ?? ""),
      tmbKcal: num(valores.tmbKcal ?? ""),
      idadeMetabolica: num(valores.idadeMetabolica ?? ""),
    };
    const algum = CAMPOS.some((c) => medicao[c.chave] != null);
    if (!algum) {
      setErro("Preencha pelo menos um valor.");
      return;
    }
    if (!salvarMedicao(medicao)) {
      setErro("Não foi possível salvar no dispositivo.");
      return;
    }
    setErro(null);
    setValores({});
    setAberto(false);
    recarregar();
  }

  function excluir() {
    if (!resumo) return;
    if (window.confirm(`Apagar a medição de ${resumo.atual.data}?`)) {
      removerMedicao(resumo.atual.data);
      recarregar();
    }
  }

  return (
    <section className="mb-4 rounded-xl border border-line bg-base-800/90 p-3" aria-label="Bioimpedância">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Scale size={15} className="text-brand" />
          <h2 className="font-display text-xs font-bold uppercase tracking-wider text-ink">Bioimpedância</h2>
        </div>
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="flex min-h-9 items-center gap-1 rounded-lg border border-line bg-base-700 px-2.5 text-xs font-semibold text-ink hover:border-brand/50"
        >
          {aberto ? <X size={14} /> : <Plus size={14} />}
          {aberto ? "Fechar" : "Nova medição"}
        </button>
      </div>

      {resumo ? (
        <>
          <p className="mb-2 text-[11px] text-ink-faint">
            Última: {resumo.atual.data}
            {resumo.anterior && resumo.diasEntre != null && ` · variação vs ${resumo.diasEntre} dias antes`}
            {` · ${resumo.total} medição(ões)`}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {CAMPOS.filter((c) => resumo.atual[c.chave] != null).map((c) => {
              const valor = resumo.atual[c.chave] as number;
              const d = resumo.anterior ? delta(valor, resumo.anterior[c.chave] as number | null) : null;
              const bom =
                d == null || d === 0 || !c.melhorQuando
                  ? null
                  : c.melhorQuando === "menor"
                    ? d < 0
                    : d > 0;
              return (
                <div key={c.chave} className="rounded-lg border border-line/60 bg-base-900/60 p-2">
                  <span className="block text-[11px] text-ink-muted">{c.label}</span>
                  <span className="font-display text-base font-bold text-ink">
                    {valor}
                    <span className="ml-0.5 text-[10px] font-normal text-ink-faint">{c.unidade}</span>
                  </span>
                  {d != null && (
                    <span
                      className={cn(
                        "flex items-center gap-0.5 text-[11px] font-medium",
                        bom === null ? "text-ink-faint" : bom ? "text-accent" : "text-danger",
                      )}
                    >
                      {d > 0 ? <TrendingUp size={12} /> : d < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                      {d > 0 ? "+" : ""}
                      {d}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <button type="button" onClick={excluir} className="mt-2 text-[11px] text-ink-faint underline hover:text-danger">
            Apagar última medição
          </button>
        </>
      ) : (
        !aberto && (
          <p className="text-xs text-ink-muted">
            Registre sua bioimpedância para o Coach cruzar composição corporal com seus treinos.
          </p>
        )
      )}

      {aberto && (
        <div className="mt-3 border-t border-line pt-3">
          <label className="mb-2 flex items-center justify-between text-xs text-ink-muted">
            Data da medição
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="rounded-lg border border-line bg-base-700 px-2 py-1.5 text-ink"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            {CAMPOS.map((c) => (
              <label key={c.chave} className="text-[11px] text-ink-muted">
                {c.label} ({c.unidade})
                <input
                  type="text"
                  inputMode="decimal"
                  value={valores[c.chave] ?? ""}
                  onChange={(e) => setValores((v) => ({ ...v, [c.chave]: e.target.value }))}
                  className="mt-0.5 w-full rounded-lg border border-line bg-base-700 px-2 py-2 text-ink"
                />
              </label>
            ))}
          </div>
          {erro && <p role="alert" className="mt-2 text-[11px] text-danger">{erro}</p>}
          <button
            type="button"
            onClick={salvar}
            className="mt-3 min-h-11 w-full rounded-lg bg-brand text-sm font-semibold text-on-solid hover:bg-brand-hover"
          >
            Salvar medição
          </button>
        </div>
      )}
    </section>
  );
}

export { getMedicoes };
