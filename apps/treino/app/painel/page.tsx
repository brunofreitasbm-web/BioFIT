"use client";

import { useEffect, useMemo, useState } from "react";
import { AbaCarga } from "@/components/painel/AbaCarga";
import { AbaCorpo } from "@/components/painel/AbaCorpo";
import { AbaCruzamentos } from "@/components/painel/AbaCruzamentos";
import { AbaHoje } from "@/components/painel/AbaHoje";
import { AbaRecuperacao } from "@/components/painel/AbaRecuperacao";
import { AbaRoadmap } from "@/components/painel/AbaRoadmap";
import { cn } from "@/lib/cn";
import { somarDiasIso } from "@/lib/painel/estatistica";
import { cruzarIntervalos, type MedicaoCorpo } from "@/lib/painel/intervalos";
import { montarDadosPainel } from "@/lib/painel/dados";
import type { DiaForca, PainelGarmin } from "@/lib/painel/tipos";

const ABAS = ["Hoje", "Recuperação", "Carga", "Cruzamentos", "Corpo", "Roadmap"] as const;
type Aba = (typeof ABAS)[number];
const PERIODOS = [
  { rotulo: "30 dias", dias: 30 },
  { rotulo: "60 dias", dias: 60 },
  { rotulo: "90 dias", dias: 90 },
  { rotulo: "Tudo", dias: 400 },
];

interface Carregado {
  garmin: PainelGarmin;
  forca: DiaForca[];
  corpo: MedicaoCorpo[];
  avisos: string[];
}
type Estado = { tipo: "carregando" } | { tipo: "vazio"; msg: string } | { tipo: "erro" } | { tipo: "ok"; dados: Carregado };

export default function Painel() {
  const [estado, setEstado] = useState<Estado>({ tipo: "carregando" });
  const [aba, setAba] = useState<Aba>("Hoje");
  const [periodo, setPeriodo] = useState(90);

  useEffect(() => {
    fetch("/api/painel/dados")
      .then((r) => r.json())
      .then((j) => {
        if (j?.disponivel) setEstado({ tipo: "ok", dados: { garmin: j.garmin, forca: j.forca ?? [], corpo: j.corpo ?? [], avisos: j.avisos ?? [] } });
        else setEstado({ tipo: "vazio", msg: j?.motivo ?? "Sem dados." });
      })
      .catch(() => setEstado({ tipo: "erro" }));
  }, []);

  const carregado = estado.tipo === "ok" ? estado.dados : null;
  const dados = useMemo(() => (carregado ? montarDadosPainel(carregado.garmin, carregado.forca) : null), [carregado]);
  const intervalos = useMemo(() => (carregado && dados ? cruzarIntervalos(carregado.corpo, carregado.forca, dados.painel.dias) : []), [carregado, dados]);

  // O período só afeta séries longas; prontidão e carga sempre usam o histórico todo.
  const diasVisiveis = useMemo(() => {
    if (!dados) return [];
    const corte = somarDiasIso(dados.hoje, -(periodo - 1));
    return dados.painel.dias.filter((d) => d.data >= corte);
  }, [dados, periodo]);

  return (
    // Tela própria: cobre a moldura do app de treino (navegação, largura de celular). Não altera o app.
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-base-900 text-ink">
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">Painel geral</h1>
          <p className="text-sm text-ink-muted">
            Treino, recuperação e corpo no mesmo lugar.
            {dados && ` Garmin de ${dados.painel.dias[0].data} a ${dados.hoje} (${dados.painel.dias.length} dias).`}
          </p>
        </div>
        {aba === "Recuperação" && (
          <div className="flex gap-1 rounded-full border border-line bg-base-800 p-1 text-xs font-medium" role="group" aria-label="Período">
            {PERIODOS.map((p) => (
              <button
                key={p.dias}
                type="button"
                onClick={() => setPeriodo(p.dias)}
                aria-pressed={periodo === p.dias}
                className={cn("rounded-full px-3 py-1.5", periodo === p.dias ? "bg-brand text-on-solid" : "text-ink-muted hover:text-ink")}
              >
                {p.rotulo}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="mb-5 flex gap-1 overflow-x-auto rounded-full border border-line bg-base-800 p-1 text-sm font-medium" role="tablist" aria-label="Seções do painel">
        {ABAS.map((a) => (
          <button
            key={a}
            type="button"
            role="tab"
            aria-selected={aba === a}
            onClick={() => setAba(a)}
            className={cn("flex-1 whitespace-nowrap rounded-full px-4 py-2", aba === a ? "bg-brand text-on-solid shadow-sm" : "text-ink-muted hover:text-ink")}
          >
            {a}
          </button>
        ))}
      </div>

      {carregado?.avisos.map((a) => (
        <p key={a} className="mb-4 rounded-lg border border-brand/40 bg-brand-soft p-3 text-xs text-ink-muted">
          {a}
        </p>
      ))}

      {estado.tipo === "carregando" && <p className="py-16 text-center text-ink-muted">Carregando…</p>}
      {estado.tipo === "erro" && <p className="py-16 text-center text-danger">Não consegui carregar os dados. Tente de novo em instantes.</p>}
      {estado.tipo === "vazio" && (
        <div className="space-y-4">
          <p className="py-8 text-center text-ink-muted">{estado.msg}</p>
          {aba === "Roadmap" && <AbaRoadmap />}
        </div>
      )}

      {dados && carregado && (
        <div role="tabpanel">
          {aba === "Hoje" && <AbaHoje d={dados} />}
          {aba === "Recuperação" && <AbaRecuperacao dias={diasVisiveis} />}
          {aba === "Carga" && <AbaCarga d={dados} />}
          {aba === "Cruzamentos" && <AbaCruzamentos d={dados} />}
          {aba === "Corpo" && <AbaCorpo corpo={carregado.corpo} intervalos={intervalos} />}
          {aba === "Roadmap" && <AbaRoadmap />}
        </div>
      )}
    </div>
    </div>
  );
}
