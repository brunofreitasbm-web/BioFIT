import { Gauge } from "@/components/painel/graficos/Gauge";
import { CurvaIntraday } from "@/components/painel/graficos/CurvaIntraday";
import { divergenciaComGarmin } from "@/lib/painel/prontidao";
import type { DadosPainel } from "@/lib/painel/dados";
import { Cartao, Metrica } from "./Cartao";

const REC: Record<string, string> = {
  pesado: "Pode treinar pesado",
  moderado: "Treino normal recomendado",
  leve: "Treino leve recomendado",
  recuperar: "Priorize descanso hoje",
};
const NIVEL_GARMIN: Record<string, string> = {
  LOW: "baixa",
  MODERATE: "moderada",
  HIGH: "alta",
  PRIME: "máxima",
  POOR: "baixa",
  FAIR: "razoável",
  GOOD: "boa",
};

const ROTULO_COMPONENTE: Record<string, string> = {
  hrv: "Recuperação do coração (VFC)",
  fcRepouso: "Batimentos em repouso",
  sono: "Sono reparador",
  bodyBattery: "Energia ao acordar (Body Battery)",
  carga: "Cansaço dos últimos 3 dias",
};

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
      <Cartao titulo="Prontidão para Treinar" sub={`Avaliação para ${dia.data} (escala 0 a 100)`}>
        <Gauge valor={p.score} rotulo="de 100" sub={p.recomendacao ? `${REC[p.recomendacao]}: ${p.texto}` : p.texto} />
        <p className="mt-2 text-center text-xs text-ink-faint">
          Base pessoal calculada com {p.diasDeBase} dias de dados (confiança {p.confianca}).
        </p>
        <ul className="mt-3 space-y-1.5">
          {p.componentes.map((c) => (
            <li key={c.chave} className="text-xs">
              <div className="flex justify-between text-ink-muted">
                <span>
                  {ROTULO_COMPONENTE[c.chave] ?? c.rotulo} <span className="text-ink-faint">({Math.round(c.peso * 100)}%)</span>
                </span>
                <span className="text-ink font-medium">{c.nota}/100</span>
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
        <Cartao titulo="Como você acordou hoje" sub="Sinais vitais do último dia sincronizado">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <Metrica rotulo="Tempo de sono" valor={h(dia.sonoMin)} sub={dia.sonoScore !== null ? `Nota sono: ${dia.sonoScore}/100` : undefined} />
            <Metrica rotulo="Recuperação (VFC)" valor={n(dia.hrvMs, " ms")} sub={dia.hrvMediaSemanal !== null ? `Média semanal: ${dia.hrvMediaSemanal}` : "Ritmo cardíaco"} />
            <Metrica rotulo="Batimentos repouso" valor={n(dia.fcRepouso, " bpm")} sub="ao acordar" />
            <Metrica rotulo="Bateria de energia" valor={n(dia.bodyBatteryAcordar)} sub={dia.bodyBatteryMax !== null ? `Pico do dia: ${dia.bodyBatteryMax}` : "Body Battery"} />
            <Metrica rotulo="Nível de estresse" valor={n(dia.estresse)} sub="Média do dia (0 a 100)" />
            <Metrica rotulo="Passos no dia" valor={dia.passos === null ? "—" : dia.passos.toLocaleString("pt-BR")} sub="atividade diária" />
          </div>
        </Cartao>

        <Cartao titulo="Comparativo: BioFIT × Garmin" sub="Duas análises independentes sobre sua prontidão para treinar">
          <div className="grid gap-3 sm:grid-cols-2">
            <Metrica rotulo="Nota do relógio (Garmin)" valor={n(dia.prontidaoGarmin)} sub={dia.prontidaoNivel ? `Nível ${NIVEL_GARMIN[dia.prontidaoNivel] ?? dia.prontidaoNivel.toLowerCase()}` : undefined} />
            <Metrica rotulo="Nota calculada (BioFIT)" valor={n(p.score)} sub={p.recomendacao ? REC[p.recomendacao] : undefined} />
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            {div.mediaDif === null
              ? "Ainda não há dias suficientes com as duas leituras simultâneas para comparar."
              : `Em ${div.n} dias comparados, a nota do BioFIT ficou em média ${Math.abs(div.mediaDif)} pontos ${div.mediaDif >= 0 ? "acima" : "abaixo"} da avaliação do relógio Garmin. Quando houver divergência, vale conferir se o sono ou o cansaço recente tiveram pesos diferentes.`}
          </p>
        </Cartao>

        <Cartao titulo="Bateria de energia ao longo do dia" sub="Como sua energia (Body Battery) variou hora a hora. Faixas coloridas = treinos registrados">
          <CurvaIntraday pontos={curva?.pontos ?? []} rotulo="Bateria corporal" treinos={treinosDoDia} />
        </Cartao>
      </div>
    </div>
  );
}
