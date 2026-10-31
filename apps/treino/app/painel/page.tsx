"use client";

import { useEffect, useMemo, useState } from "react";
import { AbaCarga } from "@/components/painel/AbaCarga";
import { AbaCorpo } from "@/components/painel/AbaCorpo";
import { AbaCruzamentos } from "@/components/painel/AbaCruzamentos";
import { AbaHoje } from "@/components/painel/AbaHoje";
import { AbaRecuperacao } from "@/components/painel/AbaRecuperacao";
import { AbaRoadmap } from "@/components/painel/AbaRoadmap";
import { somarDiasIso } from "@/lib/recuperacao/estatistica";
import { forcaPorDia, montarDadosPainel, type DadosPainel } from "@/lib/recuperacao/painel";
import type { PainelGarmin } from "@/lib/recuperacao/tipos";
import { getLog } from "@/lib/storage";
import { cn } from "@/lib/cn";

const ABAS = ["Hoje", "Recuperação", "Carga", "Cruzamentos", "Corpo", "Roadmap"] as const;
type Aba = (typeof ABAS)[number];
const PERIODOS = [
  { rotulo: "30 dias", dias: 30 },
  { rotulo: "60 dias", dias: 60 },
  { rotulo: "90 dias", dias: 90 },
  { rotulo: "Tudo", dias: 400 },
];

type Estado = { tipo: "carregando" } | { tipo: "vazio"; msg: string } | { tipo: "erro" } | { tipo: "ok"; painel: PainelGarmin };

export default function PainelPage() {
  const [estado, setEstado] = useState<Estado>({ tipo: "carregando" });
  const [aba, setAba] = useState<Aba>("Hoje");
  const [periodo, setPeriodo] = useState(90);
  const [forca, setForca] = useState<ReturnType<typeof forcaPorDia>>([]);

  useEffect(() => {
    setForca(forcaPorDia(getLog()));
    fetch("/api/garmin/painel?dias=400")
      .then((r) => r.json())
      .then((j) => {
        if (j?.disponivel && j.painel?.dias?.length) setEstado({ tipo: "ok", painel: j.painel as PainelGarmin });
        else setEstado({ tipo: "vazio", msg: "Nenhum dado Garmin sincronizado ainda." });
      })
      .catch(() => setEstado({ tipo: "erro" }));
  }, []);

  const dados: DadosPainel | null = useMemo(() => (estado.tipo === "ok" ? montarDadosPainel(estado.painel, forca) : null), [estado, forca]);

  // O período só afeta o que é série longa; os cálculos (prontidão, carga) sempre usam o histórico todo.
  const diasVisiveis = useMemo(() => {
    if (!dados) return [];
    const corte = somarDiasIso(dados.hoje, -(periodo - 1));
    return dados.painel.dias.filter((d) => d.data >= corte);
  }, [dados, periodo]);

  return (
    <div className="px-4 py-5 md:px-8">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">Painel de recuperação</h1>
          <p className="text-sm text-ink-muted">
            Treino, sono e corpo no mesmo lugar.
            {dados && ` Dados Garmin de ${dados.painel.dias[0].data} a ${dados.hoje} (${dados.painel.dias.length} dias).`}
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

      {estado.tipo === "carregando" && <p className="py-16 text-center text-ink-muted">Carregando dados Garmin…</p>}
      {estado.tipo === "erro" && <p className="py-16 text-center text-danger">Não consegui carregar os dados. Tente de novo em instantes.</p>}
      {estado.tipo === "vazio" && (
        <div className="space-y-4">
          <p className="py-8 text-center text-ink-muted">
            {estado.msg} Rode <code className="rounded bg-base-700 px-1">sync-garmin.bat</code> no computador. O roadmap abaixo já mostra o que o painel vai cobrir.
          </p>
          {aba === "Roadmap" && <AbaRoadmap dias={[]} />}
        </div>
      )}

      {dados && (
        <div role="tabpanel">
          {aba === "Hoje" && <AbaHoje d={dados} />}
          {aba === "Recuperação" && <AbaRecuperacao dias={diasVisiveis} />}
          {aba === "Carga" && <AbaCarga d={dados} />}
          {aba === "Cruzamentos" && <AbaCruzamentos d={dados} />}
          {aba === "Corpo" && <AbaCorpo d={dados} />}
          {aba === "Roadmap" && <AbaRoadmap dias={dados.painel.dias} />}
        </div>
      )}
    </div>
  );
}
