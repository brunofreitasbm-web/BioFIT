"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Camera, PersonStanding, Trash2 } from "lucide-react";
import { EstadoVazio } from "@/components/EstadoVazio";
import { GraficoTempo } from "@/components/GraficoTempo";
import { RelatorioTabs } from "@/components/RelatorioTabs";
import { useDadosAtualizados } from "@/hooks/useDadosAtualizados";
import { cn } from "@/lib/cn";
import { ICON } from "@/lib/icones";
import {
  analisarPostura,
  INFO_MEDIDA,
  MEDIDAS_POR_VISTA,
  ordenarPostura,
  sessoesPorDia,
  type AnalisePostura,
  type Medida,
  type VereditoPostura,
} from "@/lib/postura";
import { toISODate } from "@/lib/program";
import { getTodasPosturas, removerPostura } from "@/lib/storage";
import type { RegistroPostura, VistaPostura } from "@/lib/tipos";

const VEREDITOS: Record<VereditoPostura, { titulo: string; tom: "ok" | "neutro" | "alerta" }> = {
  dados_insuficientes: { titulo: "Dados insuficientes", tom: "neutro" },
  dentro_do_ruido: { titulo: "Dentro do ruído", tom: "neutro" },
  cifose_melhorando: { titulo: "Cifose melhorando", tom: "ok" },
  cifose_piorando: { titulo: "Atenção: cifose piorando", tom: "alerta" },
  misto: { titulo: "Sinais mistos", tom: "neutro" },
};

const DIRECAO = { melhorou: "melhorou", piorou: "piorou", dentro_do_ruido: "ruído", dados_insuficientes: "—" } as const;

const fmt = (n: number | null | undefined, casas = 1) =>
  n == null ? "—" : n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
const sinal = (n: number | null | undefined) => (n == null ? "—" : `${n > 0 ? "+" : ""}${fmt(n)}`);
const dataBR = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

export default function PosturaPage() {
  const versaoDados = useDadosAtualizados();
  const [regs, setRegs] = useState<RegistroPostura[] | null>(null);
  const [analise, setAnalise] = useState<AnalisePostura | null>(null);
  const [medida, setMedida] = useState<Medida>("anguloCifose");

  const recarregar = useCallback(() => {
    const todas = ordenarPostura(getTodasPosturas());
    setRegs(todas);
    setAnalise(todas.length ? analisarPostura(todas, { hoje: toISODate(new Date()) }) : null);
  }, []);
  useEffect(recarregar, [recarregar, versaoDados]);

  const vista: VistaPostura = MEDIDAS_POR_VISTA.perfil.includes(medida) ? "perfil" : "frontal";
  const sessoes = useMemo(() => (regs ? sessoesPorDia(regs, vista) : []), [regs, vista]);
  const pontos = useMemo(
    () => sessoes.flatMap((s) => (s.medidas[medida] == null ? [] : [{ data: s.data, valor: s.medidas[medida] as number }])),
    [sessoes, medida],
  );
  const tendencia = analise?.tendencias.find((t) => t.medida === medida);

  function remover(r: RegistroPostura) {
    if (!window.confirm(`Apagar a captura de ${dataBR(r.data)} ${r.quando.slice(11, 16)}?`)) return;
    removerPostura(r.chave);
    recarregar();
  }

  return (
    <div className="space-y-6 p-4">
      <header className="mb-2 space-y-2">
        <h1 className="text-xl font-semibold text-ink">Postura</h1>
        <p className="text-sm text-ink-muted">Cifose, cabeça e alinhamento medidos por foto, sessão a sessão</p>
        <RelatorioTabs ativa="/relatorio/postura" />
      </header>

      <Link
        href="/relatorio/postura/nova"
        className="toque flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brand text-sm font-semibold text-on-solid shadow-sm"
      >
        <Camera size={ICON.md} aria-hidden="true" /> Nova avaliação
      </Link>

      {regs !== null && regs.length === 0 && (
        <section className="rounded-xl border vidro p-4 shadow-sm">
          <EstadoVazio
            Icone={PersonStanding}
            texto="Nenhuma avaliação ainda. Tire a primeira foto de perfil para ter a linha de base da cifose."
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
            <p className="text-xs text-ink-faint">
              Medida de foto, não diagnóstico. Uma diferença de 2–3° entre sessões é ruído de protocolo; o que conta é a tendência.
            </p>
          </section>

          <section className="space-y-3 rounded-xl border vidro p-4 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {([...MEDIDAS_POR_VISTA.perfil, ...MEDIDAS_POR_VISTA.frontal] as Medida[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMedida(m)}
                  aria-pressed={medida === m}
                  className={cn(
                    "min-h-11 rounded-full border px-3.5 text-xs font-medium transition-colors",
                    medida === m ? "border-brand bg-brand text-on-solid shadow-sm" : "border-line bg-base-800 text-ink-muted hover:text-ink",
                  )}
                >
                  {INFO_MEDIDA[m].curto}
                  <span className="ml-1 text-[11px] opacity-70">{MEDIDAS_POR_VISTA.perfil.includes(m) ? "perfil" : "frontal"}</span>
                </button>
              ))}
            </div>
            <div className="flex items-baseline justify-between">
              <h2 className="text-base font-semibold text-ink">{INFO_MEDIDA[medida].rotulo}</h2>
              <span className="text-xs tabular-nums text-ink-muted">
                {fmt(tendencia?.atual)}
                {INFO_MEDIDA[medida].unidade}
                {tendencia?.porMes != null && ` · ${sinal(tendencia.porMes)}${INFO_MEDIDA[medida].unidade}/mês · ${DIRECAO[tendencia.direcao]}`}
              </span>
            </div>
            {pontos.length > 0 ? (
              <GraficoTempo pontos={pontos} unidade={INFO_MEDIDA[medida].unidade || "índice"} rotulo={INFO_MEDIDA[medida].rotulo} />
            ) : (
              <EstadoVazio Icone={PersonStanding} texto={`Nenhuma captura ${vista === "perfil" ? "de perfil" : "frontal"} ainda.`} />
            )}
            <p className="text-xs text-ink-faint">Cada ponto é a mediana das capturas do dia.</p>
          </section>

          <section className="space-y-3 rounded-xl border vidro p-4 shadow-sm">
            <h2 className="text-base font-semibold text-ink">Capturas</h2>
            <ul className="divide-y divide-line text-sm">
              {[...regs].reverse().map((r) => (
                <li key={r.chave} className="flex min-h-11 items-center gap-2 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="font-medium text-ink">{dataBR(r.data)}</span>
                    <span className="block text-xs text-ink-faint">
                      {r.quando.slice(11, 16)} · {r.vista === "perfil" ? "Perfil" : "Frontal"}
                      {r.confiancaDeteccao == null && " · manual"}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-ink-muted">
                    {r.vista === "perfil"
                      ? `cifose ${fmt(r.medidas.anguloCifose)}° · CVA ${fmt(r.medidas.cva)}°`
                      : `ombros ${fmt(r.medidas.ombros)}° · quadril ${fmt(r.medidas.quadril)}°`}
                  </span>
                  <button
                    type="button"
                    onClick={() => remover(r)}
                    className="toque flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-faint hover:text-danger"
                    aria-label={`Apagar captura de ${dataBR(r.data)} ${r.quando.slice(11, 16)}`}
                  >
                    <Trash2 size={ICON.sm} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
