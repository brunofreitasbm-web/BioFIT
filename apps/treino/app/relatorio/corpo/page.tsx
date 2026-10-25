"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Scale } from "lucide-react";
import { EstadoVazio } from "@/components/EstadoVazio";
import { GraficoTempo } from "@/components/GraficoTempo";
import { RelatorioTabs } from "@/components/RelatorioTabs";
import { useDadosAtualizados } from "@/hooks/useDadosAtualizados";
import { analisarCorpo, ordenarCorpo, periodoDoDia, resumoSegmentos, type AnaliseCorpo, type Veredito } from "@/lib/corpo";
import { toISODate } from "@/lib/program";
import { getLog, getTodosCorpo } from "@/lib/storage";
import { cn } from "@/lib/cn";
import { ICON } from "@/lib/icones";
import type { RegistroCorpo } from "@/lib/tipos";

const VEREDITOS: Record<Veredito, { titulo: string; tom: "ok" | "neutro" | "alerta" }> = {
  dados_insuficientes: { titulo: "Dados insuficientes", tom: "neutro" },
  inconclusivo: { titulo: "Inconclusivo", tom: "neutro" },
  dentro_do_ruido: { titulo: "Dentro do ruído", tom: "neutro" },
  recomposicao_em_curso: { titulo: "Recomposição em curso", tom: "ok" },
  ganho_de_massa: { titulo: "Ganho de massa", tom: "ok" },
  ganho_sem_retorno: { titulo: "Ganho sem retorno", tom: "alerta" },
  alerta_perda_de_massa: { titulo: "Atenção: perda de massa", tom: "alerta" },
};

type Campo = "pesoKg" | "gorduraPct" | "massaLivreKg" | "musculoEsqueleticoKg";
const METRICAS: { campo: Campo; rotulo: string; curto: string; unidade: string }[] = [
  { campo: "pesoKg", rotulo: "Peso", curto: "Peso", unidade: "kg" },
  { campo: "gorduraPct", rotulo: "Gordura", curto: "Gordura", unidade: "%" },
  { campo: "massaLivreKg", rotulo: "Massa livre de gordura", curto: "Massa magra", unidade: "kg" },
  { campo: "musculoEsqueleticoKg", rotulo: "Músculo esquelético", curto: "Músculo", unidade: "kg" },
];

const PERIODO_ROTULO = { manha: "manhã", tarde: "tarde", noite: "noite" } as const;

const fmt = (n: number | null | undefined, casas = 1) =>
  n == null ? "—" : n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
const sinal = (n: number | undefined) => (n === undefined ? "—" : `${n > 0 ? "+" : ""}${fmt(n)}`);
const dataBR = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

export default function CorpoPage() {
  const versaoDados = useDadosAtualizados();
  const [regs, setRegs] = useState<RegistroCorpo[] | null>(null);
  const [analise, setAnalise] = useState<AnaliseCorpo | null>(null);
  const [campo, setCampo] = useState<Campo>("pesoKg");

  useEffect(() => {
    const todas = ordenarCorpo(getTodosCorpo());
    setRegs(todas);
    setAnalise(todas.length ? analisarCorpo(todas, { hoje: toISODate(new Date()), log: getLog() }) : null);
  }, [versaoDados]);

  const metrica = METRICAS.find((m) => m.campo === campo)!;
  const pontos = useMemo(
    () => (regs ?? []).flatMap((r) => (r[campo] == null ? [] : [{ data: r.data, valor: r[campo] as number }])),
    [regs, campo],
  );
  const naJanela = useMemo(
    () => (regs && analise?.periodo ? regs.filter((r) => r.data >= analise.periodo!.inicio && r.data <= analise.periodo!.fim) : []),
    [regs, analise],
  );
  const segmentos = useMemo(() => resumoSegmentos(naJanela), [naJanela]);

  return (
    <div className="space-y-6 p-4">
      <header className="mb-2 space-y-2">
        <h1 className="text-xl font-semibold text-ink">Composição Corporal</h1>
        <p className="text-sm text-ink-muted">Bioimpedância importada dos relatórios da Avanutri</p>
        <RelatorioTabs ativa="/relatorio/corpo" />
      </header>

      {regs !== null && regs.length === 0 && (
        <section className="rounded-xl border vidro p-4 shadow-sm">
          <EstadoVazio
            Icone={Scale}
            texto="Nenhuma bioimpedância importada. Peça ao Claude: “importa minha última bioimpedância”. Aqui aparece depois do próximo sync."
          />
        </section>
      )}

      {regs && regs.length > 0 && analise && (
        <>
          <section className="space-y-2 rounded-xl border vidro p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2
                className={cn(
                  "text-base font-semibold",
                  VEREDITOS[analise.veredito].tom === "ok" && "text-accent",
                  VEREDITOS[analise.veredito].tom === "alerta" && "text-danger",
                  VEREDITOS[analise.veredito].tom === "neutro" && "text-ink",
                )}
              >
                {VEREDITOS[analise.veredito].titulo}
              </h2>
              <span className="shrink-0 text-xs text-ink-faint">confiança {analise.confianca}</span>
            </div>
            <p className="text-sm text-ink-muted">{analise.explicacao}</p>
            {analise.avisos.map((a) => (
              <p key={a} className="flex items-start gap-2 text-xs text-ink-muted">
                <AlertTriangle aria-hidden="true" size={ICON.sm} className="mt-0.5 shrink-0 text-danger" />
                <span>{a}</span>
              </p>
            ))}
            <p className="text-[11px] text-ink-faint">
              A bioimpedância oscila com hidratação e hora do dia: olhe a tendência de várias medições, não uma só.
            </p>
          </section>

          <section className="space-y-3 rounded-xl border vidro p-4 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {METRICAS.map((m) => (
                <button
                  key={m.campo}
                  type="button"
                  onClick={() => setCampo(m.campo)}
                  aria-pressed={campo === m.campo}
                  className={cn(
                    "min-h-11 rounded-full border px-3.5 text-xs font-medium transition-colors",
                    campo === m.campo ? "border-brand bg-brand text-on-solid shadow-sm" : "border-line bg-base-800 text-ink-muted hover:text-ink",
                  )}
                >
                  {m.curto}
                </button>
              ))}
            </div>
            <div className="flex items-baseline justify-between">
              <h2 className="text-base font-semibold text-ink">{metrica.rotulo}</h2>
              <span className="text-xs tabular-nums text-ink-muted">
                {fmt(pontos[pontos.length - 1]?.valor)} {metrica.unidade}
                {analise.porMes[campo] !== undefined && ` · ${sinal(analise.porMes[campo])} ${metrica.unidade}/mês`}
              </span>
            </div>
            {pontos.length > 0 ? (
              <GraficoTempo pontos={pontos} unidade={metrica.unidade} rotulo={metrica.rotulo} />
            ) : (
              <EstadoVazio Icone={Scale} texto="Esta medida não veio nos relatórios importados." />
            )}
          </section>

          {segmentos && (
            <section className="space-y-3 rounded-xl border vidro p-4 shadow-sm">
              <h2 className="text-base font-semibold text-ink">Massa magra por segmento</h2>
              <ul className="divide-y divide-line text-sm">
                {segmentos.map((s) => (
                  <li key={s.segmento} className="flex min-h-11 items-center gap-2 py-2">
                    <span className="min-w-0 flex-1 truncate font-medium text-ink">{s.nome}</span>
                    <span className="shrink-0 text-xs tabular-nums text-ink-muted">{fmt(s.massaMagraKg, 2)} kg</span>
                    <span
                      className={cn(
                        "w-14 shrink-0 text-right text-xs font-bold tabular-nums",
                        (s.variacaoMassaMagraKg ?? 0) > 0 ? "text-accent" : (s.variacaoMassaMagraKg ?? 0) < 0 ? "text-danger" : "text-ink-faint",
                      )}
                    >
                      {s.variacaoMassaMagraKg == null ? "—" : sinal(s.variacaoMassaMagraKg)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-ink-faint">Variação desde a primeira medição da janela analisada.</p>
            </section>
          )}

          <section className="space-y-3 rounded-xl border vidro p-4 shadow-sm">
            <h2 className="text-base font-semibold text-ink">Medições</h2>
            <ul className="divide-y divide-line text-sm">
              {[...regs].reverse().map((r) => (
                <li key={r.chave} className="flex min-h-11 items-center gap-2 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="font-medium text-ink">{dataBR(r.data)}</span>
                    <span className="ml-2 text-xs text-ink-faint">
                      {r.quando.slice(11, 16)} · {PERIODO_ROTULO[periodoDoDia(r.quando)]}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-ink-muted">
                    {fmt(r.pesoKg)} kg · {fmt(r.gorduraPct)}%
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
