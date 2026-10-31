import { Gauge } from "@/components/graficos/Gauge";
import { CurvaIntraday } from "@/components/graficos/CurvaIntraday";
import { divergenciaComGarmin } from "@/lib/recuperacao/prontidao";
import type { DadosPainel } from "@/lib/recuperacao/painel";
import { Cartao, Metrica } from "./Cartao";

const REC: Record<string, string> = { pesado: "Treino pesado", moderado: "Treino normal", leve: "Treino leve", recuperar: "Recuperar" };
const NIVEL_GARMIN: Record<string, string> = { LOW: "baixa", MODERATE: "moderada", HIGH: "alta", PRIME: "máxima", POOR: "ruim", FAIR: "razoável", GOOD: "boa" };

const h = (min: number | null) => (min === null ? "—" : `${Math.floor(min / 60)}h${String(Math.round(min % 60)).padStart(2, "0")}`);
const n = (v: number | null, un = "") => (v === null ? "—" : `${v}${un}`);

export function AbaHoje({ d }: { d: DadosPainel }) {
  const dia = d.painel.dias[d.painel.dias.length - 1];
  const p = d.prontidaoHoje;
  const div = divergenciaComGarmin(d.painel.dias, d.prontidaoSerie);
  const curva = d.painel.intraday.find((c) => c.data === dia.data && c.tipo === "body_battery");
  const treinosDoDia = d.painel.treinos
    .filter((t) => t.data === dia.data)
    .map((t) => {
      const inicio = Date.parse(t.inicioUtc);
      return { inicio, fim: inicio + (t.duracaoMin ?? 30) * 60_000, rotulo: t.tipo.replace(/_/g, " ") };
    });

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Cartao titulo="Prontidão BioFIT" sub={`Referência: ${dia.data}`}>
        <Gauge valor={p.score} rotulo="de 100" sub={p.recomendacao ? `${REC[p.recomendacao]}: ${p.texto}` : p.texto} />
        <p className="mt-2 text-center text-xs text-ink-faint">
          Linha de base com {p.diasDeBase} dias de VFC (confiança {p.confianca}).
        </p>
        <ul className="mt-3 space-y-1.5">
          {p.componentes.map((c) => (
            <li key={c.chave} className="text-xs">
              <div className="flex justify-between text-ink-muted">
                <span>
                  {c.rotulo} <span className="text-ink-faint">({Math.round(c.peso * 100)}%)</span>
                </span>
                <span className="text-ink">{c.nota}</span>
              </div>
              <div className="h-1.5 rounded-full bg-base-600">
                <div className="h-1.5 rounded-full bg-brand" style={{ width: `${c.nota}%` }} />
              </div>
              <div className="text-[11px] text-ink-faint">{c.detalhe}</div>
            </li>
          ))}
        </ul>
      </Cartao>

      <div className="space-y-4 md:col-span-2">
        <Cartao titulo="Esta manhã" sub="Valores do último dia sincronizado">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <Metrica rotulo="Sono" valor={h(dia.sonoMin)} sub={dia.sonoScore !== null ? `score ${dia.sonoScore}` : undefined} />
            <Metrica rotulo="VFC" valor={n(dia.hrvMs, " ms")} sub={dia.hrvMediaSemanal !== null ? `semana ${dia.hrvMediaSemanal}` : undefined} />
            <Metrica rotulo="FC repouso" valor={n(dia.fcRepouso, " bpm")} />
            <Metrica rotulo="Body Battery" valor={n(dia.bodyBatteryAcordar)} sub={dia.bodyBatteryMax !== null ? `máx ${dia.bodyBatteryMax}` : undefined} />
            <Metrica rotulo="Estresse" valor={n(dia.estresse)} />
            <Metrica rotulo="Passos" valor={dia.passos === null ? "—" : dia.passos.toLocaleString("pt-BR")} />
          </div>
        </Cartao>

        <Cartao titulo="BioFIT × Garmin" sub="Duas leituras independentes da mesma manhã">
          <div className="grid gap-3 sm:grid-cols-2">
            <Metrica rotulo="Training Readiness (Garmin)" valor={n(dia.prontidaoGarmin)} sub={dia.prontidaoNivel ? (NIVEL_GARMIN[dia.prontidaoNivel] ?? dia.prontidaoNivel.toLowerCase()) : undefined} />
            <Metrica rotulo="Prontidão BioFIT" valor={n(p.score)} sub={p.recomendacao ?? undefined} />
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            {div.mediaDif === null
              ? "Ainda não há dias suficientes com as duas leituras."
              : `Em ${div.n} dias, o BioFIT ficou em média ${Math.abs(div.mediaDif)} pontos ${div.mediaDif >= 0 ? "acima" : "abaixo"} da Garmin. Quando as duas divergem muito num dia, vale olhar qual componente puxou a diferença.`}
          </p>
        </Cartao>

        <Cartao titulo="Body Battery no dia" sub="Faixas laranja = treinos registrados no relógio">
          <CurvaIntraday pontos={curva?.pontos ?? []} rotulo="Body Battery" treinos={treinosDoDia} />
        </Cartao>
      </div>
    </div>
  );
}
